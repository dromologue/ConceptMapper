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

### REQ-061: Look-and-Feel Options
A look-and-feel setting independent of color theme controls rendering style. Can be combined with any theme. Two options are available: Formal and Mind Map.

**AC-061-01**: Look-and-feel is a separate setting ("formal" or "mindmap"), stored in localStorage, not tied to any theme.
**AC-061-02**: The Settings modal has a Look & Feel toggle (Formal / Mind Map).
**AC-061-03**: Formal look renders with precise geometry — exact circles, sharp rectangles, straight edges.
**AC-061-04**: Mind Map look renders all node shapes as smooth blobs using cubic Bézier splines (Catmull-Rom-to-Bézier conversion for C2-continuous curves).
**AC-061-05**: Mind Map edges use cubic Bézier curves with dramatic taper (3.5× line width at source, 0.15× at target) and subtle S-curve inflection.
**AC-061-06**: Mind Map edge base width is clamped to 80% of the source node radius, preventing edges wider than nodes.
**AC-061-07**: Mind Map arrowheads are hidden — taper direction implies edge directionality.
**AC-061-08**: Mind Map blob wobble (12% radial variation) gives a distinctly hand-drawn character while remaining recognizable.
**AC-061-09**: All rendering uses deterministic seeded random (based on node ID hash), stable across redraws.
**AC-061-10**: Auto-fit only runs on initial layout, not after user zoom/pan interaction.
**AC-061-11**: Unknown or legacy look values in localStorage (e.g. "organic") fall back to "formal".

### REQ-061B: Edge Color Overrides Persisted in Map Files
Edge type colors can be changed via the Settings modal and are saved in the .cm file so they survive round-trips and are per-map rather than global.

**AC-061B-01**: The Settings modal provides a color picker for each edge type present in the current map.
**AC-061B-02**: Edge color overrides are stored as an HTML comment in the .cm file header: `<!-- edge-colors: {...} -->`.
**AC-061B-03**: When a .cm file is loaded, edge color overrides are parsed from the header and applied.
**AC-061B-04**: Changing edge colors in Settings triggers auto-save to the .cm file.
**AC-061B-05**: Color priority at render time: map override → template default → theme default.
**AC-061B-06**: Loading a different map resets edge color overrides to that map's stored colors (or clears them if none).

### REQ-061C: Layout Presets
Three layout presets control the D3 force simulation. Presets configure forces (not absolute positions) so nodes settle naturally. Classifier-based layouts (x/y/region/column) override presets on the axes they claim.

