# UI Features Specification

## Node Collapse (+/- Indicator)

### REQ-040: Node Collapse
Nodes with children (connected via any edge type) display a +/- indicator.
Clicking the indicator toggles collapse state.

**AC-040-01**: Nodes with outgoing directed edges show +/- indicator.
**AC-040-02**: Nodes connected via undirected edges (rivalry, alliance) show +/- indicator on both ends.
**AC-040-03**: Collapsing a node hides children reachable only through that node.
**AC-040-04**: Children with alternate non-collapsed parents remain visible.
**AC-040-05**: Collapse cascades — hiding a parent hides its exclusively-connected subtree.
**AC-040-06**: Collapsed nodes themselves remain visible (showing +).
**AC-040-07**: Collapse state persists through view mode changes within a session.

## Edge Weight / Thickness

### REQ-041: Edge Weight Visualization and Persistence
Edge weight controls line thickness on canvas and is persisted through save/load.

**AC-041-01**: Edge weight range 0.5-4.0 mapped to line width via slider.
**AC-041-02**: Default weight is 1.0.
**AC-041-03**: Weight is written to the .cm markdown file as `weight: N` on the edge.
**AC-041-04**: Rust WASM parser reads weight values in range 0.0-10.0 (not clamped to 0-1).
**AC-041-05**: Weight survives full round-trip: edit → export → parse → render.
**AC-041-06**: dataFromGraphIR preserves edge weight values.

## Dynamic View Modes

### REQ-042: Dynamic View Mode Filters
View modes are derived from node type configs, not hardcoded People/Concepts.

**AC-042-01**: Full view shows all node types.
**AC-042-02**: Each node type with shape "circle" gets its own filtered view.
**AC-042-03**: Each node type with shape "rectangle" gets its own filtered view.
**AC-042-04**: Clicking a node in a filtered view reveals its cross-type connections.

## Edge Types in Wizard

### REQ-043: Edge Type Configuration
Taxonomy wizard allows defining custom edge types.

**AC-043-01**: Edge types can be added in the wizard with id, label, directed flag.
**AC-043-02**: Edge types support color and style (solid, dashed, dotted).
**AC-043-03**: Edge type selection in Add Edge modal shows configured types.

## Help Panel

### REQ-044: In-App Help
Searchable, collapsible help panel accessible via keyboard shortcut or menu.

**AC-044-01**: Help panel displays all help sections with titles.
**AC-044-02**: Search field filters sections by content and tags.
**AC-044-03**: Sections are collapsible accordions.
**AC-044-04**: Close button dismisses the panel.

## LLM Setup Guide

### REQ-045: Guided LLM Configuration
Settings modal provides step-by-step setup for each LLM provider.

**AC-045-01**: Setup steps shown inline for each provider.
**AC-045-02**: Direct link to API key page for Anthropic and OpenAI.
**AC-045-03**: API key format validated with visual feedback (green/amber border).
**AC-045-04**: Friendly error messages for common failures (401, 429, network).
**AC-045-05**: Test Connection disabled until key format is valid.
**AC-045-06**: Ollama setup shows no API key field, just install instructions.

## Edge Click Editing

### REQ-047: Click Edge to Edit
Clicking an edge on the canvas opens a floating popover to edit weight and note.

**AC-047-01**: Clicking an edge shows a popover near the click point.
**AC-047-02**: The popover displays the edge type label (read-only).
**AC-047-03**: A weight slider (0.5–4, step 0.5) adjusts edge line thickness.
**AC-047-04**: A note textarea (debounced 500ms) updates the edge note.
**AC-047-05**: Changes auto-save to the graph data.
**AC-047-06**: The selected edge is highlighted on the canvas.
**AC-047-07**: Popover closes on Escape or click outside.
**AC-047-08**: Selecting an edge deselects any selected node.

## Unified Node Attribute Structure

