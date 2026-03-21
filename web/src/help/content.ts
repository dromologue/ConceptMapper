/**
 * Help content for ConceptLLM.
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
    content: `ConceptLLM is a visual concept-mapping tool for exploring relationships between thinkers, ideas, and concepts.

When you first open the app you see the **Start Screen** with three options:

1. **New Taxonomy** -- Opens a step-by-step wizard that walks you through defining your map's structure: a title, node types, categories (streams), and time periods (generations).

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
    tags: ["taxonomy", "template", "map", "concept", "terminology", "vocabulary", "glossary"],
    content: `ConceptLLM uses a few key terms that are worth understanding upfront:

**Taxonomy** -- The structural skeleton of your concept map. It defines:
- What types of nodes you can create (e.g. Person, Concept, Theory)
- What categories (streams) exist (e.g. disciplines, schools of thought)
- What time periods (generations) the map spans
- What fields/attributes each node type has

**Template (.cmt)** -- A reusable taxonomy structure without any actual nodes or edges. You create a template by clicking "Save as Template" in the taxonomy wizard's review step. Templates appear on the start screen for quick reuse.

**Concept Map (.cm)** -- A complete map file containing both the taxonomy structure and all your nodes, edges, and notes. This is a JSON file that auto-saves as you work.

**Stream (Category)** -- A thematic grouping for nodes. Each stream has a name, colour, and optional description. Streams control the colour-coding of nodes on the canvas. In the sidebar and legend, you can filter by stream.

**Generation (Horizon / Time Period)** -- A numbered time period or phase. Generations position nodes vertically on the canvas. Each generation can have a period label (e.g. "1960-1980") and a descriptive label (e.g. "Founders").

**Node Types** -- The kinds of entities in your map. The defaults are Person (circle shape) and Concept (rectangle shape), but you can define custom types with any fields you need.

**Edges** -- Directed or undirected relationships between nodes. Edge types depend on what you are connecting (thinker-to-thinker, thinker-to-concept, concept-to-concept).`,
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
- A collapsible Streams list for filtering by category
- A collapsible Nodes list with a filter/search box

**Canvas** (centre) -- The main interactive graph visualization. Pan by dragging, zoom with scroll wheel or pinch, Shift+drag for marquee zoom.

**Auxiliary Panel** (right, appears when a node is selected) -- The Properties panel showing the selected node's attributes, with an inline name editor, stream/generation selectors, custom fields, and a connections list. A resize handle between the canvas and this panel lets you adjust width.

**Bottom Pane** (below the canvas, when open):
- Notes pane: Inline markdown editor for the selected node's notes`,
  },

  // ── Activity Bar Buttons ─────────────────────────────────────────
  {
    id: "activity-bar",
    title: "Activity Bar: What Each Button Does",
    tags: ["toolbar", "button", "icon", "activity bar"],
    content: `The Activity Bar is the narrow vertical strip on the far left. From top to bottom:

**Top group:**

1. **Full Network** (triangle/graph icon) -- Shows all nodes and edges. This is the default view.

2. **Filtered Views** -- One button per node type in your taxonomy. For example, if you have Person and Concept types, you get a People view and a Concepts view. These are generated dynamically from your taxonomy, not hardcoded.

3. **Toggle Sidebar** (panel icon) -- Shows or hides the left Explorer sidebar.

4. **Help** (question mark icon) -- Opens the searchable help panel overlay.

**Bottom group:**

5. **Edit Taxonomy** (list icon) -- Re-opens the taxonomy wizard to modify the current map's structure (node types, categories, phases, edge types).

6. **Settings** (gear icon) -- Opens the Settings modal for theme, stream colours, and edge colours.`,
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
   - Stream (category)
   - Generation (time period)
   - Any required or select-type custom fields
3. Click "Add" to place the node on the canvas.

The node is automatically selected after creation so you can immediately edit its properties.

**Editing a node:**
1. Click a node on the canvas or in the sidebar node list.
2. The Properties panel opens on the right.
3. Edit the name directly in the header input field.
4. Change the stream or generation using the dropdown selectors.
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
    title: "The Taxonomy Wizard (6 Steps)",
    tags: ["taxonomy", "wizard", "create", "new", "define", "setup", "node type", "stream", "generation"],
    content: `The Taxonomy Wizard guides you through setting up your map's structure in 6 steps. Open it from the start screen ("New Taxonomy") or from the Activity Bar (list icon at bottom) to edit an existing map.

**Step 1: Title and Description**
Give your taxonomy a title (required) and an optional description.

**Step 2: Node Types**
Define the kinds of entities in your map. Each node type has:
- Name (e.g. "Person", "Concept", "Institution")
- Shape: Circle or Rectangle (affects how nodes render on the canvas)
- Icon: A 1-2 character symbol shown in the sidebar
- Fields: Custom attributes for this type (text, select dropdown, or textarea)
- Size driven by: Optionally select a dropdown field whose value controls node size

Click "+ Add Type" for more types, or expand/collapse existing ones.

**Step 3: Edge Types**
Define the kinds of relationships in your map. Each edge type has a label, colour, directed/undirected flag, and line style (solid, dashed, dotted). Pre-configured defaults cover common patterns (teacher-pupil, rivalry, alliance, etc.) but you can add custom types.

**Step 4: Categories (Streams)**
Define your thematic groupings. Each stream has a name, colour picker, and optional description. These become the colour-coded categories visible in the sidebar and legend.

**Step 5: Horizons (Generations / Time Periods)**
Define time periods or phases. Each horizon has a number (auto-assigned), a period string (e.g. "1950-1970"), and a label (e.g. "Founders"). Horizons control vertical positioning on the canvas.

**Step 6: Review**
See a summary of everything you defined. From here you can also click **"Save as Template"** to store this structure for reuse without any nodes/edges. Click "Create" (new) or "Save" (edit mode) to finalize.

Navigation: Use Back/Next buttons at the bottom. Press Escape to cancel.`,
  },

  // ── Using an LLM to Map Content ─────────────────────────────────
  {
    id: "llm-mapping",
    title: "Using an LLM to Map Content to a Template",
    tags: ["llm", "ai", "claude", "gpt", "mapping", "extract", "prompt", "template", "generate"],
    content: `You can use any LLM (Claude, GPT-4, Llama, etc.) to generate concept map content that you then open in ConceptLLM. The workflow is: design your taxonomy in the app, export or describe it to the LLM, and have the LLM produce a .cm file you can open.

**Step 1: Design your taxonomy**

Use the Taxonomy Wizard (New Taxonomy on the start screen) to define:
- Node types with their fields (e.g. Person with importance, dates, tags)
- Streams/categories with colours
- Phases/generations with labels
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

1. **## Generations** -- a markdown table with columns: Gen, Period, Label, Attention Space Count
2. **## Streams** -- a markdown table with columns: Stream ID, Name, Colour, Description
3. **## [Type] Nodes** -- one section per node type (e.g. "## Task Nodes", "## Person Nodes"). Each node is a fenced code block (\`\`\`) containing key: value pairs. Required keys: id, name, generation, stream. Include ALL fields from the template's node type definition. End with notes: if applicable.
4. **## Edges** -- fenced code blocks with "from: [id] to: [id] type: [edge_type]" lines, each followed by "  note: [description]"

Use the stream IDs, generation numbers, and edge types defined in the template. Assign each node to the most appropriate stream and generation.

Here is the text to analyse:

[paste your source text]
---

**Step 4: Open the result**

Save the LLM's output as a .cm file and open it in ConceptLLM (File > Open or Cmd+O). The app parses the markdown format and renders the concept map.

**Tips for better results:**
- Include the full .cmt template so the LLM knows exact field names and options.
- Ask the LLM to use the specific stream IDs and generation numbers from the template.
- For select-type fields (like importance or status), tell the LLM to use only the defined options.
- Review and edit the generated .cm file before opening -- fix any formatting issues.
- Longer, more detailed source text produces richer maps.
- You can iteratively add content: open the generated map, then manually add nodes and edges the LLM missed.

**Example node block format:**

\`\`\`
id:               my_node_id
name:             My Node Name
generation:       2
stream:           my_stream
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
- **Node colour:** Determined by the node's stream (category).
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
    title: "Sidebar: Explorer, Streams, and Filtering",
    tags: ["sidebar", "explorer", "filter", "stream", "category", "list"],
    content: `The sidebar (toggle with the panel icon in the Activity Bar) has several sections:

**Action Buttons** (top)
One "+ [Type]" button per node type defined in your taxonomy, plus a "+ Edge" button. During edge-drawing mode, this button changes to "Cancel Edge".

**Filter Sections** (collapsible, collapsed by default)
Click any section header to expand it:

- **Streams** -- Lists all streams/categories with colour dots. Click a value to uncheck it (hide nodes of that category). Click again to re-check. A "Show All" button appears when any filter is active.
- **Phases** -- Lists all generations/phases. Same toggle behaviour.
- **Attribute Filters** -- One section per filterable field from your node type configs. Select-type fields always appear. Text fields appear when they have 30 or fewer unique values. Click values to uncheck/recheck.
- **Date Range** -- If your node types have date_from/date_to fields, a date range filter appears with From/To year inputs.

**Filter logic:**
- Between categories (e.g. Streams AND Phases): nodes must pass ALL active filters.
- Within a category (e.g. two streams checked): nodes matching ANY checked value are shown.
- Unchecked values hide matching nodes from both the canvas and the node list.

**Nodes** (collapsible)
A searchable, scrollable list of all visible nodes (respects active filters) sorted alphabetically. Each entry shows a colour indicator and the node name. Use the filter input to search by name. Click a node to select it on the canvas.`,
  },

  // ── Notes Editor ─────────────────────────────────────────────────
  {
    id: "notes-editor",
    title: "The Notes Editor",
    tags: ["notes", "markdown", "editor", "write", "text", "format"],
    content: `Each node can have rich-text notes attached. The Notes pane is a live inline markdown editor that opens below the canvas.

**To open:** Select a node, then click "Edit Notes" in the Properties panel header.

**Supported markdown:**
- # Heading, ## Subheading, ### etc.
- **bold text** using double asterisks
- *italic text* using single asterisks
- \`inline code\` using backticks
- - list items using dashes
- > blockquotes using greater-than

Formatting renders live as you type -- syntax markers stay visible but styled dimly so you can see the structure.

**Relationship context:** If the selected node has edges with notes, these appear at the top of the notes pane as "Relationship Context" -- read-only summaries of edge annotations.

**Auto-save:** Notes save automatically after 500ms of idle typing.

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

**Stream Colours**
Override the default colour for any stream/category. Click the colour swatch to pick a new colour. Click the X button to reset to the taxonomy default.

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
    content: `ConceptLLM works with several file formats:

**.cm (Concept Map)** -- The primary format. This is a JSON file containing:
- Version number
- Template reference
- All nodes with their properties
- All edges
- External shocks and structural observations

The app auto-saves to the source .cm file as you make changes (with a 2-second debounce).

**.cmt (Concept Map Template)** -- A JSON file containing only the taxonomy structure (node types, streams, generations) without any nodes or edges. Used for reusable templates.

**.json** -- The app can open plain .json files if they follow the concept map data schema.

**Markdown Export** -- Use File > Export (Cmd+Shift+E) to export a human-readable markdown version of your map, with tables for generations and streams, fenced code blocks for nodes, and structured edge listings.

**Image Export** -- Use File > Export Image (Cmd+E) to save the current canvas view as a PNG image.

**Opening files:**
- File > Open (Cmd+O) or the "Open File" button on the start screen
- The app accepts .cm, .cmt, and .json files
- Legacy markdown (.cm) files from older versions are automatically migrated to the new JSON format`,
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
    content: `The Network Analysis panel (graph icon in the Activity Bar) provides quantitative tools for understanding your concept map's structure.

**Overview Metrics**

- **Density** -- What fraction of all possible connections actually exist. Dense networks (close to 1.0) mean everything connects to everything; sparse networks (close to 0) have selective connections.
- **Average Degree** -- The typical number of connections per node. Higher means a more interconnected network.
- **Diameter** -- The longest shortest path between any two nodes. Measures how "wide" the network is — how many steps to get from one extreme to the other.
- **Modularity** -- How cleanly the network divides into distinct groups. High modularity (above 0.3) means clear communities; low means an integrated, cross-cutting network.

**Node Metrics (What makes a node important?)**

- **Connections** (Degree) -- Simply how many edges a node has. The most connected nodes are the most "active" in the network.
- **Bridge Score** (Betweenness Centrality) -- How often a node sits on the shortest path between other nodes. High bridge scores identify concepts that act as connectors or bottlenecks between different parts of the network. A node with few connections but a high bridge score is structurally critical.
- **Influence** (Eigenvector Centrality) -- Whether a node is connected to other important nodes. This is recursive prestige — it is not enough to have many connections; they need to be connections to well-connected nodes.
- **Reach** (Closeness Centrality) -- How quickly a node can reach every other node. Nodes with high reach are at the "centre" of the network in terms of average distance.

**Communities**

The app detects natural groupings in your network using label propagation — nodes that are more densely connected to each other than to the rest of the network form a community. Toggle "Color by community" to see these groupings visually overlaid on the canvas. Click a community to highlight just its members.

Compare detected communities against your own stream/category assignments — differences often reveal unexpected structural patterns.

**Path Finder**

Select any two nodes to find the shortest path between them. The path is highlighted on the canvas in orange. The result shows:

- **Distance** -- Number of steps (edges) between the two nodes.
- **Routes** -- How many equally-short paths exist. Multiple routes mean the connection is structurally redundant (robust). A single route means it is fragile.
- **Weakest Link** -- The single edge on the path whose removal would most increase the distance between the two nodes. This surfaces hidden dependencies.

**K-Core (in Node Rankings)**

The k-core number of a node indicates which "shell" of the network it belongs to. The innermost core (highest k) contains the most tightly interconnected concepts — the structural bedrock of the network. Peripheral nodes (k=1) are connected to only one part of the network.`,
  },

  // ── MCP Server ──────────────────────────────────────────────────
  {
    id: "mcp-server",
    title: "MCP Server: Using ConceptLLM with AI Assistants",
    tags: ["mcp", "server", "claude", "ai", "llm", "api", "tools", "integration", "model context protocol"],
    content: `ConceptLLM includes an MCP (Model Context Protocol) server that lets AI assistants like Claude directly read, search, create, and edit concept maps.

**What is MCP?**

MCP is a protocol that allows AI assistants to use external tools. When configured, your AI assistant gains 15 tools for working with your concept maps — searching nodes, adding relationships, creating new maps from templates, and more.

**Setup for Claude Desktop**

1. Build the MCP server (one-time):

Open Terminal and run:
\`\`\`
cd /path/to/concept-mapper/mcp-server
swift build -c release
\`\`\`

2. Find the built binary:
\`\`\`
.build/release/ConceptMCP
\`\`\`

3. Add to Claude Desktop's configuration file at:
\`~/Library/Application Support/Claude/claude_desktop_config.json\`

Add this to the "mcpServers" section:
\`\`\`json
{
  "mcpServers": {
    "conceptllm": {
      "command": "/path/to/concept-mapper/mcp-server/.build/release/ConceptMCP"
    }
  }
}
\`\`\`

4. Restart Claude Desktop. You should see ConceptLLM tools available.

**Custom directories**

By default, the MCP server reads maps from:
\`~/Library/Application Support/ConceptLLM/Maps/\`
and templates from:
\`~/Library/Application Support/ConceptLLM/templates/\`

Override with flags:
\`\`\`
ConceptMCP --maps-dir ~/my-maps --templates-dir ~/my-templates
\`\`\`

**Available Tools (15)**

*Navigation:*
- **list_maps** — List all concept maps with node/edge counts
- **list_templates** — List all available templates
- **open_map** — Read a complete map (nodes, edges, streams, generations)
- **open_template** — Read a template's taxonomy structure

*Search:*
- **search_nodes** — Find nodes by name, type, or property value
- **get_node** — Get full details of a node (properties, notes, connections)
- **get_connections** — Get all edges connected to a node

*Create & Edit:*
- **add_node** — Add a new node to a map
- **update_node** — Update a node's name, properties, notes, stream, or generation
- **delete_node** — Remove a node and all its edges
- **add_edge** — Create a relationship between two nodes
- **update_edge** — Change an edge's note, weight, or type
- **delete_edge** — Remove a relationship

*Map Management:*
- **create_map** — Create a new map from a template
- **get_map_stats** — Get network statistics (density, node types, edge types)

**Example conversation with Claude**

You: "Open the organisational learning map and find all nodes connected to Bourdieu"

Claude will use \`open_map\` then \`get_connections\` to show you Bourdieu's network of concepts and relationships.

You: "Add a new thinker node for Hannah Arendt in the institution stream, generation 2"

Claude will use \`add_node\` to create the node and save the .cm file.

You: "Create an edge from Arendt to the concept of public space with type 'originates'"

Claude will use \`add_edge\` to establish the relationship.

**Changes are saved immediately** to the .cm files. If ConceptLLM is open, reload the file to see the AI's changes.

**Troubleshooting**

- *Tools not appearing in Claude Desktop:* Check the path in claude_desktop_config.json. The binary must exist at the specified path. Restart Claude Desktop after config changes.
- *"File not found" errors:* The MCP server looks in the default ConceptLLM directories. If your maps are elsewhere, use --maps-dir.
- *Maps not appearing in ConceptLLM:* Save new maps to ~/Library/Application Support/ConceptLLM/Maps/ so they show on the start screen.`,
  },

  // ── FAQ ──────────────────────────────────────────────────────────
  {
    id: "faq",
    title: "Frequently Asked Questions",
    tags: ["faq", "question", "help", "how", "why", "what"],
    content: `**Q: How do I get started with a blank map?**
A: Click "New Taxonomy" on the start screen and follow the 6-step wizard. At minimum, give it a title, keep the default node types (Person and Concept), add at least one stream/category, and one generation.

**Q: What is the difference between a stream and a generation?**
A: Streams are thematic categories (like academic disciplines or schools of thought) -- they control node colour. Generations are time periods (like decades or eras) -- they control vertical positioning on the canvas.

**Q: Can I rename or redefine node types after creating a map?**
A: Yes. Click the taxonomy/list icon at the bottom of the Activity Bar to re-open the wizard in edit mode. Changes to the taxonomy apply to the existing map.

**Q: How do I delete a node?**
A: Node deletion is not yet available through the UI. You can edit the .cm file directly (it is JSON) and remove the node entry.

**Q: How do I delete an edge?**
A: Edge deletion is not yet available through the UI. You can edit the .cm file directly.

**Q: Where are my files saved?**
A: When you open or create a .cm file, the app auto-saves to that file path with a 2-second debounce after each change. The save indicator in the status bar confirms when a save occurs.

**Q: Can I use AI to populate a concept map?**
A: Yes. Design your taxonomy in the app, export the .cmt template, and use any LLM (Claude, GPT-4, etc.) to generate a .cm file from your source text. See "Using an LLM to Map Content" in this help for detailed instructions and a prompt template.

**Q: What does "Save as Template" do?**
A: It stores the current taxonomy structure (node types, streams, generations) without any nodes or edges. The template appears on the start screen for quick reuse when creating new maps.

**Q: How do I customise node colours?**
A: Node colours come from their stream/category. Go to Settings > Stream Colours to change the colour for any stream. This affects all nodes in that stream.

**Q: Can I have more than two node types?**
A: Yes. In the taxonomy wizard (Step 2), click "+ Add Type" to create as many node types as you need. Each can have its own shape, icon, and custom fields.

**Q: What is the "Size driven by" option in the node type configuration?**
A: If a node type has a select-type field (e.g. "Importance" with options major, minor, etc.), you can designate that field to control the visual size of nodes on the canvas. Higher-ranked options produce larger nodes.

**Q: How do I share a map with someone?**
A: Send them the .cm file. They can open it in ConceptLLM. The file is self-contained JSON. You can also export a markdown version or a PNG image for people who do not have the app.

**Q: What happens if I close the app without saving?**
A: If you opened a file, the app auto-saves changes as you work (2-second debounce). If you created a new taxonomy and never saved the file, the data may be lost.`,
  },

  // ── Troubleshooting ──────────────────────────────────────────────
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    tags: ["trouble", "error", "problem", "fix", "issue", "bug", "not working"],
    content: `**"No nodes found" error when opening a file**
The file may not be in a recognised format. ConceptLLM expects either a v2 JSON data file (.cm) or a legacy structured markdown file. Check that the file has the correct structure.

**Canvas is blank after creating a taxonomy**
This is expected -- a new taxonomy has no nodes yet. Use the sidebar's "+ [Type]" buttons to add nodes, or use Map Text to populate from a text source.

**Nodes appear in unexpected positions**
Node positioning is determined by stream (horizontal) and generation (vertical). Check that your nodes have the correct stream and generation assigned in the Properties panel.

**Auto-save is not working**
Auto-save requires that the file was opened from disk (giving the app a file path to write to). If you are working with an unsaved new map, use File > Save As (Cmd+S) to establish a file path first.

**Theme colours look wrong after updating**
Try closing and re-opening Settings. Colour overrides are stored in local storage -- clear them by clicking the X button next to each colour override in Settings.

**Filters seem to have no effect**
If clicking a filter value does not change the visible nodes, the filter may only have one unique value (all nodes match). Check the filter section -- if there is only one option, unchecking it hides all nodes of that type.`,
  },
];
