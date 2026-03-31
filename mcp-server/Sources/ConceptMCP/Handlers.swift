import Foundation

// MARK: - File Paths

public struct MCPConfig {
    public let mapsDir: String
    public let templatesDir: String

    public init(mapsDir: String, templatesDir: String) {
        self.mapsDir = mapsDir
        self.templatesDir = templatesDir
    }

    public static func defaultConfig() -> MCPConfig {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let base = home.appendingPathComponent("Documents/ConceptMapper")
        return MCPConfig(
            mapsDir: base.appendingPathComponent("Maps").path,
            templatesDir: base.appendingPathComponent("Templates").path
        )
    }

    /// Resolve a user-provided path to a file within an allowed directory.
    /// Throws if the resolved path escapes the allowed directory (path traversal protection).
    public func resolvePath(_ input: String, ext: String, dir: String) throws -> String {
        let raw: String
        if input.hasPrefix("/") || input.hasPrefix("~") {
            raw = (input as NSString).expandingTildeInPath
        } else {
            let withExt = input.hasSuffix(ext) ? input : input + ext
            raw = (dir as NSString).appendingPathComponent(withExt)
        }
        let resolved = URL(fileURLWithPath: raw).standardizedFileURL.path
        let allowedDir = URL(fileURLWithPath: dir).standardizedFileURL.path
        guard resolved.hasPrefix(allowedDir + "/") || resolved == allowedDir else {
            throw NSError(domain: "MCP", code: 403,
                userInfo: [NSLocalizedDescriptionKey: "Path '\(input)' resolves outside allowed directory"])
        }
        return resolved
    }

    public func resolveMapPath(_ input: String) throws -> String { try resolvePath(input, ext: ".cm", dir: mapsDir) }
    public func resolveTemplatePath(_ input: String) throws -> String { try resolvePath(input, ext: ".cmt", dir: templatesDir) }
}

// MARK: - Handler

public func handleTool(_ name: String, _ args: [String: AnyCodable]?, config: MCPConfig) throws -> String {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

    switch name {
    case "list_maps":
        return try listMaps(config: config, encoder: encoder)
    case "list_templates":
        return try listTemplates(config: config, encoder: encoder)
    case "open_map":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        return try openMap(path: path, encoder: encoder)
    case "open_template":
        let path = try config.resolveTemplatePath(args?["path"]?.stringValue ?? "")
        return try openTemplate(path: path)
    case "search_nodes":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        let query = args?["query"]?.stringValue ?? ""
        let nodeType = args?["node_type"]?.stringValue
        return try searchNodes(path: path, query: query, nodeType: nodeType, encoder: encoder)
    case "get_node":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        let nodeId = args?["node_id"]?.stringValue ?? ""
        return try getNode(path: path, nodeId: nodeId, encoder: encoder)
    case "get_connections":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        let nodeId = args?["node_id"]?.stringValue ?? ""
        return try getConnections(path: path, nodeId: nodeId, encoder: encoder)
    case "add_node":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        return try addNode(path: path, args: args, encoder: encoder)
    case "update_node":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        return try updateNode(path: path, args: args, encoder: encoder)
    case "delete_node":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        let nodeId = args?["node_id"]?.stringValue ?? ""
        return try deleteNode(path: path, nodeId: nodeId)
    case "add_edge":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        return try addEdge(path: path, args: args)
    case "update_edge":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        return try updateEdge(path: path, args: args)
    case "delete_edge":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        let from = args?["from"]?.stringValue ?? ""
        let to = args?["to"]?.stringValue ?? ""
        return try deleteEdgeFn(path: path, from: from, to: to)
    case "create_map":
        return try createMap(args: args, config: config)
    case "get_map_stats":
        let path = try config.resolveMapPath(args?["path"]?.stringValue ?? "")
        return try getMapStats(path: path, encoder: encoder)
    default:
        throw NSError(domain: "MCP", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unknown tool: \(name)"])
    }
}

// MARK: - Tool Implementations

private func readMap(_ path: String) throws -> ConceptMap {
    let content = try String(contentsOfFile: path, encoding: .utf8)
    return parseCMFile(content)
}

private func writeMap(_ map: ConceptMap, to path: String) throws {
    let content = writeCMFile(map)
    try content.write(toFile: path, atomically: true, encoding: .utf8)
}

private func listMaps(config: MCPConfig, encoder: JSONEncoder) throws -> String {
    let fm = FileManager.default
    try fm.createDirectory(atPath: config.mapsDir, withIntermediateDirectories: true)
    let files = try fm.contentsOfDirectory(atPath: config.mapsDir)
        .filter { $0.hasSuffix(".cm") }
        .sorted()

    var results: [[String: Any]] = []
    for file in files {
        let path = (config.mapsDir as NSString).appendingPathComponent(file)
        let map = try readMap(path)
        results.append([
            "name": file,
            "path": path,
            "title": map.title ?? file,
            "nodes": map.nodes.count,
            "edges": map.edges.count,
        ])
    }
    let data = try JSONSerialization.data(withJSONObject: results, options: .prettyPrinted)
    return String(data: data, encoding: .utf8) ?? "[]"
}

private func listTemplates(config: MCPConfig, encoder: JSONEncoder) throws -> String {
    let fm = FileManager.default
    try fm.createDirectory(atPath: config.templatesDir, withIntermediateDirectories: true)
    let files = try fm.contentsOfDirectory(atPath: config.templatesDir)
        .filter { $0.hasSuffix(".cmt") }
        .sorted()

    var results: [[String: Any]] = []
    for file in files {
        let path = (config.templatesDir as NSString).appendingPathComponent(file)
        if let data = fm.contents(atPath: path),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            results.append([
                "name": file,
                "path": path,
                "title": json["title"] as? String ?? file,
                "description": json["description"] as? String ?? "",
            ])
        }
    }
    let data = try JSONSerialization.data(withJSONObject: results, options: .prettyPrinted)
    return String(data: data, encoding: .utf8) ?? "[]"
}

