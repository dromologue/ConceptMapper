import Foundation

// MARK: - Data Types

public struct CMNode: Codable {
    var id: String
    var nodeType: String
    var name: String
    var generation: Int?
    var stream: String?
    var fields: [String: String]
    var notes: String?
}

public struct CMEdge: Codable {
    var from: String
    var to: String
    var edgeType: String
    var directed: Bool
    var weight: Double
    var note: String?
}

public struct CMStream: Codable {
    var id: String
    var name: String
    var color: String?
    var description: String?
}

public struct CMGeneration: Codable {
    var number: Int
    var period: String?
    var label: String?
}

public struct ConceptMap: Codable {
    var title: String?
    var generations: [CMGeneration]
    var streams: [CMStream]
    var nodes: [CMNode]
    var edges: [CMEdge]
    var externalShocks: [String]
    var structuralObservations: [String]
}

// MARK: - Parser

public func parseCMFile(_ content: String) -> ConceptMap {
    var title: String?
    var generations: [CMGeneration] = []
    var streams: [CMStream] = []
    var nodes: [CMNode] = []
    var edges: [CMEdge] = []
    var externalShocks: [String] = []
    var structuralObservations: [String] = []

    let lines = content.components(separatedBy: "\n")
    var i = 0
    var currentSection = ""
    var currentNodeType = ""

    while i < lines.count {
        let line = lines[i]

        // Title (H1)
        if line.hasPrefix("# ") && title == nil {
            title = String(line.dropFirst(2)).trimmingCharacters(in: .whitespaces)
            i += 1; continue
        }

        // Section headers (H2)
        if line.hasPrefix("## ") {
            let header = String(line.dropFirst(3)).trimmingCharacters(in: .whitespaces).lowercased()
            if header.contains("generation") { currentSection = "generations" }
            else if header.contains("stream") { currentSection = "streams" }
            else if header.contains("edge") { currentSection = "edges" }
            else if header.contains("external") && header.contains("shock") { currentSection = "shocks" }
            else if header.contains("structural") && header.contains("observation") { currentSection = "observations" }
            else if header.contains("node") {
                currentSection = "nodes"
                // Extract node type from "## Thinker Nodes" → "thinker"
                let parts = header.components(separatedBy: " ")
                if let nodeIdx = parts.firstIndex(where: { $0.hasPrefix("node") }), nodeIdx > 0 {
                    currentNodeType = parts[nodeIdx - 1]
                }
            }
            i += 1; continue
        }

        // H3 subsections (edge categories like "### Thinker-to-Concept")
        if line.hasPrefix("### ") {
            // Stay in current section
            i += 1; continue
        }

        // Table rows (for generations and streams)
        if line.hasPrefix("|") && !line.contains("---") {
            if currentSection == "generations" {
                let cells = parseTableRow(line)
                if cells.count >= 3, let num = Int(cells[0].trimmingCharacters(in: .whitespaces)) {
                    generations.append(CMGeneration(
                        number: num,
                        period: cells.count > 1 ? cells[1].trimmingCharacters(in: .whitespaces) : nil,
                        label: cells.count > 2 ? cells[2].trimmingCharacters(in: .whitespaces) : nil
                    ))
                }
            } else if currentSection == "streams" {
                let cells = parseTableRow(line)
                if cells.count >= 2 {
                    let sid = cells[0].trimmingCharacters(in: .whitespaces).trimmingCharacters(in: CharacterSet(charactersIn: "`"))
                    streams.append(CMStream(
                        id: sid,
                        name: cells.count > 1 ? cells[1].trimmingCharacters(in: .whitespaces) : sid,
                        color: cells.count > 2 ? cells[2].trimmingCharacters(in: .whitespaces) : nil,
                        description: cells.count > 3 ? cells[3].trimmingCharacters(in: .whitespaces) : nil
                    ))
                }
            }
            i += 1; continue
        }

        // Fenced code blocks
        if line.trimmingCharacters(in: .whitespaces).hasPrefix("```") {
            i += 1
            var blockLines: [String] = []
            while i < lines.count && !lines[i].trimmingCharacters(in: .whitespaces).hasPrefix("```") {
                blockLines.append(lines[i])
                i += 1
            }
            i += 1 // skip closing ```

            if currentSection == "nodes" {
                if let node = parseNodeBlock(blockLines, nodeType: currentNodeType) {
                    nodes.append(node)
                }
            } else if currentSection == "edges" {
                edges.append(contentsOf: parseEdgeBlock(blockLines))
            } else if currentSection == "shocks" {
                let shock = blockLines.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
                if !shock.isEmpty { externalShocks.append(shock) }
            }
            continue
        }

        // Bullet items (observations)
        if currentSection == "observations" && (line.hasPrefix("- ") || line.hasPrefix("* ")) {
            structuralObservations.append(String(line.dropFirst(2)))
        }

        i += 1
    }

    return ConceptMap(title: title, generations: generations, streams: streams,
                      nodes: nodes, edges: edges, externalShocks: externalShocks,
                      structuralObservations: structuralObservations)
}

