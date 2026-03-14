# Concept Mapper Specification

> Parse Collins Network Taxonomy markdown into a typed Graph IR; render as an interactive force-directed map. Extract structured networks from rich prose sources via a two-stage pipeline.

---

## REQ-001: Line Classification (Lexer)

The parser classifies each line of the input taxonomy markdown into a line type, preserving line numbers for error reporting.

**Preconditions:**
- Input is a UTF-8 string (file contents) in Collins taxonomy format

**Trigger:**
- `lex(input: &str)` is called

**Expected Behavior:**
- Each line is classified as one of: `Header`, `FenceOpen`, `FenceClose`, `TableRow`, `TableSeparator`, `KVPair`, `BulletItem`, `BlankLine`, `Prose`
- Every classified line retains its 1-indexed line number and raw content

**Acceptance Criteria:**
- [ ] AC-001-01: Lines starting with `#{1,6} ` are classified as `Header` with level extracted
- [ ] AC-001-02: Lines matching ` ``` ` (with optional trailing whitespace) toggle fence state (FenceOpen/FenceClose alternating)
- [ ] AC-001-03: Lines matching `|...|` are classified as `TableRow`; lines matching `|[-:|]+|` as `TableSeparator`
- [ ] AC-001-04: Lines inside a fence matching `word: value` are classified as `KVPair` with key and value extracted
- [ ] AC-001-05: Lines starting with `- ` or `* ` (with optional leading whitespace) are classified as `BulletItem`
- [ ] AC-001-06: Empty or whitespace-only lines are classified as `BlankLine`
- [ ] AC-001-07: All other lines are classified as `Prose`
- [ ] AC-001-08: Every ClassifiedLine includes `line_number: usize` (1-indexed) and `raw: String`
- [ ] AC-001-09: The lexer processes the full `collins_network_taxonomy.md` example without panic

**Edge Cases:**
- Lines inside fences that don't match KV pattern: classified as `Prose` (e.g., free text in notes)
- Nested backticks within prose (e.g., inline code): not treated as fence markers (fences require ``` at line start)
- Indented KV pairs (e.g., `  note: ...`): still classified as `KVPair`, leading whitespace stripped from key

---

## REQ-002: Section Splitting

The parser groups classified lines into hierarchical sections based on markdown headers.

**Preconditions:**
- Classified lines from REQ-001

**Trigger:**
- `split_sections(lines: Vec<ClassifiedLine>)` is called

**Expected Behavior:**
- Lines are grouped into sections defined by `##` and `###` headers
- Each section has a path (e.g., `["6. Example", "6.3 Selected Thinker Nodes"]`)
- Sections contain their child lines (excluding the header itself)

**Acceptance Criteria:**
- [ ] AC-002-01: Each `##` header starts a new top-level section
- [ ] AC-002-02: Each `###` header starts a sub-section within the current `##` section
- [ ] AC-002-03: Lines before the first `##` header are grouped into a preamble section
- [ ] AC-002-04: Section paths are derived from header text (e.g., `"### 6.3 Selected Thinker Nodes"` → path element `"6.3 Selected Thinker Nodes"`)
- [ ] AC-002-05: The example taxonomy produces sections for: Purpose, Node Types, Edge Types, Structural Roles, Network-Level Properties, Example (with sub-sections for Generations, Streams, Thinker Nodes, Concept Nodes, Edges, External Shocks, Structural Observations)

**Edge Cases:**
- `#` (h1) headers: treated as document title, not a section boundary
- `####` headers: treated as content within the current section (not a new section level)

---

## REQ-003: Thinker Node Parsing

The parser extracts thinker nodes from fenced code blocks containing key-value pairs.

**Preconditions:**
- Section identified as containing thinker nodes (by header path or content heuristics)

**Trigger:**
- `parse_thinker_node(block: &[ClassifiedLine])` is called with lines from a single fenced block

**Expected Behavior:**
- A `ThinkerNode` struct is produced with all fields populated from the KV pairs
- List fields (`key_concept_ids`, `structural_role`) are parsed from comma-separated or bracket-delimited values

**Acceptance Criteria:**
- [ ] AC-003-01: `id` field is extracted as a trimmed string
- [ ] AC-003-02: `name` field is extracted as a trimmed string
- [ ] AC-003-03: `dates` field is extracted as a trimmed string
- [ ] AC-003-04: `eminence` field is parsed as enum: `dominant`, `major`, `secondary`, `minor`
- [ ] AC-003-05: `generation` field is parsed as integer
- [ ] AC-003-06: `stream` field is extracted as a trimmed string
- [ ] AC-003-07: `structural_role` with comma-separated values (e.g., `intellectual_leader, chain_originator`) produces a `Vec<String>`
- [ ] AC-003-08: `key_concept_ids` with bracket syntax (e.g., `[double_loop, defensive_routines]`) produces a `Vec<String>`
- [ ] AC-003-09: `active_period` field is extracted as a trimmed string
- [ ] AC-003-10: `institutional_base` field is extracted as a trimmed string
- [ ] AC-003-11: Missing required fields (`id`, `name`) produce a `ParseError` with line number
- [ ] AC-003-12: Unknown fields are ignored (forward compatibility)
- [ ] AC-003-13: All three example thinker nodes (argyris, stacey, senge) parse correctly

**Edge Cases:**
- `dates` with "b. 1947" format (birth only): stored as-is, no parsing
- Extra whitespace in values: trimmed
- Missing optional fields (`notes`, `institutional_base`): default to `None`

---

## REQ-004: Concept Node Parsing

The parser extracts concept nodes from fenced code blocks containing key-value pairs.

**Preconditions:**
- Section identified as containing concept nodes

**Trigger:**
- `parse_concept_node(block: &[ClassifiedLine])` is called

**Expected Behavior:**
- A `ConceptNode` struct is produced with all fields populated

**Acceptance Criteria:**
- [ ] AC-004-01: `id` field is extracted as a trimmed string
- [ ] AC-004-02: `name` field is extracted as a trimmed string
- [ ] AC-004-03: `originator_id` field is extracted as a trimmed string; if absent, defaults to `"unknown_author"`
- [ ] AC-004-04: `date_introduced` field is extracted as a trimmed string
- [ ] AC-004-05: `concept_type` is parsed as enum: `framework`, `principle`, `distinction`, `mechanism`, `prescription`, `synthesis`
- [ ] AC-004-06: `abstraction_level` is parsed as enum: `concrete`, `operational`, `theoretical`, `meta-theoretical`
- [ ] AC-004-07: `status` is parsed as enum: `active`, `absorbed`, `contested`, `dormant`, `superseded`
- [ ] AC-004-08: `generation` is parsed as integer
- [ ] AC-004-09: `stream` field is extracted as a trimmed string
- [ ] AC-004-10: Missing required fields (`id`, `name`) produce a `ParseError` with line number
- [ ] AC-004-11: All seven example concept nodes parse correctly

