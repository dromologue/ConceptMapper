import Foundation
import AppKit
import Security
import CryptoKit

// MARK: - Domain types

struct SecondBrainFolder: Codable, Equatable {
    let path: String
    let name: String
}

// GraphIR-compatible structures for JSON serialisation.
// These mirror the Rust parser output so the React SPA can consume them directly.

private struct SBGraphNode: Encodable {
    let id: String
    let node_type: String
    let name: String
    let properties: [String: String]
    let tags: [String]?
    let notes: String?
}

private struct SBEdgeVisual: Encodable {
    let style: String
    let color: String?
    let show_arrow: Bool
}

private struct SBGraphEdge: Encodable {
    let from: String
    let to: String
    let edge_type: String
    let directed: Bool
    let weight: Double?
    let note: String?
    let visual: SBEdgeVisual
}

private struct SBMetadata: Encodable {
    let title: String
    let source_file: String?
    let parsed_at: String?
    let notes: String?
}

private struct SBGraphIR: Encodable {
    let version: String
    let metadata: SBMetadata
    let nodes: [SBGraphNode]
    let edges: [SBGraphEdge]
}

// MARK: - SecondBrainManager

@MainActor
final class SecondBrainManager {
    static let shared = SecondBrainManager()

    private let foldersKey = "secondBrainFolders"
    private let workflowyUrlsKey = "secondBrainWorkflowyUrls"
    private let keychainService = "com.dromologue.ConceptMapper.workflowy"
    private let keychainAccount = "workflowyApiKey"

    // MARK: - Watched folders

