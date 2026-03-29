import Foundation

// MARK: - JSON-RPC Types

struct JSONRPCRequest: Decodable {
    let jsonrpc: String
    let id: AnyCodable?
    let method: String
    let params: [String: AnyCodable]?
}

struct JSONRPCResponse: Encodable {
    let jsonrpc: String = "2.0"
    let id: AnyCodable?
    let result: AnyCodable?
    let error: JSONRPCError?
}

struct JSONRPCError: Encodable {
    let code: Int
    let message: String
}

// MARK: - MCP Types

public struct MCPToolDefinition: Encodable {
    public let name: String
    public let description: String
    public let inputSchema: InputSchema

    public init(name: String, description: String, inputSchema: InputSchema) {
        self.name = name
        self.description = description
        self.inputSchema = inputSchema
    }
}

public struct InputSchema: Encodable {
    public let type: String = "object"
    public let properties: [String: PropertySchema]
    public let required: [String]?

    public init(properties: [String: PropertySchema], required: [String]?) {
        self.properties = properties
        self.required = required
    }
}

public struct PropertySchema: Encodable {
    public let type: String
    public let description: String
    public let items: ItemSchema?

    public init(type: String, description: String, items: ItemSchema? = nil) {
        self.type = type
        self.description = description
        self.items = items
    }
}

public struct ItemSchema: Encodable {
    public let type: String

    public init(type: String) {
        self.type = type
    }
}

struct MCPToolResult: Encodable {
    let content: [MCPContent]
    let isError: Bool?
}

struct MCPContent: Encodable {
    let type: String = "text"
    let text: String
}

// MARK: - AnyCodable (simple wrapper for JSON values)

public struct AnyCodable: Codable {
    public let value: Any

    public init(_ value: Any) { self.value = value }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() { value = NSNull(); return }
        if let v = try? container.decode(Bool.self) { value = v; return }
        if let v = try? container.decode(Int.self) { value = v; return }
        if let v = try? container.decode(Double.self) { value = v; return }
        if let v = try? container.decode(String.self) { value = v; return }
        if let v = try? container.decode([String: AnyCodable].self) { value = v; return }
        if let v = try? container.decode([AnyCodable].self) { value = v; return }
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode value")
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case is NSNull: try container.encodeNil()
        case let v as Bool: try container.encode(v)
        case let v as Int: try container.encode(v)
        case let v as Double: try container.encode(v)
        case let v as String: try container.encode(v)
        case let v as [String: AnyCodable]: try container.encode(v)
        case let v as [AnyCodable]: try container.encode(v)
        case let v as [String: Any]: try container.encode(v.mapValues { AnyCodable($0) })
        case let v as [Any]: try container.encode(v.map { AnyCodable($0) })
        default: try container.encodeNil()
        }
    }

    public var stringValue: String? { value as? String }
    public var intValue: Int? { value as? Int }
    public var doubleValue: Double? { value as? Double }
    public var dictValue: [String: AnyCodable]? { value as? [String: AnyCodable] }
}

// MARK: - MCP Server

public class MCPServer {
    let tools: [MCPToolDefinition]
    let handler: (String, [String: AnyCodable]?) throws -> String

    public init(tools: [MCPToolDefinition], handler: @escaping (String, [String: AnyCodable]?) throws -> String) {
        self.tools = tools
        self.handler = handler
    }

    public func run() {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]

        while let line = readLine(strippingNewline: true) {
            guard !line.isEmpty else { continue }
            guard let data = line.data(using: .utf8) else { continue }

            do {
                let request = try JSONDecoder().decode(JSONRPCRequest.self, from: data)
                guard let response = handleRequest(request) else {
                    continue  // Notification — no response expected
                }
                let responseData = try encoder.encode(response)
                if let responseStr = String(data: responseData, encoding: .utf8) {
                    print(responseStr)
                    fflush(stdout)
                }
            } catch {
                let errResponse = JSONRPCResponse(
                    id: nil, result: nil,
                    error: JSONRPCError(code: -32700, message: "Parse error: \(error.localizedDescription)")
                )
                if let data = try? encoder.encode(errResponse), let str = String(data: data, encoding: .utf8) {
                    print(str)
                    fflush(stdout)
                }
            }
        }
    }

    private func handleRequest(_ request: JSONRPCRequest) -> JSONRPCResponse? {
        switch request.method {
        case "initialize":
            let result: [String: Any] = [
                "protocolVersion": "2024-11-05",
                "capabilities": [
                    "tools": ["listChanged": false] as [String: Any]
                ] as [String: Any],
                "serverInfo": [
                    "name": "conceptllm-mcp",
                    "version": "1.0.0"
                ] as [String: Any]
            ]
            return JSONRPCResponse(id: request.id, result: AnyCodable(result), error: nil)

        case "notifications/initialized":
            // Notifications have no id and expect no response
            return nil

        case "tools/list":
            let toolDicts = tools.map { tool -> [String: Any] in
                let schemaDict: [String: Any] = [
                    "type": "object",
                    "properties": tool.inputSchema.properties.mapValues { prop -> [String: Any] in
                        var d: [String: Any] = ["type": prop.type, "description": prop.description]
                        if let items = prop.items { d["items"] = ["type": items.type] }
                        return d
                    },
                    "required": tool.inputSchema.required ?? []
                ]
                return ["name": tool.name, "description": tool.description, "inputSchema": schemaDict]
            }
            return JSONRPCResponse(id: request.id, result: AnyCodable(["tools": toolDicts] as [String: Any]), error: nil)

        case "tools/call":
            guard let params = request.params,
                  let toolName = params["name"]?.stringValue else {
                return JSONRPCResponse(id: request.id, result: nil,
                    error: JSONRPCError(code: -32602, message: "Missing tool name"))
            }
            let args = params["arguments"]?.dictValue
            do {
                let resultText = try handler(toolName, args)
                let content: [[String: Any]] = [["type": "text", "text": resultText]]
                return JSONRPCResponse(id: request.id, result: AnyCodable(["content": content] as [String: Any]), error: nil)
            } catch {
                let content: [[String: Any]] = [["type": "text", "text": "Error: \(error.localizedDescription)"]]
                return JSONRPCResponse(id: request.id, result: AnyCodable(["content": content, "isError": true] as [String: Any]), error: nil)
            }

        default:
            return JSONRPCResponse(id: request.id, result: nil,
                error: JSONRPCError(code: -32601, message: "Method not found: \(request.method)"))
        }
    }
}