**Edge Cases:**
- `notes` field may be absent: default to `None`
- `parent_concept_id` field may be present for sub-concepts: extracted as optional string
- `originator_id` absent: defaults to `"unknown_author"`, no error produced
- `originator_id` referencing a non-existent thinker: valid (resolved at assembly time via REQ-006)

---

## REQ-005: Edge Parsing

The parser extracts edges from fenced code blocks that may contain multiple edge definitions.

**Preconditions:**
- Section identified as containing edges

**Trigger:**
- `parse_edges(block: &[ClassifiedLine])` is called

**Expected Behavior:**
- A `Vec<Edge>` is produced, one per `from:` entry in the block
- Multi-line notes (continuation lines with leading whitespace) are joined into a single string

**Acceptance Criteria:**
- [ ] AC-005-01: Each `from:` line starts a new edge definition
- [ ] AC-005-02: `from` and `to` fields are extracted as trimmed strings
- [ ] AC-005-03: `type` field is parsed as one of the 15 edge type enums
- [ ] AC-005-04: Single-line `note:` values are extracted
- [ ] AC-005-05: Multi-line notes (indented continuation lines) are joined with spaces
- [ ] AC-005-06: Blank lines between edges are ignored
- [ ] AC-005-07: All example thinker-thinker edges (11 edges) parse correctly
- [ ] AC-005-08: All example thinker-concept edges (10 edges) parse correctly
- [ ] AC-005-09: All example concept-concept edges (6 edges) parse correctly
- [ ] AC-005-10: Optional `weight` field (float 0.0–1.0) is parsed when present; defaults to 1.0 when absent

**Edge Cases:**
- Edge with no `note:` field: `note` defaults to `None`
- Trailing whitespace in from/to values: trimmed

---

## REQ-006: Graph IR Assembly

The parser assembles parsed nodes and edges into the Graph IR structure with validation.

**Preconditions:**
- Parsed thinker nodes, concept nodes, edges, and metadata from REQ-001 through REQ-005

**Trigger:**
- `assemble_graph(parsed: ParsedDocument)` is called

**Expected Behavior:**
- A `GraphIR` struct is produced containing nodes, edges, and metadata
- Edge `edge_category` is computed from the node types of `from` and `to`
- Edge `visual` properties (style, color, show_arrow) are computed from edge type using the taxonomy's visual conventions
- Validation warnings are emitted for edges referencing non-existent nodes

**Acceptance Criteria:**
- [ ] AC-006-01: All thinker nodes are represented in `nodes` with `node_type: "thinker"` and populated `thinker_fields`
- [ ] AC-006-02: All concept nodes are represented in `nodes` with `node_type: "concept"` and populated `concept_fields`
- [ ] AC-006-03: `edge_category` is `thinker_thinker` when both `from` and `to` are thinker nodes
- [ ] AC-006-04: `edge_category` is `thinker_concept` when `from` is thinker and `to` is concept
- [ ] AC-006-05: `edge_category` is `concept_concept` when both are concept nodes
- [ ] AC-006-06: `rivalry` edges get visual `{style: "dashed", color: "red", show_arrow: false}`
- [ ] AC-006-07: `alliance` edges get visual `{style: "dotted", color: "grey", show_arrow: false}`
- [ ] AC-006-08: `chain` and `teacher_pupil` edges get visual `{style: "solid", color: null, show_arrow: true}`
- [ ] AC-006-09: `synthesis` edges get visual `{style: "solid", color: null, show_arrow: true}`
- [ ] AC-006-10: Directed edges (`teacher_pupil`, `chain`, `synthesis`, `originates`, `develops`, `extends`, `subsumes`, `enables`, `reframes`) have `directed: true`
- [ ] AC-006-11: Undirected edges (`rivalry`, `alliance`, `institutional`, `opposes`) have `directed: false`
- [ ] AC-006-12: An edge referencing a non-existent node ID produces a warning (not an error)
- [ ] AC-006-13: Duplicate node IDs produce a `ParseError`
- [ ] AC-006-14: The full example taxonomy assembles into a valid `GraphIR` with 3 thinkers, 7 concepts, and 27 edges
- [ ] AC-006-15: Concept nodes with `parent_concept_id` are linked to their parent; missing parent produces a warning
- [ ] AC-006-16: Edge `weight` defaults to 1.0 when not specified in source
- [ ] AC-006-17: When any concept has `originator_id: "unknown_author"`, an `Unknown Author` sentinel thinker node is automatically created with `node_type: "thinker"`, `eminence: "minor"`, and a flag `is_placeholder: true`
- [ ] AC-006-18: The `Unknown Author` sentinel is created at most once, regardless of how many concepts reference it
- [ ] AC-006-19: An `originates` edge is created from `unknown_author` to each concept that references it
- [ ] AC-006-20: Concepts with missing `originator_id` in the source default to `"unknown_author"` (no error, no warning)

**Edge Cases:**
- `contests` and `applies` edges (thinker→concept): `directed: true`
- Sub-concepts inherit `stream` and `generation` from parent when not explicitly set
- All concepts have known originators: no `Unknown Author` node created
- Single concept with unknown originator: creates sentinel + one `originates` edge

---

## REQ-007: JSON Serialization

The Graph IR serializes to JSON matching the schema contract.

**Preconditions:**
- Valid `GraphIR` from REQ-006

**Trigger:**
- `serde_json::to_string(&graph_ir)` or equivalent

**Expected Behavior:**
- JSON output matches the Graph IR schema with all fields correctly typed

**Acceptance Criteria:**
- [ ] AC-007-01: Output is valid JSON
- [ ] AC-007-02: `version` field is present with value `"1.0"`
- [ ] AC-007-03: `metadata` object contains `title`, `source_file`, `parsed_at` fields
- [ ] AC-007-04: `nodes` is an array of node objects with correct field names (snake_case)
- [ ] AC-007-05: `edges` is an array of edge objects with `visual` sub-object
- [ ] AC-007-06: Round-trip test: serialize → deserialize → re-serialize produces identical JSON
- [ ] AC-007-07: Null/None optional fields are omitted from JSON (not serialized as `null`)
- [ ] AC-007-08: Node `content` object serialized when present, omitted when absent
- [ ] AC-007-09: Edge `weight` field serialized as float

**Edge Cases:**
- Empty graph (no nodes, no edges): produces valid JSON with empty arrays

---

## REQ-008: CLI Interface

A command-line tool reads a markdown file and outputs Graph IR JSON.

**Preconditions:**
- Rust binary is built

**Trigger:**
- `concept-mapper <input.md>` is run

**Expected Behavior:**
- Reads the markdown file, parses it, and writes JSON to stdout
- Parse errors are written to stderr with line numbers
- Exit code 0 on success, 1 on parse errors