### REQ-048: Shared Fields with Type-Specific Overrides
The taxonomy wizard defines a single set of shared fields. Each node type can override field labels.

**AC-048-01**: Step 2 Section A defines shared fields (key, label) used by all node types.
**AC-048-02**: Step 2 Section B defines node types (name, shape, icon) with optional label overrides per shared field.
**AC-048-03**: `buildResult()` generates each type's `fields[]` from shared fields with overrides applied.
**AC-048-04**: On load from `initialData`, shared fields are derived from the union of all types' field keys.
**AC-048-05**: Label overrides that match the default label are not stored (blank = use default).
**AC-048-06**: Existing `.cm` files with per-type fields continue to load correctly (backward compat).
**AC-048-07**: NodeTypeConfig includes optional `label_overrides` map in the type definition.

## Start Screen Map Text Button

### REQ-049: Primary Map Text Action
The start screen includes a top-level "Map Text" button when LLM is configured.

**AC-049-01**: "Map Text" button appears in empty-state-actions when LLM is configured.
**AC-049-02**: "Map Text" button does not appear when LLM is not configured.
**AC-049-03**: Clicking "Map Text" opens the MappingModal.

## Edge Types Persisted to Template

### REQ-050: Edge Types Saved
Edge types defined in the wizard are saved to the TaxonomyTemplate and persisted in `.cm` files.

**AC-050-01**: `handleTaxonomyCreate` includes `edge_types` in the new template.
**AC-050-02**: `handleEditTaxonomy` passes `edge_types` to the wizard initial data.
**AC-050-03**: `dataFromGraphIR` includes `edge_types` in the saved `.cm` data.
**AC-050-04**: `handleSaveTemplate` includes `edge_types` in localStorage and native template saves.
**AC-050-05**: `ConceptMapData` type includes optional `edge_types` field.

## Activity Bar Custom Labels

### REQ-051: Dynamic Activity Bar Icons
Activity bar filter buttons display the icon and label from the current template's node type configs.

**AC-051-01**: Each node type button shows `nt.icon ?? nt.label[0]`.
**AC-051-02**: Editing taxonomy and changing node type name/icon updates the activity bar.
**AC-051-03**: The icon round-trips correctly through the wizard (configToWizardNodeTypes → buildResult).

## Graph Layout on File Open

### REQ-052: Graph Fills Canvas
When opening a file, the graph spreads to fill the available canvas area.

**AC-052-01**: Initial node spread scales to canvas dimensions, not a fixed pixel value.
**AC-052-02**: Charge strength (-300) and distanceMax (500) provide adequate repulsion.
**AC-052-03**: After simulation settles, a fit-to-viewport zoom transform centers and scales the graph.
**AC-052-04**: The fit-to-viewport transition is animated (400ms).

## Notes Persistence

### REQ-053: Node Notes Saved Across Sessions
Node notes entered in the NotesPane are persisted in the .cm file and restored on reload.

**AC-053-01**: Notes are written to the .cm file as `notes:` key-value on the node block.
**AC-053-02**: Multiline notes are collapsed to single-line on export (newlines → spaces).
**AC-053-03**: Notes survive full round-trip: edit → auto-save → reload → notes visible.
**AC-053-04**: dataFromGraphIR preserves node notes.
**AC-053-05**: migrateFromParser preserves notes from the Rust parser output.

## Sidebar Uses Template Labels

### REQ-054: Sidebar Section Labels from Template
Sidebar section headers use template-defined labels instead of hardcoded names.

**AC-054-01**: Streams section header uses `template.stream_label` (default: "Streams").
**AC-054-02**: Node list is grouped by node type with full type label as header.
**AC-054-03**: When template labels are customised in the wizard, sidebar updates on save.

## Generic Node & Edge Types

### REQ-046: Generic-Only Node Model
All nodes are parsed as GenericNode. There are no hardcoded node types (thinker, concept, etc.) in the parser. Node types, fields, and validation are defined by user templates (.cmt files).

