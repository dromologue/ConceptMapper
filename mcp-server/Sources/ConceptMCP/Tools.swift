import Foundation

// MARK: - Tool Definitions

public let mcpTools: [MCPToolDefinition] = [
    // Navigation
    MCPToolDefinition(
        name: "list_maps",
        description: "List all concept map (.cm) files in the maps directory. Returns name, path, and node/edge counts.",
        inputSchema: InputSchema(properties: [:], required: nil)
    ),
    MCPToolDefinition(
        name: "list_templates",
        description: "List all template (.cmt) files. Returns name, description, and node types defined.",
        inputSchema: InputSchema(properties: [:], required: nil)
    ),
    MCPToolDefinition(
        name: "open_map",
        description: "Read and parse a concept map file. Returns the full graph as JSON (nodes, edges, streams, generations).",
        inputSchema: InputSchema(
            properties: ["path": PropertySchema(type: "string", description: "File path or name of the .cm file")],
            required: ["path"]
        )
    ),
    MCPToolDefinition(
        name: "open_template",
        description: "Read a template file. Returns the taxonomy structure (node types, edge types, streams, generations).",
        inputSchema: InputSchema(
            properties: ["path": PropertySchema(type: "string", description: "File path or name of the .cmt file")],
            required: ["path"]
        )
    ),

    // Search
    MCPToolDefinition(
        name: "search_nodes",
        description: "Search nodes in a map by name, type, or property value. Returns matching nodes.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "query": PropertySchema(type: "string", description: "Search text (matches name, type, or property values)"),
                "node_type": PropertySchema(type: "string", description: "Optional: filter by node type (e.g. 'thinker', 'concept')"),
            ],
            required: ["path", "query"]
        )
    ),
    MCPToolDefinition(
        name: "get_node",
        description: "Get full details of a specific node by ID, including all properties, notes, and connections.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "node_id": PropertySchema(type: "string", description: "The node ID to look up"),
            ],
            required: ["path", "node_id"]
        )
    ),
    MCPToolDefinition(
        name: "get_connections",
        description: "Get all edges connected to a node, with the names of connected nodes.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "node_id": PropertySchema(type: "string", description: "The node ID"),
            ],
            required: ["path", "node_id"]
        )
    ),

    // Create & Edit
    MCPToolDefinition(
        name: "add_node",
        description: "Add a new node to a concept map. Saves the file immediately.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "id": PropertySchema(type: "string", description: "Unique node ID (lowercase, underscores)"),
                "name": PropertySchema(type: "string", description: "Display name"),
                "node_type": PropertySchema(type: "string", description: "Node type (e.g. 'thinker', 'concept')"),
                "stream": PropertySchema(type: "string", description: "Stream/category ID"),
                "generation": PropertySchema(type: "string", description: "Generation number"),
                "notes": PropertySchema(type: "string", description: "Optional notes text"),
            ],
            required: ["path", "id", "name", "node_type"]
        )
    ),
    MCPToolDefinition(
        name: "update_node",
        description: "Update an existing node's properties, name, notes, stream, or generation.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "node_id": PropertySchema(type: "string", description: "The node ID to update"),
                "name": PropertySchema(type: "string", description: "New display name (optional)"),
                "stream": PropertySchema(type: "string", description: "New stream ID (optional)"),
                "generation": PropertySchema(type: "string", description: "New generation number (optional)"),
                "notes": PropertySchema(type: "string", description: "New notes text (optional)"),
            ],
            required: ["path", "node_id"]
        )
    ),
    MCPToolDefinition(
        name: "delete_node",
        description: "Delete a node and all its edges from a concept map.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "node_id": PropertySchema(type: "string", description: "The node ID to delete"),
            ],
            required: ["path", "node_id"]
        )
    ),
    MCPToolDefinition(
        name: "add_edge",
        description: "Add an edge (relationship) between two nodes.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "from": PropertySchema(type: "string", description: "Source node ID"),
                "to": PropertySchema(type: "string", description: "Target node ID"),
                "edge_type": PropertySchema(type: "string", description: "Relationship type (e.g. 'chain', 'originates', 'rivalry')"),
                "note": PropertySchema(type: "string", description: "Optional description of the relationship"),
                "weight": PropertySchema(type: "string", description: "Optional weight (default 1.0)"),
            ],
            required: ["path", "from", "to", "edge_type"]
        )
    ),
    MCPToolDefinition(
        name: "update_edge",
        description: "Update an edge's note, weight, or type.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "from": PropertySchema(type: "string", description: "Source node ID"),
                "to": PropertySchema(type: "string", description: "Target node ID"),
                "note": PropertySchema(type: "string", description: "New note (optional)"),
                "weight": PropertySchema(type: "string", description: "New weight (optional)"),
                "edge_type": PropertySchema(type: "string", description: "New edge type (optional)"),
            ],
            required: ["path", "from", "to"]
        )
    ),
    MCPToolDefinition(
        name: "delete_edge",
        description: "Delete an edge between two nodes.",
        inputSchema: InputSchema(
            properties: [
                "path": PropertySchema(type: "string", description: "Path to the .cm file"),
                "from": PropertySchema(type: "string", description: "Source node ID"),
                "to": PropertySchema(type: "string", description: "Target node ID"),
            ],
            required: ["path", "from", "to"]
        )
    ),

    // Map Management
    MCPToolDefinition(
        name: "create_map",
        description: "Create a new concept map file from a template.",
        inputSchema: InputSchema(
            properties: [
                "title": PropertySchema(type: "string", description: "Map title"),
                "template": PropertySchema(type: "string", description: "Template name or path (.cmt file)"),
                "filename": PropertySchema(type: "string", description: "Output filename (without .cm extension)"),
            ],
            required: ["title", "template"]
        )
    ),
    MCPToolDefinition(
        name: "get_map_stats",
        description: "Get network statistics: node count, edge count, node types, streams, density.",
        inputSchema: InputSchema(
            properties: ["path": PropertySchema(type: "string", description: "Path to the .cm file")],
            required: ["path"]
        )
    ),
]