**Acceptance Criteria:**
- [ ] AC-008-01: `concept-mapper collins_network_taxonomy.md` produces valid JSON on stdout
- [ ] AC-008-02: Parse errors are printed to stderr with format `error[line N]: message`
- [ ] AC-008-03: Warnings are printed to stderr with format `warning[line N]: message`
- [ ] AC-008-04: Exit code is 0 when parsing succeeds (even with warnings)
- [ ] AC-008-05: Exit code is 1 when parsing fails (errors present)
- [ ] AC-008-06: Non-existent file produces a clear error message

**Edge Cases:**
- Empty file: produces valid JSON with empty nodes/edges arrays
- File with only prose (no data blocks): produces valid JSON with empty arrays and a warning

---

## REQ-009: React Graph Rendering

The React app renders a Graph IR JSON file as a force-directed graph on an HTML Canvas.

**Preconditions:**
- Valid Graph IR JSON is available (loaded from file or API)

**Trigger:**
- App loads and JSON is fetched

**Expected Behavior:**
- Nodes are drawn as shapes on a Canvas element
- Edges are drawn as lines with appropriate styles
- D3-force simulation positions nodes with generation (Y) and stream (X) hints
- Layout stabilizes within a reasonable time

**Acceptance Criteria:**
- [ ] AC-009-01: Thinker nodes render as circles
- [ ] AC-009-02: Concept nodes render as rounded rectangles
- [ ] AC-009-03: Node radius/size varies by eminence (dominant largest, minor smallest)
- [ ] AC-009-04: Node fill color corresponds to stream color from metadata
- [ ] AC-009-05: Edge line style matches `visual.style` (solid, dashed, dotted)
- [ ] AC-009-06: Edge color matches `visual.color` (red for rivalry, grey for alliance, default for others)
- [ ] AC-009-07: Directed edges show arrowheads
- [ ] AC-009-08: Node labels (names) are rendered next to nodes
- [ ] AC-009-09: Nodes are vertically grouped by generation (Gen 1 top, Gen N bottom)
- [ ] AC-009-10: Nodes are horizontally grouped by stream
- [ ] AC-009-11: Sub-concepts are positioned near their parent concept

**Edge Cases:**
- Single node, no edges: renders one node centered
- Node with no stream or generation: positioned at center defaults

---

## REQ-010: Pan, Zoom, and Interaction

The user can navigate and interact with the graph.

**Preconditions:**
- Graph is rendered (REQ-009)

**Trigger:**
- Mouse/trackpad input on the canvas

**Expected Behavior:**
- Scroll/pinch to zoom, drag to pan
- Click a node to select it and show details
- Hover a node to highlight it and its edges

**Acceptance Criteria:**
- [ ] AC-010-01: Mouse wheel / trackpad pinch zooms the canvas
- [ ] AC-010-02: Click-drag on empty space pans the view
- [ ] AC-010-03: Clicking a node selects it and opens a detail panel
- [ ] AC-010-04: The detail panel shows structured fields (name, dates, eminence, stream, etc.)
- [ ] AC-010-05: The detail panel shows rich content when available (summary, key_works, critiques)
- [ ] AC-010-06: Hovering a node highlights its direct edges and connected nodes
- [ ] AC-010-07: Nodes can be dragged to reposition them (simulation pins them)
- [ ] AC-010-08: Double-click on empty space resets zoom/pan to fit all visible nodes

**Edge Cases:**
- Clicking empty canvas: deselects any selected node
- Dragging a node then releasing: node stays pinned at new position
- Node with no rich content: detail panel shows structured fields only

---

## REQ-011: Level-of-Detail (Nodes and Edges)

The graph adjusts visible detail based on zoom level, for both nodes and edges independently.

**Preconditions:**
- Graph is rendered with zoom support (REQ-009, REQ-010)

**Trigger:**
- Zoom level changes

**Expected Behavior:**
- At low zoom (overview): only high-eminence nodes and high-weight edges visible
- At medium zoom: dominant + major thinkers, their concepts, and medium+ weight edges
- At high zoom: all nodes and all edges with full labels

**Acceptance Criteria:**
- [ ] AC-011-01: At zoom < 0.4: only `dominant` thinker nodes are visible
- [ ] AC-011-02: At zoom 0.4–1.0: `dominant` and `major` thinker nodes visible, plus concept nodes connected to visible thinkers
- [ ] AC-011-03: At zoom > 1.0: all nodes visible including `secondary` and `minor`
- [ ] AC-011-04: Edges between non-visible nodes are hidden
- [ ] AC-011-05: Node labels are hidden at zoom < 0.3
- [ ] AC-011-06: Transitions between LOD tiers are smooth (no jarring pop-in)
- [ ] AC-011-07: At zoom < 0.4: only edges with weight >= 0.8 are visible (between visible nodes)
- [ ] AC-011-08: At zoom 0.4–1.0: edges with weight >= 0.4 are visible (between visible nodes)
- [ ] AC-011-09: At zoom > 1.0: all edges visible regardless of weight

**Edge Cases:**
- Zoom level exactly at tier boundary: use the more detailed tier
- Edge with no weight (default 1.0): always visible when both endpoints are visible

---

## REQ-012: Cluster Collapse/Expand

The user can collapse groups of nodes into summary nodes.

**Preconditions:**
- Graph is rendered with clusters computed from the IR

**Trigger:**
- User clicks a collapse control on a cluster

**Expected Behavior:**
- All nodes in the cluster are replaced by a single summary node
- Edges to/from collapsed nodes are re-routed to the summary node
- Expanding reverses the operation

**Acceptance Criteria:**
- [ ] AC-012-01: Clusters can be formed by stream (all nodes in a stream)
- [ ] AC-012-02: Clusters can be formed by generation (all nodes in a generation)
- [ ] AC-012-03: Clusters can be formed by subgraph (thinker + their originated concepts)
- [ ] AC-012-04: Clusters can be formed by concept hierarchy (parent concept + sub-concepts)
- [ ] AC-012-05: A collapsed cluster shows a summary node with label `"Stream Name (N nodes)"` or equivalent
- [ ] AC-012-06: Summary node is positioned at the centroid of collapsed nodes
- [ ] AC-012-07: Edges between collapsed and non-collapsed nodes are drawn to the summary node
- [ ] AC-012-08: Expanding a cluster restores all member nodes and original edges
- [ ] AC-012-09: Expanded clusters show a convex hull boundary around member nodes

**Edge Cases:**
- Collapsing a cluster that contains only one node: still collapses (shows summary node)
- Collapsing nested clusters (e.g., collapse stream, then collapse generation within it): inner collapse is preserved when outer is expanded

---

## REQ-013: Search and Filter

The user can search for nodes and filter the graph by properties.

**Preconditions:**
- Graph is rendered

**Trigger:**
- User types in search bar or toggles filters

**Expected Behavior:**
- Search highlights matching nodes and centers the view
- Filters toggle visibility of nodes by stream, generation, or eminence

