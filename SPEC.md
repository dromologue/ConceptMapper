# Concept Mapper Specification

> Parse structured taxonomy markdown into a typed Graph IR; render as an interactive force-directed map.

**Note (2026-03-21):** The parser is now fully generic. References to hardcoded "ThinkerNode", "ConceptNode", `thinker_fields`, `concept_fields`, `EdgeCategory`, and `EdgeType` enum in REQ-003 through REQ-007 are superseded by the generic-only model (REQ-046 in `specs/ui-features.md`). All nodes are parsed as `GenericNode` with user-defined fields. All edge types are free-form strings. The canonical test file is `examples/organisational-learning.cm`.

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
- [ ] AC-001-09: The lexer processes the full `examples/organisational-learning.cm` example without panic

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
- [ ] AC-007-08: Edge `weight` field serialized as float

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

> **REMOVED** (architecture cleanup, 2026-04-02): The `NodeContent` and `ConnectionProse`
> structs were never populated by the parser — always set to `None`. The `content` field
> has been removed from the Node IR. If rich content is needed in the future, it should be
> re-introduced with an actual parsing/extraction pipeline that populates the fields.

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
- [x] AC-018-16: Undo (Ctrl/Cmd+Z) reverts the last edit operation
- [x] AC-018-17: Redo (Ctrl/Cmd+Shift+Z) reapplies the last undone operation
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
- User selects File > Export Image (⌘E) from the menu bar, or clicks "Export Image" in the toolbar

**Expected Behavior:**
- In the macOS app, NSSavePanel is presented for the user to choose the save location
- The current canvas state (including current zoom, pan, visible nodes, and cluster state) is exported as a PNG image
- The image resolution is suitable for printing or embedding in documents

**Acceptance Criteria:**
- [ ] AC-019-01: "Export Image" is available via File > Export Image menu (⌘E) and as a toolbar button
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
- User selects File > Export Markdown (⇧⌘E) from the menu bar, or clicks "Download File" in the toolbar

**Expected Behavior:**
- In the macOS app, NSSavePanel is presented for the user to choose the save location
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
- [x] AC-023-12: Undo button (with Ctrl/Cmd+Z shortcut)
- [x] AC-023-13: Redo button (with Ctrl/Cmd+Shift+Z shortcut)
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

## REQ-025: File Open

The user can open taxonomy files or graph JSON files into the visualization via the native macOS File menu.

**Preconditions:**
- App is loaded, WASM parser is initialized

**Trigger:**
- User selects File > Open (⌘O) from the menu bar, or clicks "Import" in the toolbar

**Expected Behavior:**
- macOS NSOpenPanel is presented, filtered to `.cm` concept map files
- `.md` files are parsed in-browser via the Rust WASM parser
- `.json` files are loaded directly as Graph IR
- The imported data replaces the current graph
- Parse errors and warnings are shown to the user

**Acceptance Criteria:**
- [ ] AC-025-01: File > Open menu item (⌘O) is available in the macOS menu bar
- [ ] AC-025-02: NSOpenPanel filters to `.cm` concept map files
- [ ] AC-025-03: `.md` files are parsed via the bundled WASM parser (no network required)
- [ ] AC-025-04: `.json` files are loaded directly as Graph IR (validated against expected structure)
- [ ] AC-025-05: Invalid files show an error message without crashing the app
- [ ] AC-025-06: Successfully opened graph replaces the current visualization
- [ ] AC-025-07: The graph title, node count, and edge count update in the header
- [ ] AC-025-08: Parse warnings from the WASM parser are logged to the console

**Edge Cases:**
- Empty JSON file: shows error "No data found"
- JSON with missing required fields: shows specific validation error
- Very large file (1000+ nodes): imported without freezing (async processing with loading indicator)
- Malformed markdown: parser returns errors which are displayed to the user

---

## REQ-026: Attribute-Based Sidebar Filtering

The sidebar provides unified filtering across streams, generations, and all select-type fields defined in template node type configs. Filtering HIDES nodes (not dims). Filter sections and values are built dynamically from template config and graph data.

**Preconditions:**
- Graph is rendered (REQ-009)
- Node type configs are loaded (from template or defaults)

**Trigger:**
- User clicks filter items in the sidebar's filter sections

**Expected Behavior:**
- Sidebar displays filter sections for: streams (using template stream_label), generations (using template generation_label), and one section per select-type field from node type configs
- Filter values are the union of template-defined options and actual values in graph data
- Clicking a value toggles it: first click isolates to that value, subsequent clicks add/remove values
- Between filter categories: AND logic (must pass all)
- Within a category: OR logic (match any selected value)
- Attribute filters are scoped per node type via composite key (`nodeType.fieldKey`) — nodes of other types are unaffected
- Filtered-out nodes are hidden from both the canvas and the sidebar node list
- Edges auto-hide when both endpoints are hidden
- Hidden nodes remain in the force simulation (layout stability)
- "Show All" button appears when any filter is active, resets all filters