private func openMap(path: String, encoder: JSONEncoder) throws -> String {
    let map = try readMap(path)
    let data = try encoder.encode(map)
    return String(data: data, encoding: .utf8) ?? "{}"
}

private func openTemplate(path: String) throws -> String {
    return try String(contentsOfFile: path, encoding: .utf8)
}

private func searchNodes(path: String, query: String, nodeType: String?, encoder: JSONEncoder) throws -> String {
    let map = try readMap(path)
    let q = query.lowercased()
    let matches = map.nodes.filter { node in
        if let nt = nodeType, node.nodeType != nt { return false }
        if node.name.lowercased().contains(q) { return true }
        if node.id.lowercased().contains(q) { return true }
        if node.nodeType.lowercased().contains(q) { return true }
        for (_, v) in node.fields { if v.lowercased().contains(q) { return true } }
        if node.notes?.lowercased().contains(q) == true { return true }
        return false
    }
    let data = try encoder.encode(matches)
    return String(data: data, encoding: .utf8) ?? "[]"
}

private func getNode(path: String, nodeId: String, encoder: JSONEncoder) throws -> String {
    let map = try readMap(path)
    guard let node = map.nodes.first(where: { $0.id == nodeId }) else {
        return "{\"error\": \"Node '\(nodeId)' not found\"}"
    }
    let connections = map.edges.filter { $0.from == nodeId || $0.to == nodeId }
    let result: [String: Any] = [
        "node": try JSONSerialization.jsonObject(with: encoder.encode(node)),
        "connections": connections.map { e -> [String: Any] in
            let otherId = e.from == nodeId ? e.to : e.from
            let otherName = map.nodes.first { $0.id == otherId }?.name ?? otherId
            return ["from": e.from, "to": e.to, "type": e.edgeType, "other_name": otherName,
                    "note": e.note as Any, "weight": e.weight]
        }
    ]
    let data = try JSONSerialization.data(withJSONObject: result, options: .prettyPrinted)
    return String(data: data, encoding: .utf8) ?? "{}"
}

