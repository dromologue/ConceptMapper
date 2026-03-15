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

3. **Map Text** -- (Requires LLM setup and at least one saved template.) Paste or upload text and let an AI extract nodes and relationships into an existing taxonomy structure.

If you have previously saved templates, they appear below these buttons. Click one to start a new map pre-loaded with that template's structure.

**Recommended first steps:**
- Click "New Taxonomy" and follow the 6-step wizard.
- Add a few nodes using the sidebar buttons.
- Draw edges between nodes to define relationships.
- Open Settings (gear icon) to choose a theme and optionally configure an LLM provider.`,
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
- Mapping icon: Open Map Text modal (only visible when LLM is configured)
- Chat icon: Toggle the chat pane (only visible when LLM is configured)
- Help icon: Open the searchable help panel
- Taxonomy icon (bottom): Edit the current taxonomy structure
- Gear icon (bottom): Open Settings

**Sidebar** (left panel) -- The Explorer panel showing:
- Action buttons to add nodes (one per node type) and edges
- A collapsible Streams list for filtering by category
- A collapsible Nodes list with a filter/search box

**Canvas** (centre) -- The main interactive graph visualization. Pan by dragging, zoom with scroll wheel or pinch, Shift+drag for marquee zoom.

**Auxiliary Panel** (right, appears when a node is selected) -- The Properties panel showing the selected node's attributes, with an inline name editor, stream/generation selectors, custom fields, and a connections list. A resize handle between the canvas and this panel lets you adjust width.

**Bottom Panes** (below the canvas, when open):
- Notes pane: Inline markdown editor for the selected node's notes
- Chat pane: Conversation with the LLM about your concept map`,
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

4. **Map Text** (converging arrows icon) -- Opens the Map Text modal where you can paste text for AI-powered extraction. Only visible when an LLM provider is configured in Settings.

5. **Chat** (speech bubble icon) -- Toggles the chat pane at the bottom of the canvas. Only visible when an LLM provider is configured.

6. **Help** (question mark icon) -- Opens the searchable help panel overlay.

**Bottom group:**

7. **Edit Taxonomy** (list icon) -- Re-opens the taxonomy wizard to modify the current map's structure (node types, categories, horizons, edge types).

8. **Settings** (gear icon) -- Opens the Settings modal for theme, LLM configuration, stream colours, and edge colours.`,
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

  // ── LLM Setup ────────────────────────────────────────────────────
  {
    id: "llm-setup",
    title: "Setting Up an LLM Provider",
    tags: ["llm", "ai", "api", "key", "anthropic", "openai", "ollama", "configure", "setup", "settings"],
    content: `ConceptLLM can use a large language model to extract concepts from text and to chat about your map. This is optional -- the app works fully without it.

**To configure an LLM:**

1. Click the **gear icon** (Settings) in the Activity Bar.
2. Scroll to the **LLM Configuration** section.
3. Choose a provider. The settings panel shows step-by-step setup instructions for each one:

   **Anthropic (recommended):**
   - Create a free account at console.anthropic.com
   - Add a payment method (pay-as-you-go, typically ~$0.01 per request)
   - Click the "Get Anthropic API Key" link in the settings panel -- it takes you directly to the API Keys page
   - Create a new key and paste it into the API Key field
   - Keys start with "sk-ant-" -- the field validates the format automatically

   **OpenAI:**
   - Create an account at platform.openai.com
   - Add a payment method in Billing
   - Click the "Get OpenAI API Key" link to go straight to the API Keys page
   - Create a new secret key and paste it in
   - Keys start with "sk-"

   **Ollama (free, local):**
   - Install Ollama from ollama.com
   - Run: ollama pull llama3.2
   - No API key needed -- everything runs on your machine

4. The API key field shows green when the format looks correct, amber if something seems off.
5. Optionally change the **model** name -- the field suggests popular models.
6. Optionally adjust **temperature** (0.0 = deterministic, 1.0 = creative; default 0.3).
7. Click **"Test Connection"** -- error messages explain what went wrong (invalid key, payment needed, rate limit, etc.).
8. Click **"Save"** to persist your configuration.