private func parseTableRow(_ line: String) -> [String] {
    return line.split(separator: "|", omittingEmptySubsequences: false)
        .dropFirst().dropLast()
        .map { String($0).trimmingCharacters(in: .whitespaces) }
}

private func parseNodeBlock(_ lines: [String], nodeType: String) -> CMNode? {
    var kv: [String: String] = [:]
    for line in lines {
        if let colonIdx = line.firstIndex(of: ":") {
            let key = String(line[line.startIndex..<colonIdx]).trimmingCharacters(in: .whitespaces)
            let value = String(line[line.index(after: colonIdx)...]).trimmingCharacters(in: .whitespaces)
            if !key.isEmpty { kv[key] = value }
        }
    }
    guard let id = kv.removeValue(forKey: "id"),
          let name = kv.removeValue(forKey: "name") else { return nil }

    let generation = kv.removeValue(forKey: "generation").flatMap { Int($0) }
    let stream = kv.removeValue(forKey: "stream")
    let notes = kv.removeValue(forKey: "notes")

    return CMNode(id: id, nodeType: nodeType, name: name,
                  generation: generation, stream: stream, fields: kv, notes: notes)
}

private func parseEdgeBlock(_ lines: [String]) -> [CMEdge] {
    var edges: [CMEdge] = []
    var currentFrom: String?
    var currentTo: String?
    var currentType: String?
    var currentNote: String?
    var currentWeight: Double = 1.0

    for line in lines {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty {
            if let f = currentFrom, let t = currentTo, let tp = currentType {
                edges.append(CMEdge(from: f, to: t, edgeType: tp, directed: true,
                                    weight: currentWeight, note: currentNote))
            }
            currentFrom = nil; currentTo = nil; currentType = nil
            currentNote = nil; currentWeight = 1.0
            continue
        }

        if trimmed.hasPrefix("from:") {
            // Flush previous
            if let f = currentFrom, let t = currentTo, let tp = currentType {
                edges.append(CMEdge(from: f, to: t, edgeType: tp, directed: true,
                                    weight: currentWeight, note: currentNote))
            }
            currentNote = nil; currentWeight = 1.0

            // Parse inline: "from: a    to: b    type: chain"
            let parts = trimmed
            if let toRange = parts.range(of: "to:"), let typeRange = parts.range(of: "type:") {
                currentFrom = String(parts[parts.index(parts.startIndex, offsetBy: 5)..<toRange.lowerBound]).trimmingCharacters(in: .whitespaces)
                currentTo = String(parts[toRange.upperBound..<typeRange.lowerBound]).trimmingCharacters(in: .whitespaces)
                currentType = String(parts[typeRange.upperBound...]).trimmingCharacters(in: .whitespaces)
            }
        } else if trimmed.hasPrefix("note:") {
            currentNote = String(trimmed.dropFirst(5)).trimmingCharacters(in: .whitespaces)
        } else if trimmed.hasPrefix("weight:") {
            currentWeight = Double(String(trimmed.dropFirst(7)).trimmingCharacters(in: .whitespaces)) ?? 1.0
        } else if currentNote != nil {
            // Continuation of note
            currentNote = (currentNote ?? "") + " " + trimmed
        }
    }

    // Flush last
    if let f = currentFrom, let t = currentTo, let tp = currentType {
        edges.append(CMEdge(from: f, to: t, edgeType: tp, directed: true,
                            weight: currentWeight, note: currentNote))
    }

    return edges
}

