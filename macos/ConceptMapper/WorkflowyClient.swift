import Foundation

// MARK: - Types

struct WorkflowyOutlineNode: Codable {
    let id: String
    let name: String
    let description: String?
    var children: [WorkflowyOutlineNode]
}

// MARK: - WorkflowyClient

/// Thin URLSession client for the Workflowy REST API.
/// Base URL: https://workflowy.com/api/v1
/// Auth: Authorization: Bearer {apiKey}
/// Fetches a node and up to `maxDepth` levels of children recursively.
final class WorkflowyClient {
    private let baseURL = URL(string: "https://workflowy.com/api/v1")!
    private let maxDepth = 5
    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
    }

    // MARK: - Public API

    /// Parse a Workflowy URL (e.g. https://workflowy.com/#/abc123456789)
    /// and fetch the subtree rooted at that node.
    /// The caller (WebViewBridge, on MainActor) supplies the API key so this
    /// class stays free of main-actor isolation.
    func fetchSubtree(nodeUrl: String, apiKey: String) async throws -> [WorkflowyOutlineNode] {
        guard !apiKey.isEmpty else {
            throw WorkflowyError.missingKey
        }
        let nodeId = parseNodeId(from: nodeUrl)
        let root = try await fetchNode(id: nodeId, key: apiKey)
        var result = root
        try await fillChildren(node: &result, key: apiKey, depth: 0)
        return [result]
    }

    // MARK: - Private

    /// Extract the node hash from the URL fragment (#/abc123456789 → abc123456789).
    /// Falls back to the raw string if no fragment is present.
    private func parseNodeId(from urlString: String) -> String {
        guard let url = URL(string: urlString),
              let fragment = url.fragment else {
            return urlString
        }
        // Fragment is typically "/abc123" or "abc123"
        return fragment.hasPrefix("/") ? String(fragment.dropFirst()) : fragment
    }

    /// Fetch a single node by id.
    private func fetchNode(id: String, key: String) async throws -> WorkflowyOutlineNode {
        let url = baseURL.appendingPathComponent("nodes/\(id)")
        let data = try await get(url: url, key: key)
        // API returns { node: {...} } or the node directly
        if let wrapper = try? JSONDecoder().decode(NodeWrapper.self, from: data) {
            return WorkflowyOutlineNode(
                id: wrapper.node.id,
                name: wrapper.node.name,
                description: wrapper.node.note ?? wrapper.node.description,
                children: []
            )
        }
        let raw = try JSONDecoder().decode(RawNode.self, from: data)
        return WorkflowyOutlineNode(id: raw.id, name: raw.name, description: raw.note ?? raw.description, children: [])
    }

    /// Fetch direct children of `id`.
    private func fetchChildren(id: String, key: String) async throws -> [WorkflowyOutlineNode] {
        let url = baseURL.appendingPathComponent("nodes/\(id)/children")
        let data = try await get(url: url, key: key)
        let wrapper = try JSONDecoder().decode(NodesWrapper.self, from: data)
        return wrapper.nodes.map { n in
            WorkflowyOutlineNode(id: n.id, name: n.name, description: n.note ?? n.description, children: [])
        }
    }

    /// Recursively fill `node.children` up to `maxDepth`.
    private func fillChildren(node: inout WorkflowyOutlineNode, key: String, depth: Int) async throws {
        guard depth < maxDepth else { return }
        let children = try await fetchChildren(id: node.id, key: key)
        node.children = children
        for i in node.children.indices {
            try await fillChildren(node: &node.children[i], key: key, depth: depth + 1)
        }
    }

    private func get(url: URL, key: String) async throws -> Data {
        var request = URLRequest(url: url)
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw WorkflowyError.networkFailure("no HTTP response")
        }
        guard http.statusCode == 200 else {
            throw WorkflowyError.apiError(http.statusCode)
        }
        return data
    }

    // MARK: - Wire types

    private struct NodeWrapper: Decodable {
        let node: RawNode
    }

    private struct NodesWrapper: Decodable {
        let nodes: [RawNode]
    }

    private struct RawNode: Decodable {
        let id: String
        let name: String
        let note: String?
        let description: String?
    }
}

// MARK: - Errors

enum WorkflowyError: LocalizedError {
    case missingKey
    case networkFailure(String)
    case apiError(Int)

    var errorDescription: String? {
        switch self {
        case .missingKey:
            return "No Workflowy API key set. Add it in the Second Brain panel."
        case .networkFailure(let msg):
            return "Network failure: \(msg)"
        case .apiError(let code):
            return "Workflowy API returned \(code)"
        }
    }
}