**Acceptance Criteria:**
- [ ] AC-013-01: Typing in the search bar filters nodes by name (case-insensitive substring match)
- [ ] AC-013-02: Selecting a search result centers and zooms the view to that node
- [ ] AC-013-03: Selected search result node is visually highlighted
- [ ] AC-013-04: Stream toggles show/hide all nodes in that stream
- [ ] AC-013-05: Generation toggles show/hide all nodes in that generation
- [ ] AC-013-06: Eminence toggles show/hide nodes of that eminence level

**Edge Cases:**
- Search with no matches: no change to view, message shown
- All filters off: empty graph with message "No nodes match current filters"

---

## REQ-014: Error Reporting

Parse errors provide actionable information for the user to fix their markdown.

**Preconditions:**
- Malformed input is provided

**Trigger:**
- Parsing encounters invalid content

**Expected Behavior:**
- Errors include line number, context, and a suggestion for fixing
- Multiple errors are collected and reported together

**Acceptance Criteria:**
- [ ] AC-014-01: Missing required field error includes the field name and line number of the block
- [ ] AC-014-02: Invalid enum value error includes the invalid value, valid options, and line number
- [ ] AC-014-03: Unclosed fence error includes the line number of the opening fence
- [ ] AC-014-04: Multiple errors in the same file are all reported (not just the first)
- [ ] AC-014-05: Warnings for non-fatal issues (e.g., unknown edge target) are separate from errors
- [ ] AC-014-06: Error messages follow format: `error[line N]: description. Suggestion: fix`

**Edge Cases:**
- Error inside a deeply nested section: path context includes section hierarchy

---

## REQ-015: LLM-Assisted Extraction Pipeline

A separate extraction tool converts arbitrary prose content (including but not limited to Workflowy-style outlines like the concept library) into Collins taxonomy format for parsing. The extractor does NOT assume the input follows any particular structure — it uses an LLM to interpret content semantically and produce structured taxonomy output.

**Preconditions:**
- Input is any markdown or plain text file containing intellectual content about thinkers, concepts, and their relationships
- An LLM API (Claude) is available for semantic extraction

**Trigger:**
- `extract <input-file> --output <taxonomy.md>` is run
- Optionally with `--taxonomy-template <template.md>` to provide the Collins schema as context

**Expected Behavior:**
- The extractor sends content to the LLM in manageable chunks with the Collins taxonomy schema as context
- The LLM identifies thinkers, concepts, relationships, and metadata from the prose — regardless of input format
- The LLM produces taxonomy-format output (fenced KV blocks, typed edges) following the Collins schema
- Results are assembled, deduplicated, and validated before writing
- Output is a valid Collins taxonomy file that the Rust parser can consume

**Acceptance Criteria:**

*LLM Extraction Core:*
- [ ] AC-015-01: The Collins taxonomy schema (node types, edge types, field definitions) is provided to the LLM as extraction context
- [ ] AC-015-02: Input content is chunked into LLM-manageable segments (by thinker entry, by section, or by size limit)
- [ ] AC-015-03: Each chunk is sent to the LLM with instructions to extract thinkers, concepts, and relationships in taxonomy format
- [ ] AC-015-04: LLM output is parsed and validated against the taxonomy schema before inclusion
- [ ] AC-015-05: Invalid or low-confidence LLM extractions are flagged for human review, not silently included

*Thinker Extraction:*
- [ ] AC-015-06: Thinkers are extracted with all available fields: `id` (slugified), `name`, `dates`, `eminence`, `generation`, `stream`, `structural_role`, `active_period`, `key_concept_ids`, `institutional_base`
- [ ] AC-015-07: The LLM infers `eminence` from prose descriptions of influence and impact
- [ ] AC-015-08: The LLM infers `generation` from dates and described intellectual lineage
- [ ] AC-015-09: The LLM infers `stream` from the thinker's described domain and intellectual context

*Concept Extraction:*
- [ ] AC-015-10: Concepts are extracted with: `id`, `name`, `originator_id`, `date_introduced`, `concept_type`, `abstraction_level`, `status`
- [ ] AC-015-11: The LLM classifies `concept_type` (framework, principle, distinction, mechanism, prescription, synthesis) from description
- [ ] AC-015-12: The LLM classifies `abstraction_level` from description context

*Edge Extraction:*
- [ ] AC-015-13: Edges are extracted with typed relationships from the 15 edge types in the taxonomy
- [ ] AC-015-14: The LLM infers edge type from prose context (e.g., "studied under" → `teacher_pupil`, "opposed" → `rivalry`)
- [ ] AC-015-15: Edge `weight` is set based on extraction confidence: explicit stated relationships = 1.0, inferred connections = 0.5–0.8, weak associations = 0.2–0.4
- [ ] AC-015-16: Edges include `note` fields with the prose context from which they were extracted

*Rich Content:*
- [ ] AC-015-17: Extracted nodes include `content.summary` (LLM-generated summary of the entry)
- [ ] AC-015-18: `Key Works` or bibliography information is extracted into `content.key_works`
- [ ] AC-015-19: Criticisms and limitations are extracted into `content.critiques`
- [ ] AC-015-20: Prose connection descriptions are preserved in `content.connections_prose`

*Assembly and Validation:*
- [ ] AC-015-21: Output is valid Collins taxonomy format that passes REQ-001 through REQ-006
- [ ] AC-015-22: Duplicate nodes (same thinker/concept extracted from multiple chunks) are merged, not duplicated
- [ ] AC-015-23: Bidirectional connections (A mentions B, B mentions A) are deduplicated into one edge
- [ ] AC-015-24: The extraction handles the full 20,176-line concept library successfully
- [ ] AC-015-25: Extraction produces a manifest listing: nodes extracted, edges extracted, confidence scores, items flagged for review
- [ ] AC-015-26: The extraction can be run incrementally: re-extracting a changed section without re-processing the entire file

*Format Agnosticism:*
- [ ] AC-015-27: The extractor works on Workflowy-style indented outlines (concept library format)
- [ ] AC-015-28: The extractor works on standard markdown with headers and paragraphs
- [ ] AC-015-29: The extractor works on plain prose text with no structural markup
- [ ] AC-015-30: The extractor handles mixed formats within a single file

**Edge Cases:**
- Thinker mentioned in prose but with insufficient detail: extracted as `minor` eminence with flagged confidence
- Concept mentioned only in passing: not extracted as a node (LLM distinguishes mentions from definitions)
- Input contains non-English content: LLM handles multilingual extraction
- Very large input (20K+ lines): chunked processing prevents token limit issues
- LLM API failure mid-extraction: partial results are saved; extraction can resume from last successful chunk
- Conflicting information between chunks: flagged for human review in manifest

**Principles Compliance:**
- Architecture: Separate tool, not part of the taxonomy parser (Principle 7)
- Architecture: Preserves rich content in structured fields (Principle 8)
- Architecture: Sets edge weight based on confidence (Principle 9)
- Security: LLM API key from environment variables, not in code
- Security: Sanitizes extracted text content before output
- Security: Input content is not logged or stored beyond the extraction session

