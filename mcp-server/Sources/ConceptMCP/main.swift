import Foundation

// ConceptLLM MCP Server
// Communicates via JSON-RPC over stdio
// Reads/writes .cm and .cmt files in the ConceptLLM app directories

// Parse command-line arguments for custom directories
var mapsDir: String?
var templatesDir: String?

var args = CommandLine.arguments.dropFirst()
while let arg = args.first {
    args = args.dropFirst()
    switch arg {
    case "--maps-dir":
        mapsDir = args.first.map { ($0 as NSString).expandingTildeInPath }
        args = args.dropFirst()
    case "--templates-dir":
        templatesDir = args.first.map { ($0 as NSString).expandingTildeInPath }
        args = args.dropFirst()
    case "--help", "-h":
        FileHandle.standardError.write(Data("""
        ConceptLLM MCP Server

        Usage: ConceptMCP [options]

        Options:
          --maps-dir <path>       Custom maps directory (default: ~/Library/Application Support/ConceptLLM/Maps)
          --templates-dir <path>  Custom templates directory (default: ~/Library/Application Support/ConceptLLM/templates)
          --help, -h              Show this help

        The server communicates via JSON-RPC over stdio (stdin/stdout).
        Configure it in your LLM client's MCP settings.

        """.utf8))
        exit(0)
    default:
        break
    }
}

let defaultConfig = MCPConfig.defaultConfig()
let config = MCPConfig(
    mapsDir: mapsDir ?? defaultConfig.mapsDir,
    templatesDir: templatesDir ?? defaultConfig.templatesDir
)

// Ensure directories exist
try? FileManager.default.createDirectory(atPath: config.mapsDir, withIntermediateDirectories: true)
try? FileManager.default.createDirectory(atPath: config.templatesDir, withIntermediateDirectories: true)

// Log to stderr (stdout is for JSON-RPC)
FileHandle.standardError.write(Data("ConceptLLM MCP Server started\n".utf8))
FileHandle.standardError.write(Data("Maps: \(config.mapsDir)\n".utf8))
FileHandle.standardError.write(Data("Templates: \(config.templatesDir)\n".utf8))

let server = MCPServer(tools: mcpTools) { toolName, args in
    try handleTool(toolName, args, config: config)
}

server.run()