    var watchedFolders: [SecondBrainFolder] {
        get {
            guard let data = UserDefaults.standard.data(forKey: foldersKey),
                  let folders = try? JSONDecoder().decode([SecondBrainFolder].self, from: data) else {
                return []
            }
            return folders
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                UserDefaults.standard.set(data, forKey: foldersKey)
            }
        }
    }

    // nodeId → workflowy URL mapping
    var workflowyUrls: [String: String] {
        get { UserDefaults.standard.dictionary(forKey: workflowyUrlsKey) as? [String: String] ?? [:] }
        set { UserDefaults.standard.set(newValue, forKey: workflowyUrlsKey) }
    }

    /// Open a folder picker and add the selected directory to the watched list.
    /// Returns the updated folder list.
    func addFolder() async -> [SecondBrainFolder]? {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "Add to Second Brain"
        panel.message = "Choose a folder of markdown files"

        let result = await panel.beginSheetModal(for: NSApplication.shared.keyWindow ?? NSApplication.shared.windows.first!)
        guard result == .OK, let url = panel.url else { return nil }

        let folder = SecondBrainFolder(path: url.path, name: url.lastPathComponent)
        var folders = watchedFolders
        guard !folders.contains(folder) else { return folders }
        folders.append(folder)
        watchedFolders = folders
        return folders
    }

    func removeFolder(path: String) -> [SecondBrainFolder] {
        var folders = watchedFolders
        folders.removeAll { $0.path == path }
        watchedFolders = folders
        return folders
    }

    func setNodeWorkflowyUrl(nodeId: String, url: String) {
        var map = workflowyUrls
        if url.isEmpty { map.removeValue(forKey: nodeId) } else { map[nodeId] = url }
        workflowyUrls = map
    }

    // MARK: - Keychain

    func saveWorkflowyKey(_ key: String) {
        let data = key.data(using: .utf8)!
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount
        ]
        SecItemDelete(query as CFDictionary)
        let add: [CFString: Any] = query.merging([kSecValueData: data]) { $1 }
        SecItemAdd(add as CFDictionary, nil)
    }

    func loadWorkflowyKey() -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let key = String(data: data, encoding: .utf8) else { return nil }
        return key
    }

    func hasWorkflowyKey() -> Bool { loadWorkflowyKey() != nil }

    // MARK: - Scanning

    struct ScanResult {
        let graphJson: String
        let templateJson: String
        let fileCount: Int
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    /// Extract a human-readable title from markdown content.
    /// Prefers the first ATX heading (`# Title`); falls back to `fallback`.
    private static func inferTitle(from content: String, fallback: String) -> String {
        for line in content.components(separatedBy: .newlines) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix("# ") {
                let title = String(trimmed.dropFirst(2)).trimmingCharacters(in: .whitespaces)
                if !title.isEmpty { return title }
            }
        }
        return fallback
    }

    func scanFolders() -> ScanResult {
        let fm = FileManager.default
        let dateKeys: Set<URLResourceKey> = [.isRegularFileKey, .creationDateKey, .contentModificationDateKey]
        var allFiles: [(url: URL, folderPath: String)] = []

        for folder in watchedFolders {
            let folderURL = URL(fileURLWithPath: folder.path)
            guard let enumerator = fm.enumerator(
                at: folderURL,
                includingPropertiesForKeys: Array(dateKeys),
                options: [.skipsHiddenFiles]
            ) else { continue }
            for case let fileURL as URL in enumerator {
                guard fileURL.pathExtension.lowercased() == "md" else { continue }
                allFiles.append((url: fileURL, folderPath: folder.path))
            }
        }

        // Build sets of unique directories that contain at least one .md file
        var dirPaths = Set<String>()
        for file in allFiles {
            let dir = file.url.deletingLastPathComponent().path
            dirPaths.insert(dir)
        }

        // Node id helpers
        func nodeId(_ path: String, type: String) -> String {
            let hash = Insecure.MD5.hash(data: path.data(using: .utf8)!)
            let hex = hash.map { String(format: "%02x", $0) }.joined().prefix(12)
            return "\(type)_\(hex)"
        }

        // Build folder nodes
        var nodes: [SBGraphNode] = []
        for dir in dirPaths {
            let id = nodeId(dir, type: "folder")
            let name = URL(fileURLWithPath: dir).lastPathComponent
            nodes.append(SBGraphNode(
                id: id, node_type: "folder", name: name,
                properties: ["path": dir],
                tags: nil, notes: nil
            ))
        }

        // Build note nodes and extract tags
        // Map: note id → Set<tag>
        var noteTags: [String: Set<String>] = [:]
        let tagPattern = try! NSRegularExpression(pattern: "#([\\w-]+)", options: [])

        for file in allFiles {
            let id = nodeId(file.url.path, type: "note")
            let content = (try? String(contentsOf: file.url, encoding: .utf8)) ?? ""
            let range = NSRange(content.startIndex..., in: content)
            let matches = tagPattern.matches(in: content, options: [], range: range)
            var tags = Set<String>()
            for match in matches {
                if let r = Range(match.range(at: 1), in: content) {
                    tags.insert(String(content[r]))
                }
            }
            noteTags[id] = tags

            let fallbackName = file.url.deletingPathExtension().lastPathComponent
            let name = Self.inferTitle(from: content, fallback: fallbackName)

            var props: [String: String] = ["path": file.url.path]
            if !tags.isEmpty { props["tags"] = tags.sorted().joined(separator: ", ") }
            if let wurl = workflowyUrls[id] { props["workflowy_url"] = wurl }

            if let res = try? file.url.resourceValues(forKeys: [.creationDateKey, .contentModificationDateKey]) {
                if let created = res.creationDate {
                    props["created"] = Self.dateFormatter.string(from: created)
                }
                if let modified = res.contentModificationDate {
                    props["modified"] = Self.dateFormatter.string(from: modified)
                }
            }

            nodes.append(SBGraphNode(
                id: id, node_type: "note", name: name,
                properties: props,
                tags: tags.isEmpty ? nil : Array(tags).sorted(),
                notes: nil
            ))
        }

        // Build contains edges (folder → note)
        var edges: [SBGraphEdge] = []
        for file in allFiles {
            let noteId = nodeId(file.url.path, type: "note")
            let dirPath = file.url.deletingLastPathComponent().path
            let foldId = nodeId(dirPath, type: "folder")
            edges.append(SBGraphEdge(
                from: foldId, to: noteId,
                edge_type: "contains", directed: true, weight: nil, note: nil,
                visual: SBEdgeVisual(style: "solid", color: "#888888", show_arrow: true)
            ))
        }

        // Build shares-tag edges (note ↔ note with common tags)
        let noteIds = Array(noteTags.keys)
        for i in 0..<noteIds.count {
            for j in (i+1)..<noteIds.count {
                let aId = noteIds[i]
                let bId = noteIds[j]
                let shared = noteTags[aId]!.intersection(noteTags[bId]!)
                guard !shared.isEmpty else { continue }
                let sharedLabel = shared.sorted().map { "#\($0)" }.joined(separator: ", ")
                edges.append(SBGraphEdge(
                    from: aId, to: bId,
                    edge_type: "shares-tag", directed: false, weight: nil,
                    note: sharedLabel,
                    visual: SBEdgeVisual(style: "dashed", color: "#4a90d9", show_arrow: false)
                ))
            }
        }

        let ir = SBGraphIR(
            version: "1",
            metadata: SBMetadata(
                title: "Second Brain",
                source_file: nil,
                parsed_at: ISO8601DateFormatter().string(from: Date()),
                notes: nil
            ),
            nodes: nodes, edges: edges
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let graphJson = (try? String(data: encoder.encode(ir), encoding: .utf8)) ?? "{}"

        // Load bundled template
        let templateJson: String
        if let url = Bundle.main.url(forResource: "second-brain", withExtension: "cmt", subdirectory: "templates"),
           let content = try? String(contentsOf: url, encoding: .utf8) {
            templateJson = content
        } else {
            templateJson = ""
        }

        return ScanResult(graphJson: graphJson, templateJson: templateJson, fileCount: allFiles.count)
    }
}