**Acceptance Criteria:**
- [ ] AC-026-01: Sidebar displays a streams filter section using template `stream_label` (or "Streams" default)
- [ ] AC-026-02: Sidebar displays a generations filter section using template `generation_label` (or "Generations" default)
- [ ] AC-026-03: Sidebar dynamically creates filter sections for each select-type field in node type configs
- [ ] AC-026-04: Filter values include both template-defined options and values present in graph data
- [ ] AC-026-05: All values shown (unfiltered) by default — `createEmptyFilterState()` returns null for all categories
- [ ] AC-026-06: Clicking a value when no filter is active isolates to that value (creates a Set with one item)
- [ ] AC-026-07: Clicking additional values adds them to the active set (OR within category)
- [ ] AC-026-08: Clicking an active value removes it; if set becomes empty, filter resets to null (all shown)
- [ ] AC-026-09: Nodes failing any active filter are hidden from the canvas (not dimmed)
- [ ] AC-026-10: Nodes failing any active filter are hidden from the sidebar node list
- [ ] AC-026-11: Edges between two hidden nodes are hidden
- [ ] AC-026-12: Attribute filters only apply to nodes matching the filter's node type (composite key scoping)
- [ ] AC-026-13: "Show All" button visible only when `isFilterActive(filters)` returns true
- [ ] AC-026-14: "Show All" resets all filters (streams, generations, attributes) to empty state
- [ ] AC-026-15: Filter state is preserved across view mode changes
- [ ] AC-026-16: `isNodeFilterVisible` is a pure function testable without DOM
- [ ] AC-026-17: Nodes with no value for a filtered property are hidden when that filter is active
- [ ] AC-026-18: Text fields with ≤30 unique values in data are shown as discrete filter sections (same chip UI as select fields)
- [ ] AC-026-19: Text fields with >30 unique values are excluded (too many for discrete filtering)
- [ ] AC-026-20: Textarea fields are always excluded from filter sections
- [ ] AC-026-21: Empty graph renders no filter sections
- [ ] AC-026-22: Filter sections are collapsible with chevron toggle
- [ ] AC-026-23: Date range filter appears for node types with `date_from`/`date_to` fields
- [ ] AC-026-24: Date range filter has From/To year inputs with min/max placeholders from data
- [ ] AC-026-25: Date range filter hides nodes whose start year is before the From value
- [ ] AC-026-26: Date range filter hides nodes whose end year is after the To value
- [ ] AC-026-27: Date range filter hides nodes with no date value when filter is active
- [ ] AC-026-28: Date range filter only applies to matching node types (composite key scoping)
- [ ] AC-026-29: Date values are parsed from strings like "1923", "b. 1947", "~1930" (extracts 4-digit year)
- [ ] AC-026-30: Default labels are "Phases" (not "Generations") and use template `generation_label` when set
- [ ] AC-026-31: Hidden nodes cannot be clicked on the canvas (`findNodeAt` respects filters)
- [ ] AC-026-32: Loading a new file resets all filters to empty state
- [ ] AC-026-33: Filter discovery is data-driven — scans actual node properties, not just config fields
- [ ] AC-026-34: Properties with keys not in config appear as filters (using formatted key as label)
- [ ] AC-026-35: `exportToMarkdown` writes all properties with `key: value` colon format (not space-padded)
- [ ] AC-026-36: `normalizeFencedKV` pre-processor converts `key    value` lines to `key: value` inside fences
- [ ] AC-026-37: First click on a filter value unchecks it (excludes), not isolates
- [ ] AC-026-38: Re-checking all values in a category resets filter to null (all shown)
- [ ] AC-026-39: Saved templates include `format_instructions` field for LLM compatibility
- [ ] AC-026-40: Date range filter uses native date picker (`<input type="date">`)

**Edge Cases:**
- Node has no value for a filtered select field → hidden (excluded from filter)
- Same field name on different node types → separate filter sections via composite key
- Text fields with many unique values (>30) → excluded from filters
- All values removed from a filter → filter resets to null (all shown), not empty set
- Date range with only From set → filters by lower bound only
- Date range with only To set → filters by upper bound only
- Node with "b. 1947" in date_from → parsed as year 1947
- Properties exported without colons → normalizeFencedKV fixes on reload
- ISO dates (2026-03-15), month strings (2026-03), year-only (1923) all work in date range filter

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

The user's work persists via two mechanisms: theme/colour preferences in localStorage, and graph edits auto-saved back to the source .cm file.