**AC-046-01**: Only `id` and `name` are required fields for any node.
**AC-046-02**: All other key-value pairs stored in a `fields` BTreeMap.
**AC-046-03**: Nodes appear in the IR with `node_type` extracted from the section header (e.g. "## Thinker Nodes" → type "thinker").
**AC-046-04**: No `thinker_fields`, `concept_fields`, or `edge_category` in the IR — all fields are in the generic `fields` map.
**AC-046-05**: Web migration maps node `fields` to `properties` uniformly for all node types.
**AC-046-06**: Edge types are free-form strings, not an enum. Any string is accepted as an edge type.
**AC-046-07**: The Rust parser has no structural bias toward any specific node or edge type.

### REQ-055: Extended Node Shapes
Node types can use shapes beyond circle and rectangle.

**AC-055-01**: The shape type union includes: `circle`, `rectangle`, `diamond`, `hexagon`, `triangle`, `pill`.
**AC-055-02**: The taxonomy wizard dropdown offers all 6 shape options.
**AC-055-03**: GraphCanvas renders diamond as a rotated square path.
**AC-055-04**: GraphCanvas renders hexagon as a 6-sided regular polygon.
**AC-055-05**: GraphCanvas renders triangle as an equilateral triangle pointing up.
**AC-055-06**: GraphCanvas renders pill as a stadium/rounded rectangle with fully rounded ends.
**AC-055-07**: Hit testing works for all shapes (distance-from-center approximation).

### REQ-056: Per-Type Date Range Filters
Date range filter sections in the sidebar are labeled with their node type name.

**AC-056-01**: Each node type with date fields gets its own date range section (e.g. "Thinker Date Range").
**AC-056-02**: The section label uses the node type config label, not just "Date Range".

### REQ-057: Integration Test with Example Data
The organisational-learning.cm example file serves as the canonical integration test for the parser.

**AC-057-01**: `cargo run -- examples/organisational-learning.cm` parses successfully.
**AC-057-02**: The output contains 61 nodes and 77 edges.
**AC-057-03**: The output has no `thinker_fields`, `concept_fields`, or `edge_category` keys.
**AC-057-04**: All node fields are in the `fields` BTreeMap (deterministic key ordering).
**AC-057-05**: A Rust integration test verifies the example file parses without errors.

## App Store & Build Pipeline

### REQ-058: Unified Build Pipeline
A single build script runs the full test → build → package pipeline.

**AC-058-01**: `scripts/build-app.sh` validates prerequisites (cargo, wasm-pack, npm, xcodebuild, xcodegen).
**AC-058-02**: Pipeline runs `cargo test` and `npm test` before building; fails fast on test failure.
**AC-058-03**: Pipeline builds WASM, React SPA, copies assets, regenerates Xcode project, builds macOS app.
**AC-058-04**: `--skip-tests` flag skips test steps.
**AC-058-05**: `--archive` flag produces .xcarchive for App Store submission.
**AC-058-06**: `--debug` flag builds Debug configuration instead of Release.
**AC-058-07**: `--open` flag opens the built app after successful build.
**AC-058-08**: Code signature is verified at the end of every build.

### REQ-059: App Store Sandboxing & Entitlements
The macOS app runs in App Sandbox with minimum required entitlements.

**AC-059-01**: `com.apple.security.app-sandbox` is enabled.
**AC-059-02**: `com.apple.security.network.client` is enabled (for LLM API calls).
**AC-059-03**: `com.apple.security.files.user-selected.read-write` is enabled (for open/save panels).
**AC-059-04**: Hardened runtime is enabled (`ENABLE_HARDENED_RUNTIME: YES`).
**AC-059-05**: Info.plist includes `NSHumanReadableCopyright` and `LSApplicationCategoryType`.
**AC-059-06**: ExportOptions.plist exists for App Store archive export.