---

## REQ-016: Rich Node Content in Graph IR

The Graph IR supports structured rich content beyond basic metadata fields, enabling meaningful exploration in the detail panel.

**Preconditions:**
- Taxonomy source may include extended content fields (populated by extraction pipeline or manual authoring)

**Trigger:**
- Node includes content fields in taxonomy source

**Expected Behavior:**
- Node `content` object carries optional rich fields
- Frontend renders rich content when available

**Acceptance Criteria:**
- [ ] AC-016-01: Node IR includes optional `content` object with fields: `summary`, `key_works`, `critiques`, `connections_prose`
- [ ] AC-016-02: `content.summary` is a string (first paragraph or abstract of the thinker/concept)
- [ ] AC-016-03: `content.key_works` is an array of strings (bibliography entries)
- [ ] AC-016-04: `content.critiques` is an array of strings (known criticisms or limitations)
- [ ] AC-016-05: `content.connections_prose` is an array of `{target_id, text}` objects (prose descriptions of connections)
- [ ] AC-016-06: `content` is omitted from JSON when all sub-fields are absent
- [ ] AC-016-07: Round-trip serialization preserves content fields exactly

**Edge Cases:**
- Node with partial content (only summary, no key_works): other fields omitted
- Content fields with unicode, special characters: preserved as-is

---

## REQ-017: Concept Hierarchy

Concepts may contain sub-concepts, forming a hierarchical structure that the IR and visualization support.

**Preconditions:**
- Concept node in taxonomy source includes `parent_concept_id` field

**Trigger:**
- Concept node with `parent_concept_id` is parsed

**Expected Behavior:**
- Sub-concept is linked to parent in the IR
- Visualization positions sub-concepts near parent and supports collapse

**Acceptance Criteria:**
- [ ] AC-017-01: `parent_concept_id` field is parsed as optional string on concept nodes
- [ ] AC-017-02: Sub-concepts inherit `stream` from parent when not explicitly set
- [ ] AC-017-03: Sub-concepts inherit `generation` from parent when not explicitly set
- [ ] AC-017-04: Parent concept ID referencing non-existent concept produces a warning
- [ ] AC-017-05: Sub-concepts are positioned adjacent to their parent in the force layout
- [ ] AC-017-06: Parent concept + sub-concepts form a collapsible cluster (REQ-012)

**Edge Cases:**
- Circular parent references (A parent of B, B parent of A): detected and reported as error
- Deep nesting (sub-sub-concepts): supported up to 3 levels; deeper produces a warning

---

## REQ-018: Full Graph Editing in GUI

The user can edit all node and edge content directly in the GUI. This includes reassigning concept originators, editing metadata fields, modifying rich content, creating/deleting nodes and edges, and resolving `Unknown Author` placeholders.

**Preconditions:**
- Graph is rendered with a detail panel (REQ-010)

**Trigger:**
- User clicks an edit control on the detail panel, or uses graph-level editing controls

**Expected Behavior:**
- All node and edge fields are editable via the detail panel
- New nodes and edges can be created; existing ones can be deleted
- Changes are applied to the in-memory Graph IR and reflected immediately in the visualization
- The `Unknown Author` placeholder node is visually distinct and prompts the user to assign a real originator
- When all concepts are reassigned away from `Unknown Author`, the placeholder node is automatically removed
- Edit history supports undo/redo

**Acceptance Criteria:**

*Node Editing:*
- [ ] AC-018-01: The detail panel includes an "Edit" toggle/button for the selected node
- [ ] AC-018-02: In edit mode, all structured fields are editable: `name`, `eminence`, `stream`, `generation`, `dates`, `active_period`, `institutional_base`, `structural_role`
- [ ] AC-018-03: For concept nodes, `originator_id` is editable via a dropdown of existing thinker nodes
- [ ] AC-018-04: For concept nodes, `concept_type`, `abstraction_level`, `status`, and `parent_concept_id` are editable
- [ ] AC-018-05: Rich content fields are editable: `content.summary` (text area), `content.key_works` (list editor), `content.critiques` (list editor)
- [ ] AC-018-06: `notes` field is editable as free text directly from the detail panel (always visible, not hidden behind edit toggle)
- [ ] AC-018-06a: Notes changes are immediately persisted to the in-memory IR
- [ ] AC-018-06b: Notes are included verbatim in taxonomy markdown export (REQ-020) as `notes:` KV field in the node block

*Unknown Author Resolution:*
- [ ] AC-018-07: Reassigning `originator_id` from `unknown_author` to a real thinker updates the `originates` edge
- [ ] AC-018-08: When no concepts reference `unknown_author`, the placeholder node is removed from the graph
- [ ] AC-018-09: The `Unknown Author` node is visually distinct (dashed border, dimmed) to signal it needs resolution
- [ ] AC-018-10: Hovering the `Unknown Author` node shows a tooltip: "Placeholder — assign originator via concept detail panel"

*Node/Edge Creation and Deletion:*
- [ ] AC-018-11: A "New Thinker" action creates a new thinker node with default fields, positioned near the current view center
- [ ] AC-018-12: A "New Concept" action creates a new concept node (originator defaults to selected thinker, or `unknown_author`)
- [ ] AC-018-13: A "New Edge" action allows drawing an edge between two nodes by clicking source then target, with edge type selection
- [ ] AC-018-14: Deleting a node removes it and all connected edges; deleting a thinker reassigns their concepts to `unknown_author`
- [ ] AC-018-15: Deleting an edge removes it without affecting connected nodes

*Edit State Management:*
- [ ] AC-018-16: Undo (Ctrl/Cmd+Z) reverts the last edit operation
- [ ] AC-018-17: Redo (Ctrl/Cmd+Shift+Z) reapplies the last undone operation
- [ ] AC-018-18: Unsaved edits are indicated in the UI (e.g., "modified" badge, dot on export button)
- [ ] AC-018-19: Editing a node does not disrupt the force simulation (node stays in position)
- [ ] AC-018-20: All edits produce valid Graph IR (enum fields constrained to valid values via dropdowns)

**Edge Cases:**
- User assigns originator to a thinker, then deletes that thinker: concept reverts to `unknown_author`
- Multiple concepts with `unknown_author`: each can be reassigned independently
- Deleting the last node: empty graph state with "Add Node" prompt
- Rapid sequential edits: undo stack handles correctly

---

## REQ-019: Image Export

The user can download a high-resolution image of the current graph view.

**Preconditions:**
- Graph is rendered (REQ-009)

**Trigger:**
- User clicks "Export Image" button or uses keyboard shortcut

**Expected Behavior:**
- The current canvas state (including current zoom, pan, visible nodes, and cluster state) is exported as a PNG image
- The image resolution is suitable for printing or embedding in documents