**Preconditions:**
- Graph is loaded from a .cm file via the native macOS file dialog

**Trigger:**
- Theme/colour changes: persisted to localStorage immediately
- Graph edits (nodes, edges, notes): debounce-saved to source .cm file after 2 seconds

**Expected Behavior:**
- Theme selection persists in `localStorage` key `cm-theme-id`
- Stream and edge colour overrides persist in `cm-stream-colors` and `cm-edge-colors`
- Graph data changes are exported as markdown and written back to the source file path via Swift bridge `saveToPath`
- A "Saved" indicator appears briefly in the header after auto-save

**Acceptance Criteria:**
- [ ] AC-028-01: Theme ID persists to localStorage key `cm-theme-id`
- [ ] AC-028-02: Edge colour overrides persist to localStorage key `cm-edge-colors`
- [ ] AC-028-03: Stream colour overrides persist to localStorage key `cm-stream-colors`
- [ ] AC-028-04: Graph edits auto-save to the source .cm file after 2-second debounce
- [ ] AC-028-05: "Saved" indicator appears in header and fades after 2 seconds
- [ ] AC-028-06: Corrupted localStorage data is handled gracefully (defaults to empty)

**Edge Cases:**
- No source file path (browser-only mode): auto-save skipped, manual export still works
- localStorage unavailable: theme defaults to midnight, no crash

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

---

## REQ-030: Inline Attribute Editing

All node attributes are editable directly in the detail panel via an edit mode toggle. Changes immediately update the in-memory IR and are reflected in the visualization and exports.

**Preconditions:**
- A node is selected and the detail panel is open (REQ-010)

**Trigger:**
- User clicks "Edit" toggle in the detail panel

**Expected Behavior:**
- All read-only field values become editable controls (text inputs for strings, dropdowns for enums, number inputs for integers)
- Changes take effect immediately (no save button needed)
- Clicking "Edit" again returns to read-only view
- Enum fields are constrained to valid values via dropdowns

**Acceptance Criteria:**

*Thinker Fields:*
- [ ] AC-030-01: `name` is editable as text input
- [ ] AC-030-02: `dates` is editable as text input
- [ ] AC-030-03: `eminence` is editable as dropdown (dominant, major, secondary, minor)
- [ ] AC-030-04: `generation` is editable as dropdown of available generations
- [ ] AC-030-05: `stream` is editable as dropdown of available streams
- [ ] AC-030-06: `structural_role` is editable as multi-select or comma-separated text
- [ ] AC-030-07: `active_period` is editable as text input
- [ ] AC-030-08: `institutional_base` is editable as text input

*Concept Fields:*
- [ ] AC-030-09: `name` is editable as text input
- [ ] AC-030-10: `originator_id` is editable as dropdown of existing thinker nodes
- [ ] AC-030-11: `concept_type` is editable as dropdown (framework, principle, distinction, mechanism, prescription, synthesis)
- [ ] AC-030-12: `abstraction_level` is editable as dropdown (concrete, operational, theoretical, meta-theoretical)
- [ ] AC-030-13: `status` is editable as dropdown (active, absorbed, contested, dormant, superseded)
- [ ] AC-030-14: `generation` is editable as dropdown
- [ ] AC-030-15: `stream` is editable as dropdown

*Edit State:*
- [ ] AC-030-16: An "Edit" toggle button is visible in the detail panel header
- [ ] AC-030-17: In edit mode, field labels are accompanied by their input controls
- [ ] AC-030-18: Changes are applied to the in-memory IR immediately (no save button)
- [ ] AC-030-19: Changes are reflected in the canvas rendering (e.g., changing eminence changes node size)
- [ ] AC-030-20: Changes are included in file export (REQ-020)

**Edge Cases:**
- Changing a node's stream changes its color on the canvas
- Changing eminence from dominant to minor shrinks the node immediately
- Editing name updates the canvas label immediately

---

## REQ-031: Center on Node

Selecting a node (via search, connection click, or canvas click) pans the canvas to center on that node.

**Preconditions:**
- Graph is rendered, a node is selected

**Trigger:**
- Node is selected via any mechanism

**Expected Behavior:**
- The canvas smoothly pans to center the selected node in the viewport

**Acceptance Criteria:**
- [ ] AC-031-01: Clicking a node in the canvas centers the view on that node
- [ ] AC-031-02: Clicking a connection link in the detail panel centers on the navigated-to node
- [ ] AC-031-03: Selecting a search result centers on the matched node
- [ ] AC-031-04: Centering uses a smooth animation (300ms transition)
- [ ] AC-031-05: If the node is already centered, no animation occurs

---

## REQ-032: Network Summary Panel

A summary panel shows network-level metadata: structural observations, external shocks, and network statistics.

