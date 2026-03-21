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

## Canvas Interaction & Export

### REQ-060: Zoom Controls
Canvas overlay provides zoom in, zoom out, and fit-to-view buttons.

**AC-060-01**: Canvas overlay shows +, -, Fit buttons in the top-right corner.
**AC-060-02**: + button zooms in 1.5x centered on canvas center with 300ms animation.
**AC-060-03**: - button zooms out 0.67x centered on canvas center with 300ms animation.
**AC-060-04**: Fit button calls existing fitToView function.
**AC-060-05**: Shift+drag marquee zoom still works (existing feature, unchanged).

### REQ-061: Organic Look-and-Feel
A look-and-feel setting independent of color theme controls rendering style. Can be combined with any theme.

**AC-061-01**: Look-and-feel is a separate setting ("formal" or "organic"), stored in localStorage, not tied to any theme.
**AC-061-02**: The Settings modal has a Look & Feel toggle (Formal / Organic).
**AC-061-03**: An "Organic" color theme exists with warm earth tones (usable with either look).
**AC-061-04**: Organic look uses subtly jittered paths for hand-drawn shapes that remain recognizable.
**AC-061-05**: Organic edges use quadratic bezier curves with taper (thicker at source, thinner at target).
**AC-061-06**: Jitter is deterministic per node (based on node ID hash), stable across redraws.
**AC-061-07**: Formal look renders with precise geometry (unchanged from current behaviour).
**AC-061-08**: Auto-fit only runs on initial layout, not after user zoom/pan interaction.

### REQ-062: Image Export (PNG/PDF)
Export the current canvas view as PNG or PDF with configurable background.

**AC-062-01**: Export Image button in the activity bar opens an export modal.
**AC-062-02**: Modal offers format options: PNG and PDF.
**AC-062-03**: Modal offers background options: "As viewed" (current theme bg) or custom color picker.
**AC-062-04**: Modal offers resolution options: 1x and 2x (retina).
**AC-062-05**: Export captures the current canvas state (respects filters, zoom, selection).
**AC-062-06**: PNG export creates an off-screen canvas and triggers blob download.
**AC-062-07**: PDF export uses jsPDF to create a single-page PDF with the canvas image.
**AC-062-08**: Download triggers via blob URL with appropriate filename.

## Network Analysis

### REQ-063: Network Analysis Engine
Pure computation module providing graph metrics across three levels: node, path, and group.

**AC-063-01**: Degree centrality ("Connections") computed for all nodes, normalized 0–1.
**AC-063-02**: Betweenness centrality ("Bridge Score") uses Brandes' BFS algorithm.
**AC-063-03**: Closeness centrality ("Reach") measures average distance to all reachable nodes.
**AC-063-04**: Eigenvector centrality ("Influence") uses power iteration (max 100 iterations, 1e-6 tolerance).
**AC-063-05**: Community detection via label propagation (max 50 iterations).
**AC-063-06**: Modularity score (Newman's Q) computed for detected communities.
**AC-063-07**: Shortest path between any two nodes via BFS, returning all shortest paths.
**AC-063-08**: K-core decomposition identifies nested connectivity shells.
**AC-063-09**: Path fragility identifies the edge whose removal most increases distance between two nodes.
**AC-063-10**: Graph density and network diameter computed as overview metrics.

### REQ-064: Analysis Panel
Slide-out panel accessible from the activity bar showing analysis results.

**AC-064-01**: Analysis button in activity bar toggles the panel open/closed.
**AC-064-02**: Overview section shows: node count, edge count, density, avg degree, diameter, modularity, community count.
**AC-064-03**: Node Rankings table with columns: Name, Connections, Bridge Score, Influence, Reach. Sortable by each column.
**AC-064-04**: Communities section lists detected communities with member count and color dot.
**AC-064-05**: Community color overlay toggle colors nodes by community assignment.
**AC-064-06**: Path Finder with from/to node selectors, Find Path button, and path result display.
**AC-064-07**: Path result shows: distance, route count, weakest link, and the path chain as clickable nodes.

### REQ-065: Analysis Canvas Integration
Canvas rendering integrates with analysis results for visual feedback.

**AC-065-01**: Shortest path highlighted on canvas with distinct orange color and thicker line.
**AC-065-02**: Community overlay replaces stream colors with community-assigned colors.
**AC-065-03**: Highlighted community dims nodes not in that community (alpha 0.2).
**AC-065-04**: Edges between non-community nodes are greyed out (alpha 0.08, thin).
**AC-065-05**: Bridge edges (one endpoint in community, one outside) are semi-dimmed (alpha 0.25).
**AC-065-06**: Clicking a community name in the panel focuses the view on that community's members.