**Acceptance Criteria:**
- [ ] AC-019-01: "Download Image" button is prominently visible in the toolbar (REQ-023 AC-023-09) with PNG/SVG dropdown
- [ ] AC-019-02: Exported image is PNG format
- [ ] AC-019-03: Image captures the current visible graph state (respecting zoom, pan, LOD, collapsed clusters)
- [ ] AC-019-04: Image resolution is at least 2x the canvas display size (retina-quality)
- [ ] AC-019-05: Node labels are legible in the exported image
- [ ] AC-019-06: A "Fit All" export option renders the entire graph (not just the current viewport) at a resolution where all node labels are readable
- [ ] AC-019-07: Export includes a legend (edge types, stream colors) in the bottom-right corner
- [ ] AC-019-08: The filename defaults to `{title}-{date}.png` (derived from graph metadata)
- [ ] AC-019-09: SVG export is also available as an alternative format for vector graphics use

**Edge Cases:**
- Very large graph (500+ nodes) with "Fit All": image is scaled to ensure readability (may be very large)
- Empty graph: exports a blank canvas with a "No data" message
- Graph with collapsed clusters: exported as shown (summary nodes, not expanded)

---

## REQ-020: Taxonomy Markdown Export

The user can export the current graph state (including all GUI edits) as a formatted Collins taxonomy markdown file.

**Preconditions:**
- Graph IR is loaded (with or without edits from REQ-018)

**Trigger:**
- User clicks "Download File" button in the toolbar (REQ-023 AC-023-10)

**Expected Behavior:**
- The current in-memory Graph IR (including all GUI edits and notes) is serialized back to Collins taxonomy markdown format
- The output follows the exact structure of the Collins taxonomy schema: header sections, fenced KV blocks for nodes, fenced edge blocks with from/to/type
- All edits made in the GUI are reflected in the export
- Rich content fields are included as extended blocks within the taxonomy

**Acceptance Criteria:**

*Structure:*
- [ ] AC-020-01: Output is a valid markdown file following the Collins taxonomy structure
- [ ] AC-020-02: Document begins with a `# Title` header derived from `metadata.title`
- [ ] AC-020-03: Generations are output as a markdown table under `## Generations`
- [ ] AC-020-04: Streams are output as a markdown table under `## Streams`
- [ ] AC-020-05: Each thinker node is output as a fenced code block with KV pairs under `## Thinker Nodes`
- [ ] AC-020-06: Each concept node is output as a fenced code block with KV pairs under `## Concept Nodes`
- [ ] AC-020-07: Edges are output as fenced blocks grouped by category (thinker-thinker, thinker-concept, concept-concept) under `## Edges`

*Content Fidelity:*
- [ ] AC-020-08: All node fields are included in the export (no data loss from IR → markdown)
- [ ] AC-020-09: Edge `note` fields are output as indented continuation lines
- [ ] AC-020-10: Edge `weight` is output when not 1.0 (default weight omitted for cleaner output)
- [ ] AC-020-11: Rich content (`content.summary`, `content.key_works`, etc.) is output in a `## Content` section per node, or as additional KV fields in the node block
- [ ] AC-020-12: `Unknown Author` placeholder nodes are NOT exported (concepts referencing them have `originator_id` omitted)
- [ ] AC-020-13: Sub-concepts include `parent_concept_id` field in their block

*Round-Trip Integrity:*
- [ ] AC-020-14: Exporting a freshly-parsed taxonomy and re-parsing the export produces an identical Graph IR (round-trip test)
- [ ] AC-020-15: Exporting after GUI edits produces a valid taxonomy that re-parses correctly
- [ ] AC-020-16: The filename defaults to `{title}-{date}.md`

*External Shocks and Metadata:*
- [ ] AC-020-17: External shocks are output as fenced blocks under `## External Shocks`
- [ ] AC-020-18: Structural observations are output as bullet items under `## Structural Observations`
- [ ] AC-020-19: Network stats are output as a summary section under `## Network Statistics`

**Edge Cases:**
- Empty graph: exports a minimal taxonomy with headers but no node/edge blocks
- Node with all optional fields empty: only required fields appear in the block
- Very long `note` values: wrapped at 80 characters with indented continuation
- Unicode in all fields: preserved exactly

---

## REQ-021: Graph View Modes

The user can switch between distinct view modes that filter and emphasize different aspects of the network.

**Preconditions:**
- Graph is rendered (REQ-009)

**Trigger:**
- User selects a view mode from a toggle control in the toolbar

**Expected Behavior:**
- View modes change which nodes and edges are visible and how they are emphasized
- Switching modes is instant (no re-parse; works on the in-memory IR)
- The current mode is visually indicated in the toolbar

**Acceptance Criteria:**

*View Mode Toggle:*
- [ ] AC-021-01: A view mode selector is visible in the toolbar with at least three modes
- [ ] AC-021-02: The current mode is visually highlighted (active state)
- [ ] AC-021-03: Switching modes preserves pan/zoom position and node positions
- [ ] AC-021-03a: Hidden nodes remain in the force simulation but are not rendered. This ensures layout stability across mode switches — nodes maintain their positions so toggling back to full view is seamless

*People/Institution View:*
- [ ] AC-021-04: Shows only thinker nodes and thinker-to-thinker edges
- [ ] AC-021-05: Concept nodes are hidden; edges involving concepts are hidden
- [ ] AC-021-06: Thinker nodes are sized by eminence, colored by stream
- [ ] AC-021-07: Institutional affiliations are shown as a second label line beneath thinker names (when zoom permits)
- [ ] AC-021-07a: The affiliation label is rendered in a smaller font (2px smaller) in a muted color, positioned below the name with 2px gap. Both lines share a single background rectangle.
- [ ] AC-021-07b: When `institutional_base` is absent, no second label line is rendered
- [ ] AC-021-08: Thinker-to-thinker edge types are labeled on the canvas (chain, teacher_pupil, rivalry, alliance, synthesis, institutional)

*Concept View:*
- [ ] AC-021-09: Shows only concept nodes and concept-to-concept edges
- [ ] AC-021-10: Thinker nodes are hidden; edges involving thinkers are hidden
- [ ] AC-021-11: Concept nodes are sized by abstraction level (meta-theoretical largest, concrete smallest)
- [ ] AC-021-12: Concept-to-concept edge types are labeled on the canvas (extends, opposes, subsumes, enables, reframes)
- [ ] AC-021-13: Concept status is indicated visually (e.g., contested = dashed border, superseded = dimmed)

*Full Network View (default):*
- [ ] AC-021-14: Shows all nodes and all edges (current behavior)
- [ ] AC-021-15: Thinker-to-concept edges visible (originates, develops, contests, applies)
- [ ] AC-021-16: Edge labels shown on hover or at sufficient zoom (REQ-022)

**Edge Cases:**
- Switching from concept view to full view while a concept node is selected: selection preserved
- View mode with zero visible nodes (e.g., concept view on a graph with no concepts): shows empty state with message
- Filters (REQ-013) combine with view mode: e.g., concept view + stream filter = only concepts in that stream

---

## REQ-022: Edge Labels on Canvas