**Preconditions:**
- Graph IR contains metadata (structural_observations, external_shocks, network_stats)

**Trigger:**
- User clicks an "Info" or "Summary" button in the toolbar

**Expected Behavior:**
- A panel displays the network's structural observations, external shocks, and statistics
- The panel is dismissible

**Acceptance Criteria:**
- [ ] AC-032-01: An "Info" button is visible in the toolbar
- [ ] AC-032-02: Clicking "Info" opens a summary panel overlaying the canvas
- [ ] AC-032-03: The panel shows network title and description
- [ ] AC-032-04: Structural observations are listed as bullet points
- [ ] AC-032-05: External shocks are listed with dates
- [ ] AC-032-06: Network stats (node count, edge count) are shown
- [ ] AC-032-07: The panel is dismissible via a close button or clicking outside

---

## REQ-033: macOS File Menu

The macOS app provides a native File menu with Open, Save As, Export Image, and Export Markdown commands.

**Preconditions:**
- App is running

**Trigger:**
- User accesses the File menu or uses keyboard shortcuts

**Expected Behavior:**
- File > Open (⌘O): Opens NSOpenPanel for .cm files, content sent to WKWebView via Swift→JS bridge
- File > Save As (⌘S): Requests current graph JSON from JS, presents NSSavePanel
- File > Export Image (⌘E): Requests canvas data URL from JS, presents NSSavePanel for PNG
- File > Export Markdown (⇧⌘E): Requests markdown from JS, presents NSSavePanel for .md

**Acceptance Criteria:**
- [ ] AC-033-01: File menu contains Open, Save As, Export Image, Export Markdown items
- [ ] AC-033-02: Each menu item has a keyboard shortcut
- [ ] AC-033-03: Open presents NSOpenPanel filtered to .cm
- [ ] AC-033-04: Save As presents NSSavePanel with .json extension
- [ ] AC-033-05: Export Image presents NSSavePanel with .png extension
- [ ] AC-033-06: Export Markdown presents NSSavePanel with .md extension
- [ ] AC-033-07: All file operations work within the App Sandbox (user-selected files only)

---

## REQ-034: macOS App Lifecycle

The macOS app manages window lifecycle, quit handling, and App Store sandboxing requirements.

**Preconditions:**
- App is built and signed for macOS

**Expected Behavior:**
- App quits when the last window is closed
- App is sandboxed with minimal entitlements (user-selected file access only)
- No network entitlements — the app is fully offline
- App supports macOS 14.0 (Sonoma) and later

