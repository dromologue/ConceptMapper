# Architecture Principles

> Clean separation between data processing (Rust) and visualization (React), packaged as a macOS App Store application. SwiftUI shell + WKWebView hosts the React/D3 SPA + Rust parser compiled to WASM. Two-stage pipeline for rich prose sources.

## Core Principles

### 1. Rust Backend, React Frontend — Clear Boundary
The Rust backend owns taxonomy parsing, graph data model construction, and any server-side logic. React owns layout (force-directed via D3-force or similar), rendering, interaction, and UI state. The boundary between them is a well-defined JSON graph data structure.

### 2. Data Format as Contract
The intermediate representation (IR) — the JSON graph structure passed from Rust to React — is the central contract. Both sides depend on this schema, not on each other's internals. Changes to the IR require spec updates.

### 3. macOS Native App (SwiftUI + WKWebView + WASM)
The app is a sandboxed macOS application distributed via the App Store. Architecture:
- **SwiftUI shell**: Window management, native menu bar (File > Open/Save/Export), NSOpenPanel/NSSavePanel
- **WKWebView**: Hosts the React SPA loaded from bundled static assets (`file://`)
- **Rust WASM parser**: Compiled via `wasm-pack`, loaded by the React app in-browser
- **Swift ↔ JS bridge**: `WKScriptMessageHandler` (JS→Swift) and `evaluateJavaScript` (Swift→JS)
- **Sandbox entitlements**: `files.user-selected.read-write` only — no network access needed
- The `web/` directory is a build-time dependency producing static assets, not a runtime server

### 4. Stateless Pipeline with Mutation Layer
The processing pipeline is stateless: Taxonomy Markdown → Parse → Graph IR → Render. Each stage is a pure transformation with no hidden state. This makes the pipeline testable, cacheable, and easy to distribute across client/server later.

The GUI introduces a **mutation layer** that sits on top of the pipeline-produced IR. The mutation layer:
- Tracks a delta (ordered list of edit operations) applied to the base IR
- "Revert" clears the delta and restores the pipeline output
- "Export" applies the delta and serializes to markdown or image
- The pipeline itself remains stateless; mutations are a separate concern
- Undo/redo operates on the delta stack, not on the base IR

This means the frontend maintains two conceptual states: the **base IR** (immutable, from pipeline) and the **working IR** (base + applied edits). The working IR is what the renderer displays and what export serializes.

### 5. Module Boundaries
- `src/parser/` — Taxonomy markdown parsing and validation (Rust)
- `src/graph/` — Graph data model, IR generation, and enrichment (Rust)
- `src/wasm.rs` — WASM entry point via `wasm-bindgen` (Rust, compiled to `.wasm`)
- `extractor/` — Workflowy outline → taxonomy conversion (separate tool, likely LLM-assisted)
- `web/` — React app, D3 layout, interaction (TypeScript/React) — builds to static SPA
- `web/src/parser.ts` — WASM loader, exposes `parseMarkdown()` to React
- `macos/` — SwiftUI macOS app (WKWebView shell, file handling, bridge)

### 6. Dual Source of Truth
Two distinct source-of-truth roles exist:

- **Intellectual source of truth**: The concept library (Workflowy-style prose outline). Contains deep analysis, arguments, cross-references, and the full intellectual context of each thinker and concept. This is the authoritative content — human-authored and human-maintained.

- **Structural source of truth**: The Collins taxonomy file (fenced KV blocks with typed fields). Contains the machine-parseable network definition — nodes with metadata, typed edges, generations, and streams. This is what the Rust parser consumes.

The taxonomy is **derived from** the concept library (via the extraction pipeline). When the concept library changes, the taxonomy must be updated to stay in sync. The Graph IR is derived from the taxonomy. The visualization is derived from the IR. The derivation chain is:

```
Concept Library (intellectual) → [Extractor] → Taxonomy (structural) → [Parser] → Graph IR → [Renderer] → Visualization
```

No component should store or mutate the canonical graph structure independently. The concept library is the upstream authority; the taxonomy is the structural checkpoint.