Relationship edges are labeled with their type name from the taxonomy, visible on the canvas based on zoom level and interaction.

**Preconditions:**
- Graph is rendered with edges (REQ-009)

**Trigger:**
- User zooms in, hovers an edge, or activates a view mode that shows labels

**Expected Behavior:**
- Edge labels are drawn at the midpoint of the edge line
- Labels use the human-readable relationship type name from the taxonomy
- Labels appear progressively based on zoom level to avoid clutter

**Acceptance Criteria:**
- [ ] AC-022-01: Each edge type has a display label derived from the taxonomy: `teacher_pupil` → "Teacher → Pupil", `chain` → "Chain", `rivalry` → "Rivalry", `alliance` → "Alliance", `synthesis` → "Synthesis", `institutional` → "Institutional", `originates` → "Originates", `develops` → "Develops", `contests` → "Contests", `applies` → "Applies", `extends` → "Extends", `opposes` → "Opposes", `subsumes` → "Subsumes", `enables` → "Enables", `reframes` → "Reframes"
- [ ] AC-022-02: In Full Network view at zoom > 1.5: edge labels visible only for edges where at least one endpoint is highlighted (hovered or selected). Labels are NOT shown for all edges simultaneously to avoid clutter at scale.
- [ ] AC-022-03: At zoom 0.8–1.5: edge labels visible only for highlighted edges (hovered/selected node connections)
- [ ] AC-022-04: At zoom < 0.8: edge labels hidden unless overridden by view-mode-specific thresholds (AC-022-08, AC-022-09)
- [ ] AC-022-05: Hovering an edge (within 5px of the line) shows the label and the edge note as a tooltip. This is the primary way to see labels for non-highlighted edges at any zoom level.
- [ ] AC-022-06: Edge labels are rendered at the midpoint of the edge, rotated to follow the edge angle. Label rendering is gated by visibility checks BEFORE computing transforms to avoid unnecessary canvas operations.
- [ ] AC-022-07: Edge label text has a semi-transparent background for readability against the graph
- [ ] AC-022-08: In People/Institution view (REQ-021), ALL visible thinker-thinker edge labels are shown at zoom > 0.8 (overrides AC-022-02/04). This is acceptable because the filtered view has far fewer edges.
- [ ] AC-022-09: In Concept view (REQ-021), ALL visible concept-concept edge labels are shown at zoom > 0.8 (overrides AC-022-02/04). Same rationale.
- [ ] AC-022-10: Precedence rule: view-mode-specific thresholds (AC-022-08, AC-022-09) override default thresholds (AC-022-02..04) when a filtered view mode is active.

**Edge Cases:**
- Overlapping edges between the same pair of nodes: labels are offset vertically
- Very short edges (nodes close together): label may extend beyond edge; positioned to avoid overlap with node labels
- Edge with no `note`: tooltip shows only the type label

---

## REQ-023: Graph Toolbar

A persistent toolbar provides quick access to view modes, node/edge creation, export, and editing actions.

**Preconditions:**
- Graph is rendered (REQ-009)

**Trigger:**
- Always visible when graph is loaded

**Expected Behavior:**
- The toolbar is positioned at the top or side of the canvas area
- Buttons provide access to all major actions without requiring the detail panel

**Acceptance Criteria:**

*Layout:*
- [ ] AC-023-01: Toolbar is visible at the top of the canvas area, below the header
- [ ] AC-023-02: Toolbar items are grouped logically: View Modes | Add | Export | Undo/Redo

*View Mode Controls:*
- [ ] AC-023-03: Three toggle buttons: "Full Network", "People", "Concepts" (REQ-021)
- [ ] AC-023-04: Active view mode button is visually distinct

*Add Controls:*
- [ ] AC-023-05: "Add Thinker" button creates a new thinker node (REQ-018 AC-018-11)
- [ ] AC-023-06: "Add Concept" button creates a new concept node (REQ-018 AC-018-12)
- [ ] AC-023-07: "Add Edge" button enters edge-drawing mode: user clicks source node, then target node, then selects edge type from a dropdown of the 15 taxonomy types (REQ-018 AC-018-13)
- [ ] AC-023-07a: When edge-drawing mode is active, the canvas cursor changes to a crosshair. A "Drawing Edge..." banner appears in the toolbar with the current step ("Click source node" → "Click target node" → "Select type").
- [ ] AC-023-07b: In edge-drawing mode, node click events are intercepted for edge creation — they do NOT trigger selection (AC-010-03) or drag. Pan/zoom on empty canvas remains functional.
- [ ] AC-023-07c: After clicking the source node, a rubber-band line is drawn from the source node to the cursor position, previewing the edge.
- [ ] AC-023-07d: Clicking empty canvas during edge-drawing mode cancels the operation (in addition to Escape key).
- [ ] AC-023-08: Edge type dropdown shows human-readable labels grouped by category (Thinker↔Thinker, Thinker→Concept, Concept↔Concept). Only edge types valid for the selected source/target node types are shown.

*Export Controls:*
- [ ] AC-023-09: "Download Image" button triggers image export (REQ-019) with a dropdown for PNG vs SVG
- [ ] AC-023-10: "Download File" button triggers taxonomy markdown export (REQ-020)
- [ ] AC-023-11: Both download buttons show the "modified" indicator when unsaved edits exist (REQ-018 AC-018-18)

*Edit Controls:*
- [ ] AC-023-12: Undo button (with Ctrl/Cmd+Z shortcut)
- [ ] AC-023-13: Redo button (with Ctrl/Cmd+Shift+Z shortcut)
- [ ] AC-023-14: Buttons are disabled when no undo/redo history exists

*Notes Editing (in detail panel — see REQ-018 AC-018-06):*
- [ ] AC-023-15: Notes editing lives exclusively in the detail panel (REQ-018 AC-018-06), not duplicated in the toolbar. The toolbar does not include a separate notes widget.
- [ ] AC-023-16: Notes edits from the detail panel immediately update the in-memory IR (AC-018-06a)
- [ ] AC-023-17: Notes edits are included in the undo/redo stack
- [ ] AC-023-18: Notes are included in markdown file export (AC-018-06b). Notes are NOT rendered as annotations in image export (to avoid layout complexity); they are preserved only in the file export.

**Edge Cases:**
- Toolbar on small screens: buttons collapse into an overflow menu
- "Add Edge" mode: pressing Escape cancels edge drawing
- Toolbar actions while detail panel is open: both remain functional

---

## REQ-024: Search

The user can search for nodes by name and navigate to them.

**Preconditions:**
- Graph is rendered (REQ-009)

**Trigger:**
- User types in the search input field

**Expected Behavior:**
- Type-ahead search filters nodes by name (case-insensitive substring match)
- Matching results appear in a dropdown
- Selecting a result centers and zooms the canvas on that node, selects it, and opens the detail panel