**Acceptance Criteria:**
- [ ] AC-034-01: App terminates when the last window is closed
- [ ] AC-034-02: App sandbox is enabled with com.apple.security.app-sandbox
- [ ] AC-034-03: Only com.apple.security.files.user-selected.read-write entitlement is present
- [ ] AC-034-04: No network-related entitlements
- [ ] AC-034-05: Minimum deployment target is macOS 14.0
- [ ] AC-034-06: WKWebView loads bundled HTML/JS/WASM from the app bundle (file:// protocol)
- [ ] AC-034-07: Info.plist declares .cm as supported document types

---

## REQ-035: Responsive Canvas Resize

The graph canvas redraws correctly when the window is resized, with no rendering artifacts.

**Preconditions:**
- Graph is rendered in an HTML canvas via D3 force simulation
- Canvas is observed by a ResizeObserver

**Expected Behavior:**
- On window resize, canvas clears fully (no ghost shadows from stale dimensions)
- Simulation forces (forceX, forceY) recalculate targets for the new dimensions
- Simulation reheats to animate nodes to new positions
- Stream colors display correctly using hex values parsed from named colors

**Acceptance Criteria:**
- [ ] AC-035-01: Tick and zoom callbacks read dimensions from refs, not closure-captured values
- [ ] AC-035-02: resizeCanvas() updates forceX and forceY with recalculated stream/generation positions
- [ ] AC-035-03: resizeCanvas() reheats the simulation (alpha > 0) so nodes animate to new layout
- [ ] AC-035-04: Dragging a node after resize produces no ghost/shadow trail
- [ ] AC-035-05: Stream IDs in parsed stream table have backticks stripped (`` `mgmt` `` → `mgmt`)
- [ ] AC-035-06: Named colors in stream table are normalized to hex (Blue → #4A90D9, Amber → #E6A23C, etc.)

---

## REQ-036: Theme System

The application supports predefined color themes and user-customizable stream/edge colors, affecting both CSS-styled UI panels and canvas-rendered graph elements.

**Preconditions:**
- React SPA is rendered
- `ThemeConfig` interface defines all color tokens for both CSS and canvas

**Trigger:**
- App mounts (loads saved theme from localStorage)
- User selects a theme in the Settings modal
- User customizes stream or edge colors

**Expected Behavior:**
- CSS custom properties are injected on `:root` from the active `ThemeConfig`
- Canvas drawing uses `ThemeConfig` color fields via a `themeRef`
- Stream color overrides take precedence over data-defined colors in both canvas and legend
- Edge color overrides take precedence over edge visual defaults
- All settings persist across sessions via `localStorage`

**Acceptance Criteria:**
- [ ] AC-036-01: `ThemeConfig` interface has all required UI chrome and canvas color fields
- [ ] AC-036-02: 6 predefined themes exist: midnight, obsidian, solarized, nord, ivory, paper
- [ ] AC-036-03: `getThemeById` returns the correct theme or defaults to midnight
- [ ] AC-036-04: Midnight theme exactly matches original hardcoded colors (#1a1a2e, #16213e, #4A90D9, etc.)
- [ ] AC-036-05: Light themes (ivory, paper) have light backgrounds and dark text
- [ ] AC-036-06: Default theme is midnight when no localStorage value exists
- [ ] AC-036-07: Theme switches immediately when `setThemeId` is called
- [ ] AC-036-08: Selected theme ID persists to `localStorage` key `cm-theme-id`
- [ ] AC-036-09: Theme restores from `localStorage` on mount
- [ ] AC-036-10: CSS custom properties (--bg-body, --bg-panel, --accent, etc.) update on `:root` when theme changes
- [ ] AC-036-11: Edge color overrides persist to `localStorage` key `cm-edge-colors`
- [ ] AC-036-12: Stream color overrides persist to `localStorage` key `cm-stream-colors`
- [ ] AC-036-13: Color overrides restore from `localStorage` on mount
- [ ] AC-036-14: All ~50 hardcoded color values in App.css are replaced with `var(--name, fallback)` syntax
- [ ] AC-036-15: GraphCanvas accepts a `theme: ThemeConfig` prop and uses it for all drawing colors
- [ ] AC-036-16: `getStreamColor` checks `streamColorOverrides` before data-defined colors

**Edge Cases:**
- Invalid theme ID in localStorage: defaults to midnight
- Malformed JSON in color override keys: defaults to empty object `{}`

---

## REQ-037: Settings Modal

A settings modal allows users to switch themes and customize stream/edge colors.

**Preconditions:**
- ThemeProvider wraps the app and provides theme context
- Graph data is loaded (streams and edge types available)

**Trigger:**
- User clicks the gear icon (⚙) in the toolbar

**Expected Behavior:**
- Modal opens with three sections: Theme picker, Stream colors, Edge type colors
- Theme picker shows a grid of 6 swatches; clicking one switches the theme immediately
- Stream colors section shows each stream with a color picker and optional reset button
- Edge type colors section shows each edge type with a color picker and optional reset button
- Changes apply instantly to both CSS-styled UI and canvas rendering
- Clicking the overlay or close button dismisses the modal

**Acceptance Criteria:**
- [ ] AC-037-01: Settings modal renders with "Settings" title
- [ ] AC-037-02: All 6 theme swatches are displayed (Midnight, Obsidian, Solarized Dark, Nord, Ivory, Paper)
- [ ] AC-037-03: Active theme swatch has the `.theme-swatch-active` class
- [ ] AC-037-04: Clicking a theme swatch switches the active theme
- [ ] AC-037-05: Stream colors section lists all streams with color pickers
- [ ] AC-037-06: Edge type colors section lists all edge types with color pickers
- [ ] AC-037-07: Close button (`×`) calls `onClose`
- [ ] AC-037-08: Clicking the modal overlay calls `onClose`
- [ ] AC-037-09: Toolbar renders a settings gear button when `onOpenSettings` prop is provided
- [ ] AC-037-10: Toolbar does not render settings button when `onOpenSettings` is omitted
- [ ] AC-037-11: Clicking the gear button calls `onOpenSettings`

**Edge Cases:**
- No streams loaded: Stream colors section hidden
- No edge types: Edge type colors section hidden
- Clicking inside the modal does not trigger overlay close (event propagation stopped)

---

## REQ-038: Notes Editor Enter Key Fix

The contentEditable inline markdown notes editor handles Enter key correctly without cursor jumps or extra whitespace.

**Preconditions:**
- Node is selected and Notes pane is open
- Editor uses `contentEditable` div with `highlightMarkdown()` rendering

**Trigger:**
- User presses Enter in the notes editor

**Expected Behavior:**
- Browser's default Enter behavior inserts a line break naturally
- Re-render is debounced to 500ms (same as normal typing), not 100ms
- Text extraction normalizes `\n\n\n+` runs from empty `<div><br></div>` elements back to `\n\n`
- No cursor jump or extra whitespace after Enter

**Acceptance Criteria:**
- [ ] AC-038-01: Enter key handler debounces re-render to 500ms (matching normal input debounce)
- [ ] AC-038-02: `extractMarkdown()` collapses runs of 3+ newlines to double newline
- [ ] AC-038-03: Inline editor uses contentEditable div (not textarea)
- [ ] AC-038-04: Inline editor has `contenteditable="true"` attribute

---

## REQ-039: Notes Persistence to Source File

Notes and other graph edits are auto-saved back to the source file via the Swift bridge.

**Preconditions:**
- File was opened through the native macOS file dialog
- Full file path was passed from Swift to JS on open

**Trigger:**
- Any graph data change (node edit, edge add, notes edit)

**Expected Behavior:**
- Changes are debounce-saved (2 second delay) as JSON to the source file path
- Overwrites the source `.cm` file in place with the exported markdown
- A subtle "Saved" indicator appears in the header and fades after 2 seconds
- `saveToPath` Swift bridge message writes content to disk without showing a dialog

**Acceptance Criteria:**
- [ ] AC-039-01: `FileHandler.openFile` passes full path (`url.path`) alongside filename to completion handler
- [ ] AC-039-02: `WebViewBridge.loadFileContent` accepts optional `filePath` parameter and passes to JS
- [ ] AC-039-03: JS `loadFileContentBase64` bridge function accepts optional `filePath` parameter
- [ ] AC-039-04: `FileHandler.saveToPath(content:path:)` writes content to disk atomically
- [ ] AC-039-05: `saveToPath` message handler registered in `WKUserContentController`
- [ ] AC-039-06: Auto-save debounces at 2 seconds after graph data changes
- [ ] AC-039-07: Save indicator shows "Saved" text that fades after 2 seconds

---

## REQ-071: CI/CD Pipeline

Automated testing runs on every push and pull request to the master branch.

**Expected Behavior:**
- GitHub Actions workflow runs Rust tests and web tests in parallel
- Rust job: `cargo test --all`
- Web job: `npm ci`, `npm run lint`, `npm test`, `npm run build`

**Acceptance Criteria:**
- [x] AC-071-01: `.github/workflows/ci.yml` exists with push/PR triggers on master
- [x] AC-071-02: Rust job runs `cargo test --all` on ubuntu-latest
- [x] AC-071-03: Web job runs lint, test, and build in `web/` directory
- [x] AC-071-04: Web job uses Node 20 with npm cache

---

## REQ-072: Error Boundary

A React error boundary catches rendering errors and displays a recovery UI instead of a white screen.

**Expected Behavior:**
- Unhandled errors in the component tree show a "Something went wrong" message
- A "Reload" button restarts the application
- Errors are logged to console for debugging

**Acceptance Criteria:**
- [x] AC-072-01: `ErrorBoundary` component wraps `AppInner` in the component tree
- [x] AC-072-02: Child rendering errors display fallback UI with error message
- [x] AC-072-03: "Reload" button calls `window.location.reload()`
- [x] AC-072-04: `componentDidCatch` logs error and component stack to console

---

## REQ-073: Unified Property Model

Graph nodes use a single `properties` field for all custom data. The legacy `fields` property from the Rust parser output is converted to `properties` during migration.

**Expected Behavior:**
- `GraphNode` type has only `properties` (no `fields`)
- WASM parser output (which uses Rust's `fields`) is converted by `migrateFromParser()`
- All components read from `node.properties`

**Acceptance Criteria:**
- [x] AC-073-01: `GraphNode` interface has no `fields` property
- [x] AC-073-02: `migrateFromParser()` converts `fields` → `properties` via `RawParsedNode` cast
- [x] AC-073-03: `GraphCanvas` node sync uses only `properties`
- [x] AC-073-04: All existing tests pass with unified model

---

## REQ-074: Typed Filter State

Filter state uses typed objects instead of composite string keys for attribute and date range filters.

**Expected Behavior:**
- `AttributeFilter` objects have `nodeType`, `field`, and `values` properties
- `DateRangeFilter` objects have `nodeType`, `fromField`, `toField`, and `range` properties
- No composite key string parsing at runtime

**Acceptance Criteria:**
- [x] AC-074-01: `FilterState.attributes` is `AttributeFilter[]` (not `Map<string, Set>`)
- [x] AC-074-02: `FilterState.dateRanges` is `DateRangeFilter[]` (not `Map<string, DateRange>`)
- [x] AC-074-03: `isNodeFilterVisible()` iterates typed arrays without string splitting
- [x] AC-074-04: Sidebar passes structured objects to filter callbacks

---

## REQ-075: Zustand State Management

Application state is organized into domain-specific Zustand stores for testability and separation of concerns.

**Expected Behavior:**
- `useUIStore`: modal state, panel visibility, search, dimensions, canvas controls
- `useGraphStore`: graph data, selection, interaction mode, filters, mutations, undo/redo
- `useAnalysisStore`: network analysis, path finding, community overlay
- `useFileStore`: template, file paths, parser status, native maps

**Acceptance Criteria:**
- [x] AC-075-01: Four Zustand stores exist in `web/src/stores/`
- [x] AC-075-02: `useUIStore` has unified modal state (`activeModal` + `modalData`)
- [x] AC-075-03: `useGraphStore` includes all graph mutation actions with undo/redo
- [x] AC-075-04: Stores are independently testable via `getState()`/`setState()`
- [x] AC-075-05: Store tests cover initial state, mutations, undo/redo, and filter handlers

---

## REQ-076: Declarative GraphCanvas API

GraphCanvas supports declarative props for zoom and fit-to-view actions, replacing imperative ref callbacks.

**Expected Behavior:**
- `fitToViewTrigger` (number): incrementing triggers a fit-to-view
- `zoomAction` ({ action, ts }): triggers zoom in/out
- Legacy `onRegisterFitToView`/`onRegisterZoom` props remain for backward compatibility

**Acceptance Criteria:**
- [x] AC-076-01: `fitToViewTrigger` prop triggers `fitToView()` via useEffect
- [x] AC-076-02: `zoomAction` prop triggers zoom by factor via useEffect
- [x] AC-076-03: Legacy ref-based props still work alongside declarative props

---

## REQ-077: Unified LLM Client Interface

LLM communication uses a polymorphic `LLMClient` interface with implementations for each transport.

**Expected Behavior:**
- `LLMClient` interface with `sendMessage(config, request): Promise<string>`
- `BridgeLLMClient`: Swift WKWebView bridge transport
- `OllamaLLMClient`: Direct HTTP to Ollama API
- `createLLMClient()` factory selects implementation based on environment

**Acceptance Criteria:**
- [x] AC-077-01: `LLMClient` interface defined in `web/src/llm/client.ts`
- [x] AC-077-02: `BridgeLLMClient` sends via Swift bridge with 2-minute timeout
- [x] AC-077-03: `OllamaLLMClient` sends direct HTTP to `/api/chat`
- [x] AC-077-04: `createLLMClient()` returns correct implementation by environment
- [x] AC-077-05: Browser mode rejects non-Ollama providers with descriptive error

---

## REQ-078: Undo/Redo System

Graph edits can be undone and redone via keyboard shortcuts, with a 50-entry history cap.

**Expected Behavior:**
- Every graph mutation (add/delete/update node or edge) pushes the previous state to an undo stack
- Cmd+Z pops the undo stack and pushes current state to redo stack
- Cmd+Shift+Z pops the redo stack
- History is capped at 50 entries to bound memory usage
- Keyboard shortcuts are ignored when focus is in text inputs

**Acceptance Criteria:**
- [x] AC-078-01: `setGraphData` wrapper pushes previous state to undo stack before mutation
- [x] AC-078-02: Cmd+Z restores previous graph state and clears selection
- [x] AC-078-03: Cmd+Shift+Z re-applies undone state
- [x] AC-078-04: History capped at 50 entries (oldest dropped)
- [x] AC-078-05: New mutations clear the redo stack
- [x] AC-078-06: Shortcuts are no-ops when focus is in INPUT/TEXTAREA/SELECT

---

## REQ-079: Rust Parser Safety

The Rust parser avoids `unwrap()` on Option values, using safe destructuring patterns instead.

**Acceptance Criteria:**
- [x] AC-079-01: `parse_single_edge()` uses `if let (Some, Some, Some)` instead of `.unwrap()`

---

## REQ-080: Generic Classifiers

Replace hardcoded streams and generations with generic classifiers. Each template defines its own classification dimensions.

**Expected Behavior:**
- Templates define `classifiers: Classifier[]` instead of `streams`/`generations`
- Each classifier has `id`, `label`, `layout` (x-axis, y-axis, or filter-only), and `values` with optional colors
- First classifier drives node color; any classifier can drive axis layout
- Old templates with streams/generations are auto-converted on load via `getTemplateClassifiers()`
- GraphCanvas uses classifier layout hints for D3 force positioning

**Acceptance Criteria:**
- [x] AC-080-01: `Classifier` and `ClassifierValue` types defined in `graph-ir.ts`
- [x] AC-080-02: `TaxonomyTemplate` has optional `classifiers` field alongside legacy `streams`/`generations`
- [x] AC-080-03: `GraphNode` has `classifiers?: Record<string, string>` field
- [x] AC-080-04: `getTemplateClassifiers()` converts legacy streams/gens to classifier format
- [x] AC-080-05: `populateNodeClassifiers()` fills node classifiers from legacy `stream`/`generation` fields
- [x] AC-080-06: GraphCanvas `getNodeColor()` derives color from first classifier
- [x] AC-080-07: GraphCanvas force layout uses classifier `layout: "x"` / `"y"` hints
- [x] AC-080-08: Sidebar renders classifier filter sections dynamically from template
- [x] AC-080-09: `ClassifierFilter` type in FilterState with `isNodeFilterVisible()` support
- [x] AC-080-10: AddNodeModal renders classifier dropdowns dynamically
- [x] AC-080-11: DetailPanel renders classifier selects for editing

---

## REQ-081: First-Class Tags

Every node can have multiple tags. Tags are filterable in the sidebar with OR semantics.

**Expected Behavior:**
- `GraphNode` has `tags?: string[]`
- Sidebar discovers all unique tags from loaded nodes and renders a Tags filter section
- Tag filter uses OR semantics: node is visible if it has at least one matching tag
- DetailPanel shows a tag editor with pill-style display and add/remove
- AddNodeModal includes a comma-separated tag input

**Acceptance Criteria:**
- [x] AC-081-01: `GraphNode` and `DataNode` have `tags?: string[]` field
- [x] AC-081-02: `FilterState` has `tags: Set<string> | null` (null = all shown)
- [x] AC-081-03: `isNodeFilterVisible()` checks tag filter with OR semantics
- [x] AC-081-04: Sidebar collects unique tags from nodes and renders toggle filter
- [x] AC-081-05: DetailPanel tag editor supports add (Enter/comma) and remove (x button)
- [x] AC-081-06: AddNodeModal includes tag input field
- [x] AC-081-07: Markdown export writes `tags: tag1, tag2, tag3` for nodes with tags

---

## REQ-082: Time Field Type

Node attributes can be date/time values, rendered as date pickers in the UI.

**Acceptance Criteria:**
- [x] AC-082-01: `FieldType` includes `"time"` alongside `"text"`, `"select"`, `"textarea"`
- [x] AC-082-02: DetailPanel renders `<input type="date">` for `"time"` fields
- [x] AC-082-03: TaxonomyWizard offers "Date" in the field type dropdown

---

## REQ-083: Content-Only .cm Export

The `.cm` markdown file contains only content (nodes, edges, observations). Taxonomy structure (classifiers, node types, edge types) lives exclusively in the `.cmt` template file.

**Expected Behavior:**
- `exportToMarkdown()` does not write Generations or Streams tables
- Node blocks use classifier IDs as KV keys (e.g. `category: idea`) instead of `stream:`/`generation:`
- Tags are written as `tags: tag1, tag2, tag3`

**Acceptance Criteria:**
- [x] AC-083-01: Exported `.cm` contains no `## Generations` or `## Streams` sections
- [x] AC-083-02: Node blocks write classifier values using classifier ID as key
- [x] AC-083-03: Node blocks write tags as comma-separated values
- [x] AC-083-04: Node blocks write properties as KV pairs

---

## REQ-084: TaxonomyWizard Classifier Support

The taxonomy wizard uses a unified classifiers step instead of separate streams/generations steps.

**Expected Behavior:**
- Wizard steps: title → node_types → classifiers → edges → review → create
- Classifiers step allows adding/removing classifiers, each with label, layout hint, and values
- First classifier's values show color pickers
- Field type dropdown offers Text, Select, Date (textarea removed)
- `TaxonomyWizardResult` outputs `classifiers: Classifier[]`
- Legacy initialData with streams/generations auto-converted to classifiers

**Acceptance Criteria:**
- [x] AC-084-01: Wizard step sequence is title → node_types → classifiers → edges → review → create
- [x] AC-084-02: Classifiers step renders dynamic classifier cards with values
- [x] AC-084-03: First classifier values show color pickers
- [x] AC-084-04: `TaxonomyWizardResult` has `classifiers` field (no streams/generations)
- [x] AC-084-05: Legacy initialData with streams/generations is converted to classifiers
- [x] AC-084-06: Field type dropdown includes "Date" option, excludes "Textarea"

---

## REQ-085: MCP Server Notification Handling

The MCP server correctly handles JSON-RPC notifications (messages with no `id`).

**Expected Behavior:**
- `notifications/initialized` receives no response (it's a notification, not a request)
- Only requests (with `id`) receive responses
- `initialize` response has properly structured `result` object

**Acceptance Criteria:**
- [x] AC-085-01: `handleRequest` returns `nil` for `notifications/initialized`
- [x] AC-085-02: Run loop skips response for notifications
- [x] AC-085-03: `initialize` result is a valid JSON-RPC object (not a string)