private func getConnections(path: String, nodeId: String, encoder: JSONEncoder) throws -> String {
    let map = try readMap(path)
    let connections = map.edges.filter { $0.from == nodeId || $0.to == nodeId }
    let results = connections.map { e -> [String: Any] in
        let otherId = e.from == nodeId ? e.to : e.from
        let otherName = map.nodes.first { $0.id == otherId }?.name ?? otherId
        return ["from": e.from, "to": e.to, "type": e.edgeType,
                "other_id": otherId, "other_name": otherName,
                "note": e.note as Any, "weight": e.weight]
    }
    let data = try JSONSerialization.data(withJSONObject: results, options: .prettyPrinted)
    return String(data: data, encoding: .utf8) ?? "[]"
}

private func addNode(path: String, args: [String: AnyCodable]?, encoder: JSONEncoder) throws -> String {
    var map = try readMap(path)
    let id = args?["id"]?.stringValue ?? ""
    guard !id.isEmpty else { return "{\"error\": \"Missing node id\"}" }
    guard !map.nodes.contains(where: { $0.id == id }) else { return "{\"error\": \"Node '\(id)' already exists\"}" }

    var fields: [String: String] = [:]
    // Any args not in the reserved set go into fields
    let reserved: Set<String> = ["path", "id", "name", "node_type", "stream", "generation", "notes"]
    for (k, v) in (args ?? [:]) {
        if !reserved.contains(k), let s = v.stringValue { fields[k] = s }
    }

    let node = CMNode(
        id: id,
        nodeType: args?["node_type"]?.stringValue ?? "node",
        name: args?["name"]?.stringValue ?? id,
        generation: args?["generation"]?.stringValue.flatMap { Int($0) },
        stream: args?["stream"]?.stringValue,
        fields: fields,
        notes: args?["notes"]?.stringValue
    )
    map.nodes.append(node)
    try writeMap(map, to: path)
    return "{\"success\": true, \"message\": \"Node '\(id)' added\", \"total_nodes\": \(map.nodes.count)}"
}

private func updateNode(path: String, args: [String: AnyCodable]?, encoder: JSONEncoder) throws -> String {
    var map = try readMap(path)
    let nodeId = args?["node_id"]?.stringValue ?? ""
    guard let idx = map.nodes.firstIndex(where: { $0.id == nodeId }) else {
        return "{\"error\": \"Node '\(nodeId)' not found\"}"
    }
    if let name = args?["name"]?.stringValue { map.nodes[idx].name = name }
    if let stream = args?["stream"]?.stringValue { map.nodes[idx].stream = stream }
    if let gen = args?["generation"]?.stringValue, let g = Int(gen) { map.nodes[idx].generation = g }
    if let notes = args?["notes"]?.stringValue { map.nodes[idx].notes = notes }

    // Update any extra fields
    let reserved: Set<String> = ["path", "node_id", "name", "stream", "generation", "notes"]
    for (k, v) in (args ?? [:]) {
        if !reserved.contains(k), let s = v.stringValue { map.nodes[idx].fields[k] = s }
    }

    try writeMap(map, to: path)
    return "{\"success\": true, \"message\": \"Node '\(nodeId)' updated\"}"
}

private func deleteNode(path: String, nodeId: String) throws -> String {
    var map = try readMap(path)
    let before = map.nodes.count
    map.nodes.removeAll { $0.id == nodeId }
    map.edges.removeAll { $0.from == nodeId || $0.to == nodeId }
    guard map.nodes.count < before else { return "{\"error\": \"Node '\(nodeId)' not found\"}" }
    try writeMap(map, to: path)
    return "{\"success\": true, \"message\": \"Node '\(nodeId)' and its edges deleted\"}"
}

private func addEdge(path: String, args: [String: AnyCodable]?) throws -> String {
    var map = try readMap(path)
    let from = args?["from"]?.stringValue ?? ""
    let to = args?["to"]?.stringValue ?? ""
    let edgeType = args?["edge_type"]?.stringValue ?? "chain"
    guard !from.isEmpty, !to.isEmpty else { return "{\"error\": \"Missing from/to\"}" }

    let edge = CMEdge(
        from: from, to: to, edgeType: edgeType, directed: true,
        weight: Double(args?["weight"]?.stringValue ?? "1.0") ?? 1.0,
        note: args?["note"]?.stringValue
    )
    map.edges.append(edge)
    try writeMap(map, to: path)
    return "{\"success\": true, \"message\": \"Edge \(from) → \(to) (\(edgeType)) added\"}"
}