**AC-061C-01**: Layout presets are session-level state (not persisted to .cm files).
**AC-061C-02**: The Activity Bar has a Layout button that opens a popover with three options: Force, Flow, Radial.
**AC-061C-03**: Force layout (default): standard force-directed with weak centering. Unchanged from previous behaviour.
**AC-061C-04**: Flow layout: computes topological depth from directed edges (modified Kahn's algorithm, longest-path semantics). Sources at top, sinks at bottom. Fixed 200px depth gaps, 120px node gaps. Separate connected components arranged in horizontal lanes. Uses `edge.directed` from parsed data; if no edges are directed, treats all edges as directed for flow purposes. Strong forces (Y: 0.8, X: 0.5) pull nodes firmly to computed positions.
**AC-061C-05**: Radial layout: computes degree centrality. Highest-degree nodes at center, lowest at periphery. Fixed 150px ring spacing with golden-angle offset. Weaker charge (-350).
**AC-061C-06**: Both flow and radial use fixed generous spacing in force-space; fitToView zooms the camera to show the full layout after settling.
**AC-061C-07**: Classifier layouts override presets: if a classifier claims X or Y axis, that axis uses the classifier force, not the preset.
**AC-061C-08**: "Reset Classifiers" action in the layout popover clears all classifier layout properties and re-applies the current preset.
**AC-061C-09**: Switching presets triggers a full simulation restart (alpha 0.8) followed by fitToView after 600ms.
**AC-061C-10**: Presets work correctly with exploded mode (scaled virtual canvas).

### REQ-061D: Properties and Notes Toolbar Buttons
The Activity Bar provides direct access to the Properties panel and Notes pane without requiring a node click.

**AC-061D-01**: A Properties button in the Activity Bar toggles the properties panel independently of node selection.
**AC-061D-02**: A Notes button in the Activity Bar toggles the notes pane independently of node selection and the properties panel.
**AC-061D-03**: When the notes pane is open with no selection, a placeholder message is shown.
**AC-061D-04**: Node metrics are only accessible via the Network Analysis panel, not the Properties panel.
**AC-061D-05**: Clicking a node on the canvas selects it (highlight, notes content) but does NOT auto-open the properties panel or notes pane.
**AC-061D-06**: Closing the properties panel does not close the notes pane or deselect the node.

### REQ-061E: Font Size Controls
The zoom controls area includes font size adjustment buttons that scale node and edge labels independently of zoom level.

**AC-061E-01**: A+ and A- buttons in the zoom controls increase/decrease font scale by 0.2 per click.
**AC-061E-02**: Font scale ranges from 0.4x to 3x.
**AC-061E-03**: An A0 reset button appears when font scale is not 1x.
**AC-061E-04**: Font scale is applied to node labels, edge labels, and is a session-level setting (not persisted).
**AC-061E-05**: Font scale is passed to GraphCanvas and applied via a ref for efficient re-rendering.
**AC-061E-06**: Changing font scale updates the collision force with extra padding proportional to the scale (+20px per scale step), gently pushing overlapping nodes apart without recomputing layout positions or re-zooming.

### REQ-061F: Fit to View Respects Visibility
The Fit to View action zooms to fit only the currently visible nodes, not the entire graph.

**AC-061F-01**: Fit to View computes bounding box from visible nodes only (respecting view mode filter, attribute filters, and collapsed state).
**AC-061F-02**: If no nodes are visible, falls back to fitting all nodes.
**AC-061F-03**: Revealed nodes (shown when a filtered node is selected) are included in the fit calculation.

### REQ-061G: Edge Source Highlight
When adding an edge, the source node has a bold double-ring glow to clearly indicate which node is the edge origin.

**AC-061G-01**: The edge source node has a bold inner stroke and outer glow ring (25% alpha) using the edge source stroke colour.
**AC-061G-02**: The glow width scales inversely with zoom level (compensated by `1.5/zoomLevel`) so it remains visible at all zoom levels.

### REQ-061H: Add-Edge Interaction
Single-click node selection in add-edge mode for immediate response.

**AC-061H-01**: In add-edge-source or add-edge-target mode, clicking a node selects it immediately on pointer-down without starting a drag.
**AC-061H-02**: The simulation is not restarted when selecting edge source/target nodes, preserving the current view.
**AC-061H-03**: If a node is already selected when "Add Edge" is clicked, it is used as the source automatically — the user only needs to click the target.

### REQ-061I: Taxonomy Auto-Save
Editing the taxonomy via the wizard automatically saves both the .cm map file and the .cmt template file.

**AC-061I-01**: When taxonomy is edited (node types, edge types, classifiers), the .cm file is auto-saved via the existing debounced auto-save.
**AC-061I-02**: The .cmt template file is also saved automatically when the wizard completes in edit mode.
**AC-061I-03**: The .cmt defines all node and edge type attributes (id, label, shape/color/style, fields, directed).
**AC-061I-04**: The .cm file references its .cmt via `<!-- template: filename.cmt -->` in the header.

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

### REQ-066: Label Visibility Toggle
Toggle node and edge labels on/off from the canvas controls.

**AC-066-01**: "Aa" button in zoom controls toggles label visibility.
**AC-066-02**: When off, no node name labels or edge type labels are drawn on canvas.
**AC-066-03**: Button shows strikethrough/dimmed when labels are hidden.
**AC-066-04**: Collapse indicators (+/-) remain visible regardless of label toggle.

### REQ-067: Outline Notes Editor
Notes use an interactive outline editor with indent/outdent instead of markdown.

**AC-067-01**: Each line is an editable input with a bullet marker.
**AC-067-02**: Tab indents the current line (max = parent indent + 1).
**AC-067-03**: Shift+Tab outdents the current line.
**AC-067-04**: Enter splits at cursor, creating a new line.
**AC-067-05**: Backspace at line start outdents first, then merges with previous line.
**AC-067-06**: Arrow up/down navigates between lines.
**AC-067-07**: Notes stored as indented bullet text ("- " prefix, 2-space indent levels).
**AC-067-08**: Notes pane has high-contrast background (white-on-black for dark themes, black-on-white for light).

### REQ-068: Edge Notes Pane
Edge notes open in the bottom notes pane (same as node notes) instead of the popover.

**AC-068-01**: Clicking an edge opens the notes pane at the bottom with the edge note.
**AC-068-02**: Edge notes pane header shows "Edge: FromNode → ToNode" with edge type.
**AC-068-03**: Edge notes use the same outline editor as node notes.
**AC-068-04**: Edge popover retains only weight slider and delete button (no note field).

### REQ-069: Node Selection Highlight
Selecting a node strongly dims non-connected nodes and edges.

**AC-069-01**: Selected node and its direct connections render at full opacity.
**AC-069-02**: Non-connected nodes dimmed to 8% opacity when a node is selected.
**AC-069-03**: Non-connected edges dimmed to 3% opacity.
**AC-069-04**: Highlight works consistently from canvas click, sidebar click, and analysis panel click.
**AC-069-05**: Community highlight and node highlight are mutually exclusive — selecting one clears the other.

## MCP Server

### REQ-070: MCP Server for LLM Integration
Swift CLI tool implementing Model Context Protocol over stdio, allowing AI assistants to interact with concept maps.

**AC-070-01**: MCP server is a Swift executable (ConceptMCP) built via Swift Package Manager.
**AC-070-02**: Server implements JSON-RPC 2.0 over stdio with MCP initialize/tools/list/tools/call methods.
**AC-070-03**: 15 tools exposed: list_maps, list_templates, open_map, open_template, search_nodes, get_node, get_connections, add_node, update_node, delete_node, add_edge, update_edge, delete_edge, create_map, get_map_stats.
**AC-070-04**: Server reads/writes .cm files (markdown format) directly on disk.
**AC-070-05**: Server reads .cmt template files (JSON format) directly.
**AC-070-06**: Default directories: ~/Documents/ConceptMapper/Maps/ and ~/Documents/ConceptMapper/Templates/.
**AC-070-07**: Custom directories configurable via --maps-dir and --templates-dir flags.
**AC-070-08**: add_node, update_node, delete_node, add_edge, update_edge, delete_edge all save changes immediately.
**AC-070-09**: search_nodes matches against node name, ID, type, property values, and notes.
**AC-070-10**: create_map loads a template and creates a new .cm file with the template's streams and generations.
**AC-070-11**: Help content documents full setup instructions for Claude Desktop integration.

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

## Classifier Colors & Layout

### REQ-071: Classifier-Driven Node Colors
Node color is derived from the first classifier whose values define colors, not hardcoded to the first classifier index.

**AC-071-01**: `getNodeColor` selects the first classifier with `color` on any value.
**AC-071-02**: If no classifier has colors, nodes fall back to `#666`.
**AC-071-03**: Sidebar node list uses the same color classifier logic.
**AC-071-04**: Sidebar classifier sections show color dots for any classifier with colored values (not only index 0).
**AC-071-05**: Color overrides (streamColorOverrides) take priority over classifier value colors.

### REQ-072: Template Reference Preserved Across Save
The `<!-- template: filename.cmt -->` comment in .cm files survives export and auto-save.

**AC-072-01**: `exportToMarkdown` writes `<!-- template: X.cmt -->` when `metadata.source_template` is set.
**AC-072-02**: `exportToMarkdown` omits the template comment when `source_template` is absent.
**AC-072-03**: `source_template` is populated from the .cm header during both load paths (loadFileContent, loadMapWithTemplate).
**AC-072-04**: JSON loading path includes `classifiers` from data in the reconstructed template.

### REQ-073: Classifier & Attribute Layout Dropdowns
Each classifier and attribute section in the sidebar has a layout dropdown (none/x-axis/y-axis/region/columns).

**AC-073-01**: Classifier sections render a `<select>` with layout options; value reflects current `cls.layout`.
**AC-073-02**: Attribute sections with ≤20 values render a `<select>` for layout promotion.
**AC-073-03**: Changing a classifier dropdown calls `onClassifierLayoutChange`.
**AC-073-04**: Changing an attribute dropdown with no existing classifier calls `onPromoteAttributeToClassifier`.

### REQ-074: Column Redraw on Resize
Columns and region layouts redraw correctly when the canvas is resized (window resize, sidebar toggle).

**AC-074-01**: `resizeCanvas` recalculates all layout forces using the shared `applyLayoutForces` helper.
**AC-074-02**: After resize, `fitToView()` is called with a delay so the zoom transform matches the new layout.
**AC-074-03**: Column backgrounds and labels always render regardless of node filter state.

### REQ-075: Explode View
An "Explode" button in the activity bar (left toolbar) spreads the graph across a virtual canvas larger than the viewport so no labels overlap.

**AC-075-01**: Activity bar shows an "Explode" toggle button (scatter icon); tooltip changes to "Collapse graph" when active.
**AC-075-02**: Exploding multiplies virtual canvas dimensions by a factor based on node count.
**AC-075-03**: Charge repulsion and collision radius increase in exploded mode.
**AC-075-04**: Columns, regions, and axis layouts scale proportionally across the exploded space.
**AC-075-05**: Exploded view does NOT auto-fit — the graph overflows the viewport for pan/zoom exploration.
**AC-075-06**: Collapsing restores normal forces and fits the graph back to the viewport.

### REQ-076: Layout Force Deduplication
All layout force calculations (initial setup, data change, resize, explode) use a single shared `applyLayoutForces` function.

**AC-076-01**: `applyLayoutForces` sets x, y, charge, collide, and region forces for given virtual dimensions.
**AC-076-02**: No duplicated force-setup code across initial simulation, data-change effect, resize handler, or explode effect.
**AC-076-03**: Layout conflict resolution clears competing layouts when a new layout is assigned (region vs region-column share a slot; only one x, one y).

---

## Architecture Improvements (2026-03-29)

### REQ-086: MCP Path Security
The MCP server validates all resolved file paths stay within allowed directories (maps/templates).

**AC-086-01**: `resolvePath` canonicalizes paths and rejects traversal attempts (e.g., `../../../etc/passwd`).
**AC-086-02**: Absolute paths outside allowed directories are rejected with a 403 error.
**AC-086-03**: Extension is appended when missing, not duplicated when present.

### REQ-087: Parser Type Safety
The Rust parser uses type-safe abstractions for error handling and section routing.

**AC-087-01**: `ParseResult<T>` type alias replaces verbose `Result<T, Vec<ParseError>>` signatures.
**AC-087-02**: `ParseOutput` struct replaces the ambiguous `ParseResult` struct name.
**AC-087-03**: `SectionKind` enum with `from_path()` replaces fragile string-contains matching.
**AC-087-04**: Node IR conversion uses move semantics (`into_iter`) instead of cloning.

### REQ-088: MCP Parser Tests
The MCP Swift parser has unit tests for parsing, writing, and round-trip fidelity.

**AC-088-01**: Parse nodes from fenced blocks (id, name, type, generation, stream, notes).
**AC-088-02**: Parse edges with inline format.
**AC-088-03**: Parse title from H1 header.
**AC-088-04**: Round-trip: parse -> write -> re-parse preserves nodes, edges, and title.
**AC-088-05**: Write produces valid markdown with correct structure.

### REQ-089: Edge Type Registry
A centralized edge type registry replaces hardcoded edge visuals scattered across multiple files.

**AC-089-01**: `DEFAULT_EDGE_TYPES` array defines id, label, directed, style, color, showArrow for all built-in types.
**AC-089-02**: `getDefaultEdgeVisual()` returns fallback visuals when no .cmt template overrides.
**AC-089-03**: `EDGE_LABELS` map derives from the registry rather than duplicating data.

### REQ-090: WASM Error Boundary
Parser initialization failures produce descriptive user-facing error messages.

**AC-090-01**: `initParser()` wraps WASM loading in try/catch with descriptive error message.
**AC-090-02**: Error includes original error message for debugging.

### REQ-091: LLM Request Timeout
Ollama HTTP requests have a configurable timeout to prevent hanging.

**AC-091-01**: `OllamaLLMClient.sendMessage` uses AbortController with 5-minute timeout.
**AC-091-02**: Timeout aborts the fetch and throws an error.

### REQ-092: WebView String Escaping
All Swift-to-JS string interpolation uses JSON serialization for safety.

**AC-092-01**: `safeJSString()` uses `JSONSerialization` to produce properly escaped JS string literals.
**AC-092-02**: All `evaluateJavaScript` calls use `safeJSString` instead of manual `replacingOccurrences`.
**AC-092-03**: Strings containing quotes, newlines, backslashes, and Unicode are correctly escaped.

### REQ-093: LLM Request Cancellation
In-flight LLM requests can be cancelled by the user.

**AC-093-01**: `LLMService.currentTask` stores the active URLSessionDataTask.
**AC-093-02**: `LLMService.cancel()` cancels the task and clears the reference.

### REQ-094: Error Logging

> **REMOVED** (architecture cleanup, 2026-04-02): `LogService.swift` was never called
> anywhere in the codebase — dead code since creation. Deleted. Error logging now uses
> the system `os.log` Logger already present in `WebViewBridge.swift`.

### REQ-095: CI/CD Pipeline
CI validates all four components: Rust, WASM, Web, and Swift.

**AC-095-01**: Rust job runs `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test --all`.
**AC-095-02**: WASM job builds `cargo build --target wasm32-unknown-unknown --features wasm`.
**AC-095-03**: Web job runs `npm run lint`, `npm test --coverage`, `npm run build`.
**AC-095-04**: Swift job builds and tests the MCP server on macOS.

### REQ-096: App.tsx Decomposition
File loading logic and Swift bridge are extracted from the monolithic App.tsx into focused modules.

**AC-096-01**: `useFileLoader` hook encapsulates WASM parser initialization and file content loading.
**AC-096-02**: Hook returns `parserReady`, `error`, `setError`, and `loadFileContent`.
**AC-096-03**: Swift WKWebView bridge functions are extracted to `web/src/utils/swiftBridge.ts` with typed `SwiftBridgeDeps` interface.
**AC-096-04**: `registerSwiftBridge()` returns a cleanup function; App.tsx bridge useEffect is reduced to a single call.

## Taxonomy Wizard Validation & Input

### REQ-097: Classifier Validation Tolerates Empty Value Rows
Classifier step validation does not block progression due to empty placeholder value rows.

**AC-097-01**: Classifier step allows "Next" when the classifier label is filled and at least one value has a non-empty label.
**AC-097-02**: Empty value rows (blank label) are silently filtered out when building the final result.
**AC-097-03**: A classifier with only empty value rows still blocks progression (at least one real value required).

### REQ-098: Select Field Options Comma Input
Select-type field options accept comma-separated input without the text snapping back on each keystroke.

**AC-098-01**: Typing a comma in the options input does not remove the comma or reset the text.
**AC-098-02**: Options are parsed into the string array on blur or Enter, not on every keystroke.
**AC-098-03**: The parsed result filters out empty strings (trailing commas produce no empty options).
**AC-098-04**: Options display as comma-separated text when the input is focused or blurred.

## Edge Display & Creation

### REQ-099: Edge Labels From Template
Edge labels on the canvas and in tooltips use the label defined in the `.cmt` template's `edge_types` config, falling back to the hardcoded `EDGE_LABELS` map.

**AC-099-01**: When `edgeTypeConfigs` is provided, edge labels in the graph render the template-defined label.
**AC-099-02**: When a template edge type has no matching config entry, the label falls back to the hardcoded `EDGE_LABELS` constant.
**AC-099-03**: Tooltip text for hovered edges also uses the template-defined label.

### REQ-100: Edge Weight Preview in Add Edge Modal
The Add Edge modal shows a visual preview line that reflects the selected weight/thickness.

**AC-100-01**: An SVG preview line is rendered below the weight slider.
**AC-100-02**: The preview line's stroke width scales with the weight value.

### REQ-101: Region/Column Colour Overrides
Classifier-based region and column background colours can be customised per-value via the Settings modal, following the same pattern as stream and edge colour overrides.

**AC-101-01**: The Settings modal shows a colour section for each classifier with `region` or `region-column` layout.
**AC-101-02**: Each classifier value has a colour picker defaulting to the template-defined colour (or `#666666` fallback).
**AC-101-03**: Colour overrides are stored in `classifierColorOverrides` on the theme context and persisted to localStorage (`cm-classifier-colors`).
**AC-101-04**: A reset button (×) clears the override for a value, reverting to the template default.
**AC-101-05**: The canvas region/column rendering applies overrides with priority: user override → template colour → `#666` fallback.
