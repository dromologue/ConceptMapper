/**
 * Help content for ConceptMapper.
 * Each section has a title and markdown-ish content string.
 * The HelpPanel component renders these as searchable, collapsible accordions.
 */

export interface HelpSection {
  id: string;
  title: string;
  content: string;
  /** Optional tags for search weighting */
  tags?: string[];
}

export const HELP_SECTIONS: HelpSection[] = [
  // ── Getting Started ──────────────────────────────────────────────
  {
    id: "getting-started",
    title: "Getting Started",
    tags: ["new", "begin", "first", "intro", "start", "overview"],
    content: `ConceptMapper is a visual concept-mapping tool for exploring relationships between thinkers, ideas, and concepts.

When you first open the app you see the **Start Screen** with three options:

1. **New Taxonomy** -- Opens a step-by-step wizard that walks you through defining your map's structure: a title, node types, classifiers (the grouping dimensions your domain needs), and edge types.

2. **Open File** -- Load an existing .cm or .json concept map file. You can also use File > Open (Cmd+O) from the menu bar.

3. **Map Text** -- (Coming soon.) Use an external LLM to extract nodes and relationships into a taxonomy structure. See "Using an LLM to Map Content" in this help for the current workflow.

If you have previously saved templates, they appear below these buttons. Click one to start a new map pre-loaded with that template's structure.

**Recommended first steps:**
- Click "New Taxonomy" and follow the 6-step wizard.
- Add a few nodes using the sidebar buttons.
- Draw edges between nodes to define relationships.
- Open Settings (gear icon) to choose a theme.`,
  },

  // ── Core Concepts ────────────────────────────────────────────────
  {
    id: "core-concepts",
    title: "Core Concepts: Taxonomy, Template, and Map",
    tags: ["taxonomy", "template", "map", "concept", "terminology", "vocabulary", "glossary", "classifier"],
    content: `ConceptMapper uses a few key terms that are worth understanding upfront:

**Taxonomy** -- The structural skeleton of your concept map. It defines:
- The node types you can create (e.g. Person, Concept, Theory)
- The classifiers used to group nodes (e.g. domain, era, status)
- The fields each node type carries
- The edge types and how they look (colour, line style, directed/undirected)

**Template (.cmt)** -- A reusable taxonomy structure without any actual nodes or edges. Stored as JSON. The template ALWAYS owns the structure — the map file never carries node-type or classifier definitions of its own. A .cm file references its template via an HTML comment header (\`<!-- template: foo.cmt -->\`).

**Concept Map (.cm)** -- A structured markdown file containing nodes, edges, and notes. Auto-saves to its source path as you work.

**Classifier** -- A generic grouping dimension defined in the template. Classifiers replace the older hardcoded "streams" and "generations" — they are completely generic, so the template author chooses both the dimensions (e.g. domain, era, status) and the allowed values. Every classifier appears as a filterable section in the sidebar.

**Node Types** -- The kinds of entities in your map. Each type has a shape (circle or rectangle), icon, colour, and field set. There are no built-in privileged types — everything comes from the template.

**Edges** -- Directed or undirected relationships. Edge types are defined in the template (label, colour, line style). Per-map colour overrides live in Settings.

**Tags** -- A free-form labelling system. Any node type can declare a \`tags\` field; values appear as pills with autocomplete drawn from tags already used in the map. Tags also surface as a filterable section in the sidebar.`,
  },

  // ── The Workspace Layout ─────────────────────────────────────────
  {
    id: "workspace-layout",
    title: "The Workspace Layout",
    tags: ["layout", "ui", "interface", "screen", "panel", "area"],
    content: `The app follows a VS Code-inspired layout with five main areas:

**Title Bar** (top) -- Shows the map title and a search field. Use the search to find nodes by name (Cmd+K to focus).

**Activity Bar** (left edge, narrow icon strip) -- Vertical toolbar with view mode buttons at the top and settings/taxonomy at the bottom:
- Network icon: Full view (all nodes)
- Filtered view icons: One per node type defined in your taxonomy (dynamically generated, not hardcoded)
- Sidebar icon: Toggle the sidebar panel
- (Map Text and Chat icons will appear in a future release when built-in LLM support is enabled)
- Help icon: Open the searchable help panel
- Taxonomy icon (bottom): Edit the current taxonomy structure
- Gear icon (bottom): Open Settings

**Sidebar** (left panel) -- The Explorer panel showing:
- Action buttons to add nodes (one per node type) and edges
- A collapse/expand-to-level stepper (see "Collapse and Expand to Level")
- One collapsible filter section per classifier defined in the template
- A Tags section (open by default) when any node uses tags
- A collapsible Nodes list with a filter/search box

**Canvas** (centre) -- The main interactive graph visualization. Pan by dragging, zoom with scroll wheel or pinch, Shift+drag for marquee zoom.

**Auxiliary Panel** (right, appears when a node is selected) -- The Properties panel showing the selected node's attributes, with an inline name editor, classifier dropdowns, custom fields, tag pills with autocomplete, and a connections list. A resize handle between the canvas and this panel lets you adjust width.

**Bottom Pane** (below the canvas, when open):
- Notes pane: Inline markdown editor for the selected node's notes`,
  },

  // ── Activity Bar Buttons ─────────────────────────────────────────
  {
    id: "activity-bar",
    title: "Activity Bar: What Each Button Does",
    tags: ["toolbar", "button", "icon", "activity bar"],
    content: `The Activity Bar is the narrow vertical strip on the far left. Its buttons fall into two groups — a top group for views and canvas tools, and a bottom group for map-wide actions. A few buttons are hidden on iPhone, where the layout is condensed.

**Top group — views and canvas tools:**

1. **Full Network** (graph icon) -- Shows all nodes and edges. The default view.

2. **Filtered Views** -- One button per node type in your taxonomy (for example a People view and a Concepts view). These are generated dynamically from the template, not hardcoded, and each shows that type's own icon or initial.

3. **Text Outline** (outline icon) -- Switches to the **Textmap**: the same map rendered as a navigable nested outline. The default on iPhone, one tap away everywhere else. See "Textmap: The Outline View".

4. **Toggle Sidebar** (panel icon) -- Shows or hides the left Explorer sidebar. (Mac and iPad.)

5. **Properties** (properties icon) -- Shows or hides the Properties inspector for the selected node. (Mac and iPad.)

6. **Notes** (notes icon) -- Shows or hides the Notes editor for the selected node. (Mac and iPad.)

7. **Fit to View** -- Re-frames the canvas so the whole map is visible.

8. **Export Image** -- Exports the current canvas as an image.

9. **Expand / Collapse level** -- A vertical stepper (\`+\` / depth / \`−\`) that reveals or hides the graph one level of depth at a time; double-click the depth label to toggle fully expanded or fully collapsed. See "Collapse and Expand to Level".

10. **Layout** (layout icon) -- Opens a popover of layout presets: the plain force arrangement, or arrangements driven by a classifier's axis. "Reset Classifiers" clears any axis/region layouts. Your chosen layout is saved with the map.

**Bottom group — map-wide actions:**

11. **Network Analysis** (analysis icon) -- Opens the metrics, node rankings, communities, and path-finder panel. (Mac and iPad.) See "Network Analysis Tools".

12. **Edit Taxonomy** (list icon) -- Re-opens the taxonomy wizard to modify the current map's structure (node types, classifiers, edge types).

13. **Explode / Collapse graph** -- Spreads the nodes apart for an overview, or pulls them back together.

14. **Settings** (gear icon) -- Opens Settings for theme and colour customisation.

15. **Help & FAQ** (question-mark icon) -- Opens this searchable help panel.`,
  },

  // ── Adding and Editing Nodes ─────────────────────────────────────
  {
    id: "nodes",
    title: "Adding and Editing Nodes",
    tags: ["node", "add", "edit", "create", "thinker", "concept", "person", "delete"],
    content: `**Adding a node:**
1. In the sidebar, click the "+ [Type]" button for the node type you want (e.g. "+ Person", "+ Concept").
2. A modal appears asking for:
   - Type (if multiple types are defined)
   - Name (required)
   - A dropdown for each classifier your template defines (e.g. domain, decade, status)
   - Tags, and any required or select-type custom fields
3. Click "Add" to place the node on the canvas.

The node is automatically selected after creation so you can immediately edit its properties.

**Editing a node:**
1. Click a node on the canvas or in the sidebar node list.
2. The Properties panel opens on the right.
3. Edit the name directly in the header input field.
4. Change any classifier value using its dropdown selector.
5. Edit any custom fields defined by your taxonomy (text inputs, selects, textareas).
6. Changes auto-save with a short debounce delay.

**Node notes:**
Click "Edit Notes" in the Properties panel header to open the Notes pane below the canvas. This is a live markdown editor -- type headings (#), bold (**text**), italic (*text*), code (\`text\`), lists (- item), and blockquotes (> text). Notes auto-save.

**Tip:** The node type badge in the Properties header shows whether a node is a circle type (thinker) or rectangle type (concept). Node size can be driven by a select field if configured in the taxonomy (e.g. eminence controls circle size).`,
  },

  // ── Adding Edges ─────────────────────────────────────────────────
  {
    id: "edges",
    title: "Adding Edges (Relationships)",
    tags: ["edge", "relationship", "connection", "link", "draw", "add"],
    content: `Edges represent relationships between nodes. To add an edge:

1. Click the **"+ Edge"** button in the sidebar (or enter edge-drawing mode).
2. The status bar shows "Click source node" -- click the first node on the canvas.
3. The status bar changes to "Click target node" -- click the second node.
4. A modal appears showing the available relationship types for this pair.
5. Select a type and click "Add Edge".

Press **Escape** at any time to cancel edge drawing.

**Edge types depend on what you are connecting:**

*Thinker-to-Thinker:*
- Teacher -> Pupil, Chain, Rivalry, Alliance, Synthesis, Institutional

*Thinker-to-Concept:*
- Originates, Develops, Contests, Applies

*Concept-to-Concept:*
- Extends, Opposes, Subsumes, Enables, Reframes

**Visual styles:**
- Solid lines with arrows: directed relationships (teacher->pupil, originates, etc.)
- Dashed lines (red): rivalry, opposes
- Dotted lines (grey): alliance, institutional

**Viewing connections:**
When a node is selected, its connections appear in the "Connections" section of the Properties panel. Click any connected node's name to navigate to it.`,
  },

  // ── The Taxonomy Wizard ──────────────────────────────────────────
  {
    id: "taxonomy-wizard",
    title: "The Taxonomy Wizard",
    tags: ["taxonomy", "wizard", "create", "new", "define", "setup", "node type", "classifier"],
    content: `The Taxonomy Wizard is where you define and edit the structural skeleton of a map. Open it from the start screen ("New Taxonomy") or from the Activity Bar (list icon at bottom) to edit the current map's taxonomy.

**Title and Description**
A title is required; the description is optional and surfaces in the start screen and on the map header.

**Node Types**
Each node type has:
- Name (e.g. "Person", "Concept", "Institution")
- Shape: Circle or Rectangle (affects how nodes render on the canvas)
- Icon: A 1-2 character symbol shown in the sidebar
- Fields: Custom attributes (text, select, textarea, or the special \`tags\` field)
- Size driven by: Optionally select a numeric or select field whose value scales the node radius

**Classifiers**
Classifiers are the generic grouping dimensions of your map. There are no hardcoded ones — you choose the dimensions you need (e.g. domain, era, status, region). Each classifier has an id (used as the field key on nodes), a label, an optional colour palette, and a list of allowed values. Any field on a node whose key matches a classifier id is treated as a classifier value (filterable, surfaced in the sidebar).

**Edge Types**
Each edge type has a label, colour, directed/undirected flag, and line style (solid, dashed, dotted).

**Review**
See a summary of everything you defined. From here you can also click **"Save as Template"** to store this structure as a reusable .cmt. Click "Create" (new) or "Save" (edit mode) to finalize.

**Round-trip to disk (REQ-090):** When you save changes from "Edit Taxonomy" on an existing map, the app writes the updated .cmt silently — no dialog. It first tries to overwrite the template file *next to the map* (e.g. \`Maps/my-domain/my-domain.cmt\`); if no such file exists, it falls back to your shared Templates folder. The next time you open the map, the edits are already there.

Navigation: Use Back/Next buttons at the bottom. Press Escape to cancel.`,
  },

  // ── Using an LLM to Map Content ─────────────────────────────────
  {
    id: "llm-mapping",
    title: "Using an LLM to Map Content to a Template",
    tags: ["llm", "ai", "claude", "gpt", "mapping", "extract", "prompt", "template", "generate"],
    content: `You can use any LLM (Claude, GPT-4, Llama, etc.) to generate concept map content that you then open in ConceptMapper. The workflow is: design your taxonomy in the app, export or describe it to the LLM, and have the LLM produce a .cm file you can open.

**Step 1: Design your taxonomy**

Use the Taxonomy Wizard (New Taxonomy on the start screen) to define:
- Node types with their fields (e.g. Person with importance, dates, tags)
- Classifiers -- the grouping dimensions your domain needs (e.g. domain, decade, region, status), each with allowed values and an optional colour palette
- Edge types with styles

Save it as a template (.cmt) for reuse.

**Step 2: Export the template for the LLM**

Open your .cmt file in a text editor -- it is plain JSON. Copy the full contents. This gives the LLM the exact structure it needs to produce compatible output.

**Step 3: Prompt the LLM**

Use a prompt like this (adapt to your content):

---
I have a concept-mapping tool that uses this taxonomy template:

\`\`\`json
[paste your .cmt template here]
\`\`\`

Please analyse the following text and produce a .cm concept map file. The output must be a markdown file using EXACTLY this format:

**CRITICAL: Every property line inside a fenced code block MUST use "key: value" format with a colon.** Do not omit the colon — the parser requires it.

Sections required:

1. **## [Type] Nodes** -- one section per node type (e.g. "## Person Nodes", "## Concept Nodes"). Each node is a fenced code block (\`\`\`) containing key: value pairs. Required keys: id and name. Then add the template's classifier fields, using each classifier's id as the key (e.g. \`domain: systems_cybernetics\`), plus any other fields the node type defines. End with notes: if applicable.
2. **## Edges** -- fenced code blocks with "from: [id] to: [id] type: [edge_type]" lines, each followed by "  note: [description]"
3. **## Notes** (optional) -- free-form markdown for map-level notes.

Use the classifier ids and their allowed values, and the edge types, exactly as defined in the template. Assign each node the most appropriate classifier values.

Here is the text to analyse:

[paste your source text]
---

**Step 4: Open the result**

Save the LLM's output as a .cm file and open it in ConceptMapper (File > Open or Cmd+O). The app parses the markdown format and renders the concept map.

**Tips for better results:**
- Include the full .cmt template so the LLM knows exact field names and options.
- Ask the LLM to use the classifier ids and their allowed values from the template.
- For select-type fields (like importance or status), tell the LLM to use only the defined options.
- Review and edit the generated .cm file before opening -- fix any formatting issues.
- Longer, more detailed source text produces richer maps.
- You can iteratively add content: open the generated map, then manually add nodes and edges the LLM missed.

**Example node block format:**

\`\`\`
id:               my_node_id
name:             My Node Name
domain:           systems_cybernetics
decade:           1970s
priority:         high
status:           active
tags:             keyword1, keyword2
notes:            Detailed description of this node
\`\`\`

**Example edge block format:**

\`\`\`
from: node_a to: node_b type: chain
  note: Description of how A relates to B

from: node_c to: node_d type: rivalry
  note: Description of the tension between C and D
\`\`\``,
  },

  // ── Canvas Navigation ────────────────────────────────────────────
  {
    id: "canvas-navigation",
    title: "Canvas Navigation and Interaction",
    tags: ["canvas", "pan", "zoom", "drag", "select", "navigate", "marquee"],
    content: `The central canvas renders your concept map as an interactive graph.

**Navigation:**
- **Pan:** Click and drag on empty canvas space.
- **Zoom:** Scroll wheel or trackpad pinch gesture.
- **Marquee zoom:** Hold Shift and drag to draw a rectangle -- the canvas zooms to fit that region.

**Selection:**
- Click a node to select it. The Properties panel opens on the right.
- Click empty canvas to deselect.
- In People or Concepts view, clicking a node reveals its cross-type connections.

**Visual indicators:**
- **Node colour:** Base colour comes from the node's classifier value (e.g. pillar, stream). On top of that, the colour is progressively lightened by **BFS depth** — roots keep their full colour, deeper nodes are paler. On large maps this varies the visual field without changing hue, so you can still read classifier membership while seeing hierarchy at a glance.
- **Node shape:** Circle = thinker/person types; Rectangle = concept types. Custom types use whichever shape is configured in the taxonomy.
- **Node size:** Can be driven by a field value (e.g. eminence controls circle radius).
- **+/- indicator:** Small circle in upper-right of a node. Means it has children. Click to collapse/expand.
- **Yellow/orange dot:** The node has notes attached.
- **Dashed outline:** Placeholder or contested status.
- **White outline:** Currently selected or hovered node.
- **Green outline:** Edge source during edge-drawing mode.
- **Edge arrows:** Directed relationships show an arrowhead.
- **Edge thickness:** Proportional to edge weight (thicker = stronger relationship).
- **Dashed red lines:** Rivalry or opposition.
- **Dotted grey lines:** Alliance or institutional connections.`,
  },

  // ── Sidebar and Filtering ────────────────────────────────────────
  {
    id: "sidebar-filtering",
    title: "Sidebar: Explorer, Classifiers, Tags, and Filtering",
    tags: ["sidebar", "explorer", "filter", "classifier", "tag", "list"],
    content: `The sidebar (toggle with the panel icon in the Activity Bar) has several sections:

**Action Buttons** (top)
One "+ [Type]" button per node type defined in your taxonomy, plus a "+ Edge" button. During edge-drawing mode, this button changes to "Cancel Edge".

**Collapse / Expand Stepper**
A vertical control with a + on top, the current expand level in the middle, and a - underneath. See "Collapse and Expand to Level" for the full mechanics.

**Filter Sections** (collapsible)
Click any section header to expand it:

- **One section per classifier** — Generated dynamically from the template's classifier list. Each shows a coloured dot per value with a checkbox. Click a value to uncheck it (hide nodes of that value). A "Show All" button appears when any filter is active.
- **Tags** (open by default when tags are present) — Lists every tag in use across the map with a count. Click a tag to filter; click again to clear.
- **Attribute Filters** — One section per filterable field from your node type configs. Select-type fields always appear. Text fields appear when they have 30 or fewer unique values.
- **Date Range** — If your node types have date_from/date_to fields, a date range filter appears with From/To year inputs.

**Filter logic:**
- Between sections (e.g. classifier A AND tags): nodes must pass ALL active filters.
- Within a section (e.g. two values checked): nodes matching ANY checked value are shown.
- Unchecked values hide matching nodes from both the canvas and the node list.

**Nodes** (collapsible)
A searchable, scrollable list of all visible nodes (respects active filters) sorted alphabetically. Each entry shows a colour indicator and the node name. Use the filter input to search by name. Click a node to select it on the canvas.`,
  },

  // ── Collapse and Expand to Level (REQ-088) ───────────────────────
  {
    id: "collapse-expand-level",
    title: "Collapse and Expand to Level",
    tags: ["collapse", "expand", "level", "depth", "hierarchy", "stepper", "fold"],
    content: `Every map opens **fully expanded** — all nodes and their links visible. The stepper in the sidebar controls how deep the visible hierarchy goes; step down to progressively collapse leaves toward the roots.

**The stepper**
A small vertical control: **+** on top, the current level number in the middle, **-** on the bottom.
- **+** reveals the next level of children.
- **-** collapses the deepest visible level.
- **Double-click the number** to toggle between fully collapsed (0) and fully expanded.

**How depth is computed**
The app performs a BFS from every root and assigns each node the shortest distance from any root. Level 0 = roots; level 1 = direct children; and so on. Cycles and unreachable nodes are assigned depth 0 so they remain visible at every level.

**Fresh load vs. mutation**
A fresh load (open file, switch map) reseeds to the maximum depth — the map opens fully expanded.
Manual edits (adding nodes, drawing edges, editing properties) preserve the current view state — your stepper position does not jump when you make changes.

**Why this matters**
Concept maps with hundreds of nodes are unreadable when shown all at once. The stepper lets you progressively disclose structure: start with the trunks, then reveal branches, then leaves.`,
  },

  // ── Tags (REQ-087 / REQ-089) ─────────────────────────────────────
  {
    id: "tags",
    title: "Tags: Pills, Autocomplete, and the Sidebar List",
    tags: ["tag", "tagging", "label", "keyword", "autocomplete", "pill"],
    content: `Tags are a first-class labelling mechanism. Any node type can declare a \`tags\` field in the taxonomy; nodes then carry a list of comma-separated tag values.

**Entering tags**
In the Properties panel, the tags field renders as pills:
- Type a few characters — a dropdown appears with matching tags already used elsewhere in the map (REQ-087 autocomplete).
- Press Enter or pick from the dropdown to add the tag as a pill.
- Click the × on a pill to remove it.
- Tags are saved automatically with the rest of the node's properties.

**The Tags sidebar section (REQ-089)**
When any node in the map carries one or more tags, a **Tags** section appears in the sidebar (open by default). It lists every tag in use with the count of nodes that have it. Click a tag to filter the canvas to nodes carrying that tag; click again to clear.

**Why tags are special**
Classifiers are structural (defined in the template); tags are emergent (added freely as you work). Use classifiers to encode the structure of your domain (e.g. "domain: economics"); use tags to capture cross-cutting themes you discover only after the map exists (e.g. "#liquidity-risk", "#post-crisis").`,
  },

  // ── Notes Editor ─────────────────────────────────────────────────
  {
    id: "notes-editor",
    title: "The Notes Editor",
    tags: ["notes", "markdown", "editor", "write", "text", "format"],
    content: `Each node can have rich-text notes attached. The Notes pane renders standard markdown and lets you attach an external .md file as the source of truth.

**To open:** Select a node, then click "Edit Notes" in the Properties panel header.

**Edit vs. Preview:** The pane opens in Preview by default — rendered markdown with wrapping. Click **Edit** to switch to a wrapping textarea showing the raw markdown source; click **Preview** to switch back.

**Supported markdown:** Standard CommonMark — headings (\`#\` through \`####\`), \`**bold**\`, \`*italic*\`, \`\`inline code\`\`, fenced code blocks, lists, [links](url), > blockquotes, --- rules.

**Attach a markdown file:** Click **Attach .md** in the pane header to pick a file. The absolute path is stored on the node and round-tripped through the .cm file as \`notes_file: /absolute/path/to/file.md\`. The file's contents are loaded into the editor every time the pane opens — the file is the source of truth.

**Edits save back:** Any change in the editor writes back to the attached file after 500ms idle. If no file is attached, changes are stored inline on the node and round-tripped via the .cm as before.

**Detach:** Click **Detach** to drop the file reference. The currently-loaded text stays in the pane and persists inline on the node — nothing is lost. You can re-attach the same file (or another) at any time.

**Relationship context:** If the selected node has edges with notes, they appear at the top of the pane as "Relationship Context" — read-only summaries of edge annotations.

**Resizing:** Drag the border between the canvas and the notes pane to adjust height.`,
  },

  // ── View Modes ───────────────────────────────────────────────────
  {
    id: "view-modes",
    title: "View Modes: Dynamic Filtered Views",
    tags: ["view", "mode", "full", "people", "concepts", "filter", "dynamic"],
    content: `View modes let you focus on different parts of your map. They are generated dynamically from your taxonomy's node types:

**Full Network** (default)
Shows all nodes and all edges. The complete picture.

**Filtered Views** (one per node type)
Each node type defined in your taxonomy gets its own view mode button in the Activity Bar. For example:
- A "Person" type (circle shape) creates a People view that shows only people
- A "Concept" type (rectangle shape) creates a Concepts view that shows only concepts
- Custom types (e.g. "Institution", "Event") each get their own filtered view

In any filtered view, clicking a node temporarily reveals its cross-type connections. This lets you explore relationships without visual clutter.

**Node Collapse (+/-)**
Nodes with children (connected via any edge type -- directed or undirected) show a small +/- indicator in the upper-right corner. Click it to collapse/expand:
- **Collapse (-):** Hides all children reachable only through this node. The indicator changes to +.
- **Expand (+):** Shows the hidden children again.
- Children with multiple parents are only hidden when all their parents are collapsed.
- Collapse cascades: hiding a node also hides its exclusively-connected subtree.

Switch between modes using the Activity Bar buttons. When you switch modes, previously revealed nodes reset.`,
  },

  // ── Settings and Themes ──────────────────────────────────────────
  {
    id: "settings-themes",
    title: "Settings: Themes and Colour Customisation",
    tags: ["settings", "theme", "colour", "color", "customise", "customize", "appearance"],
    content: `Open Settings via the gear icon at the bottom of the Activity Bar.

**Theme**
Choose from available themes. Each theme changes the background, panel colours, text colours, and accent colours across the entire UI. Themes include dark options (Midnight, Obsidian, Solarized Dark, Nord) and light options (Ivory, Paper).

**Classifier Colours**
Override the default colour for any classifier value. The app shows one colour group per classifier defined in your template (e.g. Domain Colours, Decade Colours). Click a colour swatch to pick a new colour, or the X button to reset to the taxonomy default.

**Edge Type Colours**
Override colours for specific edge types (e.g. make "rivalry" edges bright red, "alliance" edges blue). Only edge types present in your current map appear here.

All colour customisations persist across sessions via local storage.

(LLM configuration will be available in a future release.)`,
  },

  // ── File Formats ─────────────────────────────────────────────────
  {
    id: "file-formats",
    title: "File Formats: .cm, .cmt, .json, and Markdown Export",
    tags: ["file", "format", "save", "export", "open", "import", "json", "markdown", "cm", "cmt"],
    content: `ConceptMapper works with several file formats:

**.cm (Concept Map)** -- The primary format. Structured markdown containing:
- An HTML comment header pointing at the .cmt template: \`<!-- template: foo.cmt -->\`
- Optional edge-colour overrides header: \`<!-- edge-colors: {...} -->\`
- A fenced code block per node, with \`key: value\` properties (including any classifier fields and a tags CSV)
- A fenced Edges block (\`from: a to: b type: x\`)
- A free-form Notes section

The app auto-saves to the source .cm file as you make changes (with a short debounce).

**.cmt (Concept Map Template)** -- A JSON file containing the taxonomy: title, description, classifiers, node_types, edge_types. The template ALWAYS owns the structure — the .cm map file never carries node-type or classifier definitions of its own. A .cmt can live either in your shared Templates folder or right next to its map (e.g. \`Maps/my-domain/my-domain.cmt\` alongside \`Maps/my-domain/my-domain.cm\`); the app resolves it from the path referenced in the .cm header.

**.json** -- The app can open plain .json files if they follow the concept map data schema.

**Markdown Export** -- Use File > Export (Cmd+Shift+E) to export a human-readable markdown version of your map: nodes grouped by type in fenced \`key: value\` code blocks (carrying each node's classifier values, tags, and fields), followed by the edges and any notes. This is the same structured-markdown format the app saves as .cm.

**Image Export** -- Use File > Export Image (Cmd+E) to save the current canvas view as a PNG image.

**Opening files:**
- File > Open (Cmd+O) or the "Open File" button on the start screen
- The app accepts .cm, .cmt, and .json files
- Older .cm files from earlier versions — including the retired \`stream:\` / \`generation:\` keys — are automatically migrated to the current classifier model when opened`,
  },

  // ── Keyboard Shortcuts ───────────────────────────────────────────
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    tags: ["keyboard", "shortcut", "hotkey", "key", "cmd", "command"],
    content: `**File operations:**
- Cmd+O -- Open file
- Cmd+S -- Save As
- Cmd+E -- Export as image
- Cmd+Shift+E -- Export concept map (markdown)
- Cmd+N -- New Taxonomy (from menu)

**Navigation:**
- Cmd+K -- Focus search field
- Escape -- Cancel edge drawing / close modals

**Canvas:**
- Click + drag -- Pan
- Scroll wheel / pinch -- Zoom
- Shift + drag -- Marquee zoom to region

**Notes editor:**
- Enter -- New line
- Standard text editing shortcuts (Cmd+A, Cmd+C, Cmd+V, etc.)

**General:**
- Cmd+? -- Toggle help overlay (native macOS help)`,
  },

  // ── Network Analysis ────────────────────────────────────────
  {
    id: "network-analysis",
    title: "Network Analysis Tools",
    tags: ["analysis", "centrality", "community", "path", "metrics", "degree", "betweenness", "influence", "bridge"],
    content: `The Network Analysis panel (graph icon in the Activity Bar) provides quantitative tools for understanding your concept map's structure. These metrics come from graph theory and social network analysis — they help reveal patterns that are invisible when you only look at the visual layout.

---

**NETWORK OVERVIEW METRICS**

These describe the network as a whole.

**Density** (0.0 to 1.0)
The fraction of all possible connections that actually exist. In a network of N nodes, there are N×(N-1)/2 possible undirected edges.
- *0.0* — No edges at all (disconnected nodes)
- *0.1–0.3* — Typical for concept maps; selective, meaningful connections
- *0.5+* — Very dense; almost everything connects to everything
- *1.0* — Complete graph (every node connected to every other)

A density of 0.15 means roughly 15% of all possible connections exist. Intellectual networks tend to be sparse — high density often means your taxonomy needs more differentiated relationship types.

**Average Degree**
The mean number of connections per node. If your network has 30 nodes and 45 edges, the average degree is about 3.0 (each node has 3 connections on average).
- *1–2* — Mostly linear chains; tree-like structure
- *3–5* — Well-connected; typical for rich concept maps
- *8+* — Very dense hub-and-spoke or mesh patterns

Useful as a quick health check: if average degree is below 2, you may have isolated clusters or missing relationships.

**Diameter**
The longest shortest path between any two reachable nodes. It measures how "wide" the network is — how many steps to traverse from one extreme to the other.
- *2–3* — Compact, "small world" network
- *5–8* — Moderate; common in intellectual history maps
- *10+* — Very spread out; may indicate missing bridging connections

A diameter of 6 means some ideas are 6 relationship-hops apart. If you expect them to be more closely linked, the diameter reveals a structural gap.

**Modularity** (-0.5 to 1.0)
Measures how cleanly the network divides into distinct groups (communities), compared to a random network with the same degree distribution.
- *Below 0.0* — Less structured than random
- *0.0–0.3* — Weak community structure; integrated, cross-cutting network
- *0.3–0.7* — Clear community structure; distinct intellectual clusters
- *0.7+* — Very strong separation; almost independent sub-networks

High modularity suggests your ideas naturally cluster — compare these detected clusters against your own stream/category assignments. Differences often reveal unexpected structural patterns.

---

**NODE METRICS — What Makes a Node Important?**

Different metrics capture different kinds of importance. A node can rank high on one metric and low on another — that contrast is itself informative.

**Connections (Degree Centrality)**
Simply how many edges a node has, normalized by the maximum possible (N-1).
- *High degree* — The most "active" or connected idea in the network. These are the concepts everyone references.
- *Low degree* — Peripheral or specialised ideas with few connections.
- *Degree tells you popularity, not importance.* A concept can be highly connected but structurally redundant.

*Interpretation:* In an intellectual history map, high-degree thinkers are the most referenced. But are they referenced because they are foundational, or simply well-known? Other metrics help distinguish this.

**Bridge Score (Betweenness Centrality)**
How often a node sits on the shortest path between all other pairs of nodes. Computed using Brandes' algorithm across all-pairs shortest paths, normalized by (N-1)(N-2).
- *High bridge score* — This node is a structural connector or bottleneck. Removing it would fragment the network or force longer paths between groups.
- *Low bridge score* — This node is embedded within a cluster; its removal wouldn't disrupt flow between groups.

*The most revealing metric.* A node with few connections but a high bridge score is the critical link between otherwise separate intellectual communities. In academic networks, these are the "translators" who connect disciplines.

*Example:* A thinker with only 4 connections but the highest bridge score connects two otherwise separate schools of thought. Without them, ideas from one school cannot reach the other.

**Influence (Eigenvector Centrality)**
Whether a node is connected to other important nodes. This is recursive prestige computed via power iteration — importance flows through the network.
- *High influence* — Connected to the "right" nodes. These ideas are at the centre of the most important cluster.
- *Low influence* — Connected to peripheral nodes only.
- *It is not enough to have many connections; they need to be connections to well-connected nodes.*

*Interpretation:* Eigenvector centrality captures "prestige by association." In an intellectual network, a thinker with high influence is connected to other influential thinkers — they are part of the inner circle, not just well-known.

*Contrast with Degree:* A concept can have many connections (high degree) but to peripheral nodes (low influence), or few connections but to the most central nodes (low degree, high influence).

**Reach (Closeness Centrality)**
How quickly a node can reach every other node in the network, using Wasserman-Faust normalization to handle disconnected components.
- *High reach* — This node is at the "centre" of the network in terms of average distance. It can spread information to every corner efficiently.
- *Low reach* — This node is on the periphery; it takes many hops to reach distant parts of the network.

*Interpretation:* Reach identifies the most "accessible" ideas. In a concept map of organisational learning, a concept with high reach is the one you would start with to explain the entire field — everything else is relatively close.

*Note:* In disconnected networks, reach uses a scaled normalization so that nodes in larger components still score higher than nodes in isolated pairs.

---

**COMPARING NODE METRICS — Reading the Rankings Table**

The rankings table lets you sort by any metric. The most interesting patterns emerge from *contrasts*:

- *High Degree + Low Bridge* — A hub within a single cluster. Well-connected but not structurally critical to the whole network.
- *Low Degree + High Bridge* — A rare, critical connector. Few connections, but they span community boundaries. These are the most structurally fragile nodes.
- *High Influence + Low Degree* — Connected to the right people, not to many people. Prestige by association.
- *High Reach + Low Influence* — Centrally positioned but not connected to the inner circle. A generalist rather than a specialist.
- *High everything* — A true central node: well-connected, structurally critical, influential, and accessible.

---

**COMMUNITIES**

The app detects natural groupings using label propagation — an iterative algorithm where each node adopts the most common label among its neighbors until the labels stabilise. Nodes that are more densely connected to each other than to the rest of the network form a community.

Toggle **"Color by community"** to see these groupings visually overlaid on the canvas. Click a community badge to highlight just its members and dim everything else.

Community detection is unsupervised — it finds structure you didn't explicitly define. Compare detected communities against your own stream/category assignments:
- *Communities match streams* — Your taxonomy accurately reflects the network's structure.
- *Communities cross streams* — Some ideas bridge your categories. Consider whether your categorisation needs refinement or whether these bridges are the interesting finding.
- *A stream splits into multiple communities* — Your category may be too broad; there are sub-groups within it.

**Modularity score** (shown in Overview) measures how strong these community boundaries are. Above 0.3 indicates meaningful structure.

---

**PATH FINDER**

Select any two nodes to find the shortest path between them. The path is highlighted on the canvas in orange. This is a BFS (breadth-first search) that finds ALL equally short paths, not just one.

- **Distance** — Number of steps (edges) between the two nodes. A distance of 3 means A→B→C→D.
- **Routes** — How many equally-short paths exist. Multiple routes mean the connection is structurally redundant (robust). A single route means it is fragile — one removed edge could disconnect them.
- **Weakest Link** — The single edge on the path whose removal would most increase the distance between the two nodes. This surfaces hidden dependencies. The weakest link is the relationship your network most depends on for this particular connection.

*Use case:* "How is this thinker connected to that concept?" The path finder shows the chain of relationships, and the weakest link tells you which single relationship is most critical to that chain.

---

**K-CORE DECOMPOSITION**

The k-core number indicates which "shell" of the network a node belongs to. It is computed by iteratively removing nodes with degree ≤ k and incrementing k.

- *k=1* — The outermost shell. These nodes are connected to only one part of the network and are the first to be "peeled away."
- *k=2* — Each of these nodes has at least 2 connections to other k≥2 nodes.
- *Highest k* — The innermost core. These are the most tightly interconnected concepts — the structural bedrock of the network. Every node in the k-core is connected to at least k other k-core nodes.

*Interpretation:* The innermost core reveals the foundational cluster of ideas that everything else builds upon. In an intellectual history, these are the ideas and thinkers that are so interconnected they form a self-reinforcing system. Peripheral nodes (k=1) are recent additions, outliers, or specialised concepts connected to only one thread.

*Practical use:* Filter your rankings by k-core to identify the structural foundation vs. the periphery. If a concept you consider important has a low k-core number, it may be under-connected in your taxonomy.`,
  },

  // ── Textmap (Outline View) ───────────────────────────────────────
  {
    id: "textmap",
    title: "Textmap: The Outline View",
    tags: ["textmap", "outline", "list", "text", "navigate", "iphone", "mobile", "tree"],
    content: `The **Textmap** is an alternative to the visual canvas: it renders the same concept map as a navigable nested **outline**. It is the default on small screens (iPhone), where the visual graph is hard to read, and it is available on every platform from the outline button in the Activity Bar.

**What you see**
Each node is a row. Expand a row (▸) to reveal that node's connections, grouped by relationship:
- Outgoing directed relationships appear as "Label →".
- Incoming directed relationships appear as "← Label".
- Undirected relationships appear under their plain label.
Each group shows a count, and every connected node is itself a row you can expand — so you can walk the entire graph by outline.

**Navigating**
- **Tap a node name** to select it — the Properties panel and Notes work exactly as they do on the canvas.
- **Tap the disclosure arrow** to expand or collapse a node's connections in place.
- **Tap the focus control (⤢)** to re-root the outline on that node. A breadcrumb trail at the top records your path; tap any crumb (or "All roots") to jump back.

**Roots**
The top level lists the map's natural roots — nodes with no incoming relationship. If the map has none (for example a fully cyclic or purely undirected map), every node is listed at the top level, and you focus into whichever one you want to explore from.

**Loops**
Concept maps contain cycles. If a connection points back to a node already above you in the current path, the Textmap shows it as a **loop link (↺)** rather than expanding it forever — tap it to jump to that node. This keeps navigation finite no matter how tangled the graph.

**Notes on a row**
Every row has a notes button. Tap it to read and edit that node's notes inline, without leaving the outline. Notes open as rendered markdown when they already exist; tap **Edit** for a plain textarea and **Preview** to render it again. Edits save into the map automatically (debounced), exactly as the canvas Notes panel saves. Tap **Attach .md** to back the notes with an external markdown file — once attached, that file is the source of truth and your edits write straight through to it; **Detach** keeps the text but unlinks the file. When a row's notes are collapsed, a one-line preview of the first line sits beneath the row, so you can skim a whole branch without opening each note.

**Adding nodes**
The outline has an add-node button (＋) in its header, so you can build a map from the Textmap alone — useful on a phone, where the visual canvas isn't practical. It opens the same Add Node form as the canvas: choose a node type from the template, name it, set classifier values, tags, and any template fields, and optionally link it to existing nodes as you create it.

**Your chosen layout is saved with the map**
The layout you pick — the plain force arrangement, or one driven by a classifier's axis — is written into the .cm file itself as a small \`<!-- view: … -->\` line, alongside any per-classifier axis choices. Re-open the map, on any platform, and it returns to that arrangement instead of resetting to the default force layout. The map carries its preferred presentation with it, the same way it carries its nodes and notes.

**Why it exists**
A large graph is unreadable on a phone and often busy even on a desktop. The Textmap trades spatial layout for precise, linear navigation: follow one thread of relationships at a time, with the structure always legible as indented text.`,
  },

  // ── FAQ ──────────────────────────────────────────────────────────
  {
    id: "faq",
    title: "Frequently Asked Questions",
    tags: ["faq", "question", "help", "how", "why", "what"],
    content: `**Q: How do I get started with a blank map?**
A: Click "New Taxonomy" on the start screen and follow the 6-step wizard. At minimum, give it a title, keep the default node types (Person and Concept), and define at least one classifier with a couple of values.

**Q: What happened to streams and generations? My old maps used them.**
A: They are no longer privileged dimensions. The current model uses generic **classifiers** defined entirely in the template — pick whatever dimensions your domain needs (e.g. domain, era, region, status). Old .cm files are migrated on load: any \`stream:\` or \`generation:\` keys are lifted into classifier fields, and old "Streams" / "Generations" sections become Notes. Your maps still work.

**Q: Can I rename or redefine node types after creating a map?**
A: Yes. Click the taxonomy/list icon at the bottom of the Activity Bar to re-open the wizard in edit mode. Changes to the taxonomy apply to the existing map.

**Q: How do I delete a node?**
A: Node deletion is not yet available through the UI. You can edit the .cm file directly (it is plain-text markdown) and remove the node's fenced block.

**Q: How do I delete an edge?**
A: Edge deletion is not yet available through the UI. You can edit the .cm file directly.

**Q: Where are my files saved?**
A: When you open or create a .cm file, the app auto-saves to that file path with a 2-second debounce after each change. The save indicator in the status bar confirms when a save occurs.

**Q: Can I use AI to populate a concept map?**
A: Yes. Design your taxonomy in the app, export the .cmt template, and use any LLM (Claude, GPT-4, etc.) to generate a .cm file from your source text. See "Using an LLM to Map Content" in this help for detailed instructions and a prompt template.

**Q: What does "Save as Template" do?**
A: It stores the current taxonomy structure (node types, classifiers, edge types) without any nodes or edges. The template appears on the start screen for quick reuse when creating new maps.

**Q: How do I customise node colours?**
A: Node colours come from the classifier marked as colour-providing in the template (typically the first one). Each classifier value has its own colour; change it in the template via the Taxonomy wizard.

**Q: If I edit the taxonomy in the app, where does it save?**
A: Silently — no dialog. The app first looks for the .cmt template *next to the map* (e.g. \`Maps/my-domain/my-domain.cmt\`); if it finds one there, it overwrites that file. Otherwise it writes to your shared Templates folder. Either way, the next time you open the map, your edits are in place.

**Q: Can I have more than two node types?**
A: Yes. In the taxonomy wizard (Step 2), click "+ Add Type" to create as many node types as you need. Each can have its own shape, icon, and custom fields.

**Q: What is the "Size driven by" option in the node type configuration?**
A: If a node type has a select-type field (e.g. "Importance" with options major, minor, etc.), you can designate that field to control the visual size of nodes on the canvas. Higher-ranked options produce larger nodes.

**Q: How do I share a map with someone?**
A: Send them the .cm file together with its .cmt template (the .cm references the template by name). They can open it in ConceptMapper — the .cm is plain-text markdown. For people who do not have the app, export a PNG image instead.

**Q: What happens if I close the app without saving?**
A: If you opened a file, the app auto-saves changes as you work (2-second debounce). If you created a new taxonomy and never saved the file, the data may be lost.`,
  },

  // ── Second Brain ─────────────────────────────────────────────────
  {
    id: "second-brain",
    title: "Second Brain: Scanning Folders & Workflowy Integration",
    tags: ["second brain", "workflowy", "folders", "markdown", "tags", "api key", "scan", "outline"],
    content: `The Second Brain panel (brain icon in the activity bar, macOS only) connects ConceptMapper to your existing notes and Workflowy outlines.

**Scanning Markdown Folders**

1. Click the brain icon in the activity bar to open the Second Brain panel.
2. Click "+ Add Folder" and choose a directory that contains .md files.
3. Click "Scan Now". ConceptMapper walks the directory recursively, extracts #tags from each file, and builds a concept map automatically.
4. Folder nodes (F) and Note nodes (N) appear in the canvas. Notes that share at least one tag are connected by dashed "Shares Tag" edges.

You can add multiple folders. The scan always replaces the current graph — save any open map first with File > Save if needed.

**Workflowy Integration**

Any node in any map can be linked to a Workflowy subtree, which is then displayed read-only in the notes pane. This is macOS only.

**Getting your Workflowy API key:**
1. Sign in to Workflowy at workflowy.com.
2. Open your account settings (click your avatar or initials → Settings).
3. Go to the "API" or "Integrations" tab.
4. Click "Generate API Key" (or copy the existing key if one is shown).
5. Copy the key -- it looks like a long alphanumeric string.

**Linking a node to Workflowy:**
1. Select a node on the canvas.
2. Open the Notes pane (notes icon in the activity bar).
3. In the Workflowy section at the bottom, paste the Workflowy node URL. These look like: https://workflowy.com/#/abc123def456
4. Press Enter or click the ↓ button. The app fetches the outline and displays it read-only beneath the URL field.
5. To edit the linked content, open it in Workflowy directly.

**Where credentials are stored**

Your Workflowy API key is stored in the macOS Keychain -- it never touches disk as a plain text file. Watched folder paths are stored in the app's preferences (UserDefaults) and persist between restarts. Nothing is synced to iCloud or any external service.

**Q: Why is Workflowy integration macOS only?**
A: The integration uses direct REST API calls to Workflowy from the native layer. The iOS version of ConceptMapper does not include this feature in the current release.

**Q: Will scanning replace my current map?**
A: Yes. Scanning loads the generated graph as the active map, in the same way as opening a file. Save any unsaved work first.

**Q: Can I edit notes that are linked to Workflowy from within the app?**
A: No. The outline view is strictly read-only. Use Workflowy to edit content; the app re-fetches on each link.`,
  },

  // ── Troubleshooting ──────────────────────────────────────────────
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    tags: ["trouble", "error", "problem", "fix", "issue", "bug", "not working"],
    content: `**"No nodes found" error when opening a file**
The file may not be in a recognised format. ConceptMapper expects a structured-markdown .cm map file or a JSON .cmt template (older .cm files are migrated automatically on open). Check that the file has the correct structure.

**Canvas is blank after creating a taxonomy**
This is expected -- a new taxonomy has no nodes yet. Use the sidebar's "+ [Type]" buttons to add nodes, or use Map Text to populate from a text source.

**Nodes appear in unexpected positions**
Layout is force-directed; positions emerge from the edges. If you have classifier-driven layout enabled in the template, the relevant classifier value determines a node's region. Check the node's classifier values in the Properties panel.

**Auto-save is not working**
Auto-save requires that the file was opened from disk (giving the app a file path to write to). If you are working with an unsaved new map, use File > Save As (Cmd+S) to establish a file path first.

**Theme colours look wrong after updating**
Try closing and re-opening Settings. Colour overrides are stored in local storage -- clear them by clicking the X button next to each colour override in Settings.

**Filters seem to have no effect**
If clicking a filter value does not change the visible nodes, the filter may only have one unique value (all nodes match). Check the filter section -- if there is only one option, unchecking it hides all nodes of that type.`,
  },
];