Once saved, the Map Text and Chat buttons appear in the Activity Bar.

**API key security:**
- In the macOS app, your configuration is stored via the Swift bridge in the app's sandboxed storage, not in the browser.
- The key is sent only to the configured provider's API endpoint.
- For Ollama, everything stays on your local machine.

**Supported models:**
- Anthropic: claude-sonnet-4-20250514, claude-opus-4-20250514, claude-haiku-4-20250506
- OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo, o1
- Ollama: llama3.2, mistral, mixtral, codellama, phi3 (or any model you have pulled)`,
  },

  // ── Map Text Feature ─────────────────────────────────────────────
  {
    id: "map-text",
    title: "Map Text: AI-Powered Concept Extraction",
    tags: ["map", "text", "mapping", "extract", "ai", "llm", "paste", "upload", "file"],
    content: `The Map Text feature uses an LLM to read a passage of text and extract nodes and relationships into your taxonomy structure.

**Prerequisites:**
- An LLM provider configured and saved in Settings.
- At least one saved template (so the LLM knows what categories and node types to use).

**How to use it:**

1. Click the **Map Text button** (converging arrows icon) in the Activity Bar, or click "Map Text" on the start screen.
2. If you have multiple templates, **pick which taxonomy** to map into. If the map already has a template, it is pre-selected.
3. Either:
   - **Paste text** directly into the text area, or
   - Click **"Upload File"** to load a .txt, .md, or .markdown file.
4. Click **"Map to Taxonomy"**.
5. The LLM reads your text and returns a structured JSON with nodes, edges, and metadata matching your taxonomy's streams, generations, and node types.
6. The result loads as a new concept map on the canvas.

**Tips:**
- Longer, more detailed text produces better results.
- The LLM uses the taxonomy's stream names, generation labels, and node type definitions to categorize what it finds.
- If the result is not what you expected, click "Try Again" or adjust the text and re-map.
- You can always manually edit the resulting map after extraction.
- A lower temperature (0.1-0.3) tends to produce more consistent, structured output.`,
  },

  // ── Chat Feature ─────────────────────────────────────────────────
  {
    id: "chat",
    title: "Chat: Talk to the LLM About Your Map",
    tags: ["chat", "ai", "llm", "ask", "question", "conversation", "talk"],
    content: `The Chat pane lets you have a conversation with the LLM about your concept map. The LLM has full context of all your nodes, edges, streams, and generations.

**How to use it:**

1. Click the **Chat button** (speech bubble icon) in the Activity Bar.
2. A pane opens below the canvas.
3. Type a question or instruction and press **Enter** (or click Send).
4. The LLM responds with analysis, suggestions, or answers about your map.

**Example questions you can ask:**
- "What are the main intellectual traditions in this map?"
- "Which thinkers have the most connections?"
- "Summarise the relationship between [Person A] and [Person B]."
- "What concepts are contested?"
- "Suggest additional thinkers who might belong in the [Stream] category."
- "What gaps do you see in this map?"

**Notes:**
- The chat maintains conversation history within the session.
- Each message sends the full current state of your map to the LLM, so it always has up-to-date context.
- Press Shift+Enter for multi-line input (single Enter sends).
- The chat pane is resizable by dragging the border between it and the canvas.
- Opening the chat pane closes the notes pane (and vice versa).`,
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
    content: `The sidebar (toggle with the panel icon in the Activity Bar) has three sections:

**Action Buttons** (top)
One "+ [Type]" button per node type defined in your taxonomy, plus a "+ Edge" button. During edge-drawing mode, this button changes to "Cancel Edge".

**Streams** (collapsible)
Lists all streams/categories with their colour dots. Click a stream to filter the canvas to show only nodes in that category. Click additional streams to show multiple. A "Show All" button appears when filtering is active.