**Acceptance Criteria:**
- [ ] AC-024-01: A search input field is visible in the header or toolbar
- [ ] AC-024-02: Typing filters nodes by name with case-insensitive substring matching
- [ ] AC-024-03: A dropdown shows up to 10 matching results with node type indicator (thinker/concept)
- [ ] AC-024-04: Selecting a result pans and zooms the canvas to center on the matched node
- [ ] AC-024-05: The matched node is selected and the detail panel opens
- [ ] AC-024-06: Pressing Enter selects the first match
- [ ] AC-024-07: Pressing Escape closes the search dropdown
- [ ] AC-024-08: Search works across all nodes regardless of current view mode (searching for a concept in People view switches to Full Network view)

**Edge Cases:**
- No matches: dropdown shows "No results"
- Empty search: dropdown hidden
- Search while detail panel is open: detail panel updates to show new selection

---

## REQ-025: File Import

The user can load their own taxonomy files or graph JSON files into the visualization.

**Preconditions:**
- App is loaded

**Trigger:**
- User clicks "Import" button or drags a file onto the canvas

**Expected Behavior:**
- Accepts `.json` (Graph IR format) or `.md` (Collins taxonomy format — parsed via the Rust CLI or client-side)
- The imported data replaces the current graph
- Import errors are shown to the user

**Acceptance Criteria:**
- [ ] AC-025-01: An "Import" button is visible in the toolbar
- [ ] AC-025-02: Clicking Import opens a file picker accepting `.json` and `.md` files
- [ ] AC-025-03: Drag-and-drop onto the canvas area also triggers import
- [ ] AC-025-04: `.json` files are loaded directly as Graph IR (validated against expected structure)
- [ ] AC-025-05: Invalid JSON shows an error message without crashing the app
- [ ] AC-025-06: Successfully imported graph replaces the current visualization
- [ ] AC-025-07: The graph title, node count, and edge count update in the header
- [ ] AC-025-08: Previous unsaved edits are warned about before import replaces them

**Edge Cases:**
- Empty JSON file: shows error "No data found"
- JSON with missing required fields: shows specific validation error
- Very large file (1000+ nodes): imported without freezing (async processing with loading indicator)

---

## REQ-026: Generation and Stream Labels on Canvas

The canvas displays visible generation bands and stream column headers to orient the researcher.

**Preconditions:**
- Graph is rendered with generations and streams defined in metadata (REQ-009)

**Trigger:**
- Always visible when graph is loaded

**Expected Behavior:**
- Horizontal bands for each generation are drawn behind the nodes with labels
- Vertical stream regions are labeled at the top of the canvas
- Labels remain visible during pan/zoom, positioned relative to the graph coordinate system

**Acceptance Criteria:**
- [ ] AC-026-01: Horizontal bands are drawn for each generation, alternating between slightly different background shades
- [ ] AC-026-02: Each generation band has a label on the left edge: "Gen N: Label (Period)" (e.g., "Gen 3: Flowering (~1960–1985)")
- [ ] AC-026-03: Stream names are displayed as column headers at the top, positioned at the stream's X-axis center
- [ ] AC-026-04: Stream headers are colored with the stream's assigned color
- [ ] AC-026-05: Labels scale with zoom but remain readable (minimum 10px)
- [ ] AC-026-06: Labels are drawn behind nodes and edges (background layer)
- [ ] AC-026-07: Labels are visible in all view modes (Full, People, Concepts)

**Edge Cases:**
- Graph with only one generation: single band fills the canvas
- Graph with no stream metadata: no stream headers shown
- Very wide zoom out: labels may overlap — show only generation numbers at low zoom

---

## REQ-027: Edge Hover Tooltips

Hovering over an edge on the canvas shows a tooltip with the relationship type and note.

**Preconditions:**
- Graph is rendered with edges (REQ-009)

**Trigger:**
- User hovers the mouse within proximity of an edge line on the canvas

**Expected Behavior:**
- A tooltip appears near the cursor showing the edge type label and the edge note (if present)
- The hovered edge is visually highlighted

**Acceptance Criteria:**
- [ ] AC-027-01: Mouse proximity within 8px of an edge line triggers the tooltip
- [ ] AC-027-02: Tooltip shows the edge type as a human-readable label (e.g., "Teacher → Pupil")
- [ ] AC-027-03: Tooltip shows the edge note below the type label if present
- [ ] AC-027-04: Tooltip is styled with a semi-transparent dark background and light text
- [ ] AC-027-05: The hovered edge is drawn thicker (2px) and at full opacity
- [ ] AC-027-06: Tooltip follows the cursor position
- [ ] AC-027-07: Moving away from the edge hides the tooltip
- [ ] AC-027-08: Edge hover works in all view modes

**Edge Cases:**
- Multiple overlapping edges: show tooltip for the nearest edge
- Edge with no note: tooltip shows only the type label
- Edge hover while a node is also near the cursor: node hover takes priority

---

## REQ-028: State Persistence

The user's work (notes, node positions, view state) persists across page reloads.

**Preconditions:**
- Graph is loaded and user has made edits

**Trigger:**
- Automatic on every edit; restored on page load

**Expected Behavior:**
- Notes, added nodes, added edges, and node positions are saved to localStorage
- On reload, the saved state is merged with the base graph data
- A "Reset" button clears saved state and reloads from the original source

**Acceptance Criteria:**
- [ ] AC-028-01: Notes edits are saved to localStorage within 1 second of change
- [ ] AC-028-02: Added nodes and edges are saved to localStorage
- [ ] AC-028-03: Node positions (fx/fy from drag) are saved to localStorage
- [ ] AC-028-04: Current view mode is saved to localStorage
- [ ] AC-028-05: On page reload, saved state is loaded and applied to the graph
- [ ] AC-028-06: A "Reset" button in the toolbar clears all saved state
- [ ] AC-028-07: The localStorage key is namespaced by graph title to support multiple graphs
- [ ] AC-028-08: Corrupted localStorage data is handled gracefully (ignored, not crash)

**Edge Cases:**
- localStorage full: graceful degradation, warn user
- Graph structure changed (new source file) but old state exists: merge what matches, discard what doesn't

---

## REQ-029: Visual Accessibility

The visualization meets accessibility standards for color, contrast, and readability.

**Preconditions:**
- Graph is rendered

**Trigger:**
- Always applies

**Acceptance Criteria:**
- [ ] AC-029-01: All text meets WCAG AA contrast ratio (4.5:1) against its background
- [ ] AC-029-02: Edge note text in the detail panel uses color `#aaa` or lighter (not `#666`)
- [ ] AC-029-03: Stream colors use a colorblind-safe palette with luminance variation (not just hue)
- [ ] AC-029-04: Edge styles (solid/dashed/dotted) are distinguishable at all zoom levels, reinforced by color differences
- [ ] AC-029-05: The detail panel width is at least 400px to accommodate relationship note text
- [ ] AC-029-06: Node labels scale proportionally with zoom (larger at high zoom, not clamped at 13px)
