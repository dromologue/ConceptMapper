import Foundation
import os

private let logger = Logger(subsystem: "com.dromologue.ConceptLLM", category: "MCPSetup")

enum LLMClient: String, CaseIterable {
    case claude = "Claude Desktop"
    case cursor = "Cursor"

    var configPath: String {
        let home = FileManager.default.homeDirectoryForCurrentUser
        switch self {
        case .claude:
            return home.appendingPathComponent("Library/Application Support/Claude/claude_desktop_config.json").path
        case .cursor:
            return home.appendingPathComponent(".cursor/mcp.json").path
        }
    }

    var isInstalled: Bool {
        switch self {
        case .claude:
            return FileManager.default.fileExists(atPath: "/Applications/Claude.app")
        case .cursor:
            return FileManager.default.fileExists(atPath: "/Applications/Cursor.app")
        }
    }
}

struct MCPSetup {

    /// Path to the bundled ConceptMCP binary inside the app bundle.
    static var bundledMCPPath: String? {
        // Try standard resource lookup first
        if let path = Bundle.main.path(forResource: "ConceptMCP", ofType: nil, inDirectory: "bin") {
            return path
        }
        // Fallback: construct path directly from bundle resources
        if let resourcePath = Bundle.main.resourcePath {
            let path = (resourcePath as NSString).appendingPathComponent("bin/ConceptMCP")
            if FileManager.default.fileExists(atPath: path) {
                return path
            }
        }
        return nil
    }

    /// Path to the app's maps directory (sandbox container).
    static var mapsDir: String {
        let base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return base.appendingPathComponent("ConceptMapper/Maps").path
    }

    /// Path to the app's templates directory (sandbox container).
    static var templatesDir: String {
        let base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return base.appendingPathComponent("ConceptMapper/Templates").path
    }

    /// Ensure app directories exist on first run and copy bundled examples.
    static func ensureDirectories() {
        let fm = FileManager.default
        try? fm.createDirectory(atPath: mapsDir, withIntermediateDirectories: true)
        try? fm.createDirectory(atPath: templatesDir, withIntermediateDirectories: true)

        // Copy bundled templates to user Templates dir if empty
        let userTemplates = try? fm.contentsOfDirectory(atPath: templatesDir).filter { $0.hasSuffix(".cmt") }
        if (userTemplates ?? []).isEmpty {
            if let bundledTemplatesDir = Bundle.main.path(forResource: "templates", ofType: nil) {
                if let files = try? fm.contentsOfDirectory(atPath: bundledTemplatesDir) {
                    for file in files where file.hasSuffix(".cmt") {
                        let src = (bundledTemplatesDir as NSString).appendingPathComponent(file)
                        let dst = (templatesDir as NSString).appendingPathComponent(file)
                        try? fm.copyItem(atPath: src, toPath: dst)
                    }
                }
            }
        }

        // Copy bundled example maps to user Maps dir if empty
        let userMaps = try? fm.contentsOfDirectory(atPath: mapsDir).filter { $0.hasSuffix(".cm") }
        if (userMaps ?? []).isEmpty {
            if let bundledMapsDir = Bundle.main.path(forResource: "maps", ofType: nil) {
                if let files = try? fm.contentsOfDirectory(atPath: bundledMapsDir) {
                    for file in files where file.hasSuffix(".cm") {
                        let src = (bundledMapsDir as NSString).appendingPathComponent(file)
                        let dst = (mapsDir as NSString).appendingPathComponent(file)
                        try? fm.copyItem(atPath: src, toPath: dst)
                    }
                }
            }
        }
    }

    /// Detect which LLM clients are installed.
    static var detectedClients: [LLMClient] {
        LLMClient.allCases.filter { $0.isInstalled }
    }

    /// Check if MCP is configured for a given client (best-effort, may fail in sandbox).
    static func isConfigured(for client: LLMClient) -> Bool {
        guard let data = FileManager.default.contents(atPath: client.configPath),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let servers = json["mcpServers"] as? [String: Any] else {
            return false
        }
        return servers["conceptllm"] != nil
    }

    /// Generate MCP setup instructions for a client (sandboxed apps can't write to other apps' configs).
    static func setupInstructions(for client: LLMClient) -> String {
        guard let mcpPath = bundledMCPPath else {
            return "Error: ConceptMCP binary not found in app bundle."
        }

        let json = """
        "conceptllm": {
          "command": "\(mcpPath)",
          "args": ["--maps-dir", "\(mapsDir)", "--templates-dir", "\(templatesDir)"]
        }
        """

        return """
        To connect ConceptLLM with \(client.rawValue):

        1. Open \(client.rawValue)'s MCP config file:
           \(client.configPath)

        2. Add this to the "mcpServers" section:

        \(json)

        3. Restart \(client.rawValue) to activate.
        """
    }
}