**Nodes** (collapsible)
A searchable, scrollable list of all nodes sorted alphabetically. Each entry shows:
- A colour indicator matching the node's stream
- The node name
- A type icon (first character of the type label)

Use the filter input at the top of the node list to search by name. Click a node to select it on the canvas and open its Properties panel.`,
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

All colour customisations persist across sessions via local storage.`,
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

**Chat:**
- Enter -- Send message
- Shift+Enter -- New line in message

**General:**
- Cmd+? -- Toggle help overlay (native macOS help)`,
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

**Q: Do I need an API key to use the app?**
A: No. The LLM features (Map Text and Chat) are optional. The full concept mapping experience works without any AI integration.

**Q: Which LLM provider should I choose?**
A: Anthropic (Claude) tends to produce the best structured output for taxonomy mapping. OpenAI (GPT-4o) is a strong alternative. Ollama is free and local but results depend on which model you run -- larger models work better.

**Q: Why do I not see the Map Text or Chat buttons?**
A: These buttons only appear after you configure and save an LLM provider in Settings. Open Settings (gear icon) and complete the LLM Configuration section.

**Q: The LLM returned bad or incomplete results from Map Text. What can I do?**
A: Try these approaches:
1. Click "Try Again" -- results can vary between runs.
2. Provide more detailed source text.
3. Lower the temperature to 0.1-0.2 for more deterministic output.
4. Use a more capable model (e.g. claude-sonnet-4 instead of haiku, or gpt-4o instead of gpt-4o-mini).
5. Edit the resulting map manually after extraction.

**Q: Is my API key secure?**
A: In the macOS app, configuration is stored in the app's sandboxed storage via the Swift bridge. Your key is only sent to the provider's API endpoint. For maximum security, use Ollama (fully local, no API key needed).

**Q: Can I use this in a web browser?**
A: The app is designed as a macOS native app with a WKWebView. While the React UI can technically run in a browser, file operations and LLM calls for Anthropic/OpenAI require the native Swift bridge. Ollama works in the browser if you have it running locally.

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

**Q: Can the chat modify my map?**
A: Currently, the chat is read-only -- the LLM can analyse and answer questions about your map but cannot make direct changes to it. You would need to manually apply any suggestions.

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

**LLM test connection fails**
- Anthropic/OpenAI: Verify your API key is correct and has not expired. Check that you have billing enabled on your account.
- Ollama: Ensure the Ollama server is running (run "ollama serve" in terminal). Verify the base URL is correct (default: http://localhost:11434).
- All providers: Check your internet connection for cloud providers.

**"Browser mode only supports Ollama" error**
If you are testing in a web browser instead of the macOS app, only Ollama is supported because Anthropic and OpenAI API calls require the native Swift bridge to avoid CORS restrictions.

**Map Text returns empty or malformed results**
- Ensure your source text is substantial enough for the LLM to work with.
- Try a more capable model.
- Lower the temperature for more structured output.
- Check the browser console (View > Developer > JavaScript Console in the macOS app, if inspectable) for error details.

**Canvas is blank after creating a taxonomy**
This is expected -- a new taxonomy has no nodes yet. Use the sidebar's "+ [Type]" buttons to add nodes, or use Map Text to populate from a text source.

**Nodes appear in unexpected positions**
Node positioning is determined by stream (horizontal) and generation (vertical). Check that your nodes have the correct stream and generation assigned in the Properties panel.

**Auto-save is not working**
Auto-save requires that the file was opened from disk (giving the app a file path to write to). If you are working with an unsaved new map, use File > Save As (Cmd+S) to establish a file path first.

**Theme colours look wrong after updating**
Try closing and re-opening Settings. Colour overrides are stored in local storage -- clear them by clicking the X button next to each colour override in Settings.

**Chat says "Error" in the response**
Check the error message in the chat response. Common causes:
- API key expired or invalid
- Model not available on your account
- Rate limit exceeded
- Network connectivity issue
For Ollama: the model may not be pulled yet (run "ollama pull [model-name]").`,
  },
];
