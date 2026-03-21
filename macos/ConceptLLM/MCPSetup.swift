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

    /// Path to the app's maps directory.
    static var mapsDir: String {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return appSupport.appendingPathComponent("ConceptLLM/Maps").path
    }

    /// Path to the app's templates directory.
    static var templatesDir: String {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        return appSupport.appendingPathComponent("ConceptLLM/templates").path
    }

    /// Ensure app directories exist on first run.
    static func ensureDirectories() {
        let fm = FileManager.default
        try? fm.createDirectory(atPath: mapsDir, withIntermediateDirectories: true)
        try? fm.createDirectory(atPath: templatesDir, withIntermediateDirectories: true)

        // Copy bundled templates to user templates dir if empty
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
    }

    /// Detect which LLM clients are installed.
    static var detectedClients: [LLMClient] {
        LLMClient.allCases.filter { $0.isInstalled }
    }

    /// Check if MCP is configured for a given client.
    static func isConfigured(for client: LLMClient) -> Bool {
        guard let data = FileManager.default.contents(atPath: client.configPath),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let servers = json["mcpServers"] as? [String: Any] else {
            return false
        }
        return servers["conceptllm"] != nil
    }

    /// Configure MCP for a specific client. Returns status message.
    @discardableResult
    static func configure(for client: LLMClient) -> String {
        guard let mcpPath = bundledMCPPath else {
            return "Error: ConceptMCP binary not found in app bundle"
        }

        // Make the binary executable
        try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: mcpPath)

        let configPath = client.configPath
        let configDir = (configPath as NSString).deletingLastPathComponent
        try? FileManager.default.createDirectory(atPath: configDir, withIntermediateDirectories: true)

        var config: [String: Any] = [:]
        if let data = FileManager.default.contents(atPath: configPath),
           let existing = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            config = existing
        }

        var servers = (config["mcpServers"] as? [String: Any]) ?? [:]
        servers["conceptllm"] = [
            "command": mcpPath,
            "args": ["--maps-dir", mapsDir, "--templates-dir", templatesDir]
        ] as [String: Any]
        config["mcpServers"] = servers

        do {
            let data = try JSONSerialization.data(withJSONObject: config, options: [.prettyPrinted, .sortedKeys])
            try data.write(to: URL(fileURLWithPath: configPath))
            logger.info("MCP configured for \(client.rawValue) at \(configPath)")
            return "MCP server configured for \(client.rawValue). Restart the app to activate.\n\nConfig: \(configPath)"
        } catch {
            logger.error("Failed to write config: \(error.localizedDescription)")
            return "Error: \(error.localizedDescription)"
        }
    }

    /// Configure MCP for a custom config path (manual setup).
    @discardableResult
    static func configure(customPath: String) -> String {
        guard let mcpPath = bundledMCPPath else {
            return "Error: ConceptMCP binary not found in app bundle"
        }

        try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: mcpPath)

        let configDir = (customPath as NSString).deletingLastPathComponent
        try? FileManager.default.createDirectory(atPath: configDir, withIntermediateDirectories: true)

        var config: [String: Any] = [:]
        if let data = FileManager.default.contents(atPath: customPath),
           let existing = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            config = existing
        }

        var servers = (config["mcpServers"] as? [String: Any]) ?? [:]
        servers["conceptllm"] = [
            "command": mcpPath,
            "args": ["--maps-dir", mapsDir, "--templates-dir", templatesDir]
        ] as [String: Any]
        config["mcpServers"] = servers

        do {
            let data = try JSONSerialization.data(withJSONObject: config, options: [.prettyPrinted, .sortedKeys])
            try data.write(to: URL(fileURLWithPath: customPath))
            return "MCP server configured.\n\nConfig: \(customPath)\nBinary: \(mcpPath)"
        } catch {
            return "Error: \(error.localizedDescription)"
        }
    }
}