**Export as a write path**: The GUI can export the working IR back to taxonomy markdown (REQ-020). This creates a second write path that bypasses the concept library. To prevent divergence:
- Exported taxonomy files are treated as **forks** — they contain the user's edits but are not automatically synced back to the concept library
- The export includes a metadata comment: `<!-- Exported from concept-mapper, {date}. Edits not synced to source. -->`
- The user is responsible for merging export changes back to the concept library if desired
- The extraction pipeline (REQ-015) can re-run to refresh the taxonomy from the concept library, but this will overwrite manual edits in the taxonomy

### 7. Two-Stage Pipeline: LLM Extraction → Deterministic Parsing
The Rust parser handles ONE well-defined format: the Collins taxonomy (fenced code blocks with KV pairs, markdown tables, typed edges). It does not attempt to interpret prose or infer meaning from unstructured content.

A separate LLM-assisted extraction tool converts arbitrary content into taxonomy format. The extractor:
- Is a distinct tool (not part of the Rust parser)
- Does NOT assume any particular input format — it uses an LLM to semantically interpret prose content of any structure (Workflowy outlines, standard markdown, plain text, or mixed)
- Provides the Collins taxonomy schema to the LLM as extraction context, so the LLM knows what to extract and how to format it
- Chunks large inputs for manageable LLM processing
- Validates LLM output against the taxonomy schema before inclusion
- Flags low-confidence extractions for human review
- Produces taxonomy-format output that the Rust parser can consume
- Preserves rich content in extended fields (summaries, key works, connections)

This separation creates a clear division of responsibility:
- **LLM** handles the hard problem: semantic interpretation of unstructured content
- **Rust parser** handles the reliable problem: deterministic parsing of structured format
- **Taxonomy format** is the checkpoint between them — human-readable, version-controllable, and auditable

### 8. Rich Content Alongside Structure
The Graph IR must carry enough content for meaningful exploration, not just skeletal metadata. Nodes have:
- Structured fields (id, name, eminence, generation, stream, etc.) — always present
- A `content` object with optional rich fields (summary, key_works, critiques, connections_prose) — populated when extracted from rich sources like the concept library
- The `notes` field remains for brief annotations on any node

The detail panel in the frontend renders rich content when available, falling back to structured fields only.

### 9. Edge Importance for Scale
At network scale (500+ nodes, 1000+ edges), not all edges are equally important. Edges carry an optional `weight` (0.0–1.0) that captures importance:
- Edges derived from explicit taxonomy definitions: weight 1.0 (default)
- Edges inferred from "Connection to X:" prose markers: weight 0.5–0.8 (depending on specificity)
- Edges inferred from mere mention or co-occurrence: weight 0.1–0.3

The renderer uses edge weight alongside node LOD to manage visual density. Low-weight edges are hidden before high-weight ones as zoom decreases.

### 10. Concept Hierarchy
Concepts may contain sub-concepts (e.g., Cynefin contains Clear, Complicated, Complex, Chaotic, Disorder). The Graph IR supports an optional `parent_concept_id` field on concept nodes. Sub-concepts:
- Are full concept nodes with their own metadata
- Reference their parent via `parent_concept_id`
- Can be collapsed into their parent in the visualization (treated as a subgraph cluster)
- Inherit `stream` and `generation` from their parent when not explicitly set

## Patterns to Follow
- Pass data across the Rust/React boundary as typed JSON matching a shared schema
- Keep the Rust CLI and WASM entry point as thin wrappers around the same core library
- Use Cargo features (`wasm`) to gate WASM-specific code, keeping the core lib clean
- Run the extraction pipeline as a separate pre-processing step, not inline with parsing
- Design IR fields for progressive enhancement: basic metadata always present, rich content optional
- All native file I/O goes through Swift; JS never touches the filesystem directly
- The React SPA must work both in WKWebView (production) and a browser (development/testing)

## Anti-Patterns to Avoid
- Rust code that knows about React rendering concerns
- React code that parses markdown directly (use the WASM parser)
- Storing graph state in the frontend that diverges from the parsed source
- Tight coupling between the CLI interface and the core parsing/graph logic
- Attempting to parse Workflowy-style prose outlines in the taxonomy parser
- Treating the taxonomy as the intellectual source (it's derived, not primary)
- Embedding all prose content as a single `notes` string (use structured content fields)
- Direct network calls from the app (it must remain fully offline/sandboxed)

## See Also
- [Development Principles](principles-development.md)
- [Security Principles](principles-security.md)