// MARK: - Writer

public func writeCMFile(_ map: ConceptMap) -> String {
    var lines: [String] = []

    // Title
    lines.append("# \(map.title ?? "Untitled")")
    lines.append("")
    lines.append("<!-- Exported from ConceptLLM MCP server -->")
    lines.append("")

    // Generations
    if !map.generations.isEmpty {
        lines.append("## Generations")
        lines.append("")
        lines.append("| Gen | Period | Label | Attention Space Count |")
        lines.append("|-----|--------|-------|-----------------------|")
        for g in map.generations {
            lines.append("| \(g.number) | \(g.period ?? "") | \(g.label ?? "") |  |")
        }
        lines.append("")
    }

    // Streams
    if !map.streams.isEmpty {
        lines.append("## Streams")
        lines.append("")
        lines.append("| Stream ID | Name | Colour | Description |")
        lines.append("|-----------|------|--------|-------------|")
        for s in map.streams {
            lines.append("| \(s.id) | \(s.name) | \(s.color ?? "#666") | \(s.description ?? "") |")
        }
        lines.append("")
    }

    // Nodes grouped by type
    let nodesByType = Dictionary(grouping: map.nodes, by: { $0.nodeType })
    for (nodeType, typeNodes) in nodesByType.sorted(by: { $0.key < $1.key }) {
        let label = nodeType.prefix(1).uppercased() + nodeType.dropFirst()
        lines.append("## \(label) Nodes")
        lines.append("")
        for node in typeNodes {
            lines.append("```")
            lines.append("id:               \(node.id)")
            lines.append("name:             \(node.name)")
            if let g = node.generation { lines.append("generation:       \(g)") }
            if let s = node.stream { lines.append("stream:           \(s)") }
            for (key, value) in node.fields.sorted(by: { $0.key < $1.key }) {
                lines.append("\(key): \(value)")
            }
            if let notes = node.notes { lines.append("notes:            \(notes)") }
            lines.append("```")
            lines.append("")
        }
    }

    // Edges
    if !map.edges.isEmpty {
        lines.append("## Edges")
        lines.append("")
        lines.append("```")
        for edge in map.edges {
            lines.append("from: \(edge.from.padding(toLength: 16, withPad: " ", startingAt: 0)) to: \(edge.to.padding(toLength: 20, withPad: " ", startingAt: 0)) type: \(edge.edgeType)")
            if let note = edge.note { lines.append("  note: \(note)") }
            if edge.weight != 1.0 { lines.append("  weight: \(edge.weight)") }
            lines.append("")
        }
        lines.append("```")
        lines.append("")
    }

    // External Shocks
    if !map.externalShocks.isEmpty {
        lines.append("## External Shocks")
        lines.append("")
        lines.append("```")
        for shock in map.externalShocks {
            lines.append(shock)
            lines.append("")
        }
        lines.append("```")
        lines.append("")
    }

    // Observations
    if !map.structuralObservations.isEmpty {
        lines.append("## Structural Observations")
        lines.append("")
        for obs in map.structuralObservations {
            lines.append("- \(obs)")
        }
    }

    return lines.joined(separator: "\n")
}