private func updateEdge(path: String, args: [String: AnyCodable]?) throws -> String {
    var map = try readMap(path)
    let from = args?["from"]?.stringValue ?? ""
    let to = args?["to"]?.stringValue ?? ""
    guard let idx = map.edges.firstIndex(where: { $0.from == from && $0.to == to }) else {
        return "{\"error\": \"Edge \(from) → \(to) not found\"}"
    }
    if let note = args?["note"]?.stringValue { map.edges[idx].note = note }
    if let w = args?["weight"]?.stringValue, let wv = Double(w) { map.edges[idx].weight = wv }
    if let et = args?["edge_type"]?.stringValue { map.edges[idx].edgeType = et }
    try writeMap(map, to: path)
    return "{\"success\": true, \"message\": \"Edge \(from) → \(to) updated\"}"
}

private func deleteEdgeFn(path: String, from: String, to: String) throws -> String {
    var map = try readMap(path)
    let before = map.edges.count
    map.edges.removeAll { $0.from == from && $0.to == to }
    guard map.edges.count < before else { return "{\"error\": \"Edge \(from) → \(to) not found\"}" }
    try writeMap(map, to: path)
    return "{\"success\": true, \"message\": \"Edge \(from) → \(to) deleted\"}"
}

private func createMap(args: [String: AnyCodable]?, config: MCPConfig) throws -> String {
    let title = args?["title"]?.stringValue ?? "Untitled"
    let templateName = args?["template"]?.stringValue ?? ""
    let filename = args?["filename"]?.stringValue ?? title.lowercased().replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)

    // Load template
    let templatePath = try config.resolveTemplatePath(templateName)
    var streams: [CMStream] = []
    var generations: [CMGeneration] = []

    if FileManager.default.fileExists(atPath: templatePath),
       let data = FileManager.default.contents(atPath: templatePath),
       let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
        if let s = json["streams"] as? [[String: Any]] {
            streams = s.compactMap { d in
                guard let id = d["id"] as? String, let name = d["name"] as? String else { return nil }
                return CMStream(id: id, name: name, color: d["color"] as? String, description: d["description"] as? String)
            }
        }
        if let g = json["generations"] as? [[String: Any]] {
            generations = g.compactMap { d in
                guard let num = d["number"] as? Int else { return nil }
                return CMGeneration(number: num, period: d["period"] as? String, label: d["label"] as? String)
            }
        }
    }

    let map = ConceptMap(title: title, generations: generations, streams: streams,
                         nodes: [], edges: [], externalShocks: [], structuralObservations: [])

    let outputPath = (config.mapsDir as NSString).appendingPathComponent(filename + ".cm")
    try FileManager.default.createDirectory(atPath: config.mapsDir, withIntermediateDirectories: true)
    try writeMap(map, to: outputPath)
    return "{\"success\": true, \"path\": \"\(outputPath)\", \"message\": \"Map '\(title)' created\"}"
}

private func getMapStats(path: String, encoder: JSONEncoder) throws -> String {
    let map = try readMap(path)
    let nodeTypes = Dictionary(grouping: map.nodes, by: { $0.nodeType }).mapValues { $0.count }
    let edgeTypes = Dictionary(grouping: map.edges, by: { $0.edgeType }).mapValues { $0.count }
    let n = map.nodes.count
    let possibleEdges = n > 1 ? n * (n - 1) / 2 : 0
    let density = possibleEdges > 0 ? Double(map.edges.count) / Double(possibleEdges) : 0

    let stats: [String: Any] = [
        "title": map.title ?? "Untitled",
        "node_count": n,
        "edge_count": map.edges.count,
        "stream_count": map.streams.count,
        "generation_count": map.generations.count,
        "density": String(format: "%.3f", density),
        "node_types": nodeTypes,
        "edge_types": edgeTypes,
    ]
    let data = try JSONSerialization.data(withJSONObject: stats, options: .prettyPrinted)
    return String(data: data, encoding: .utf8) ?? "{}"
}
