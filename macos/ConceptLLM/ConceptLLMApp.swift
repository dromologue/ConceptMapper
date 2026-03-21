import SwiftUI

@main
struct ConceptLLMApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Taxonomy...") {
                    NotificationCenter.default.post(name: .newTaxonomy, object: nil)
                }
                .keyboardShortcut("n")

                Button("Open...") {
                    NotificationCenter.default.post(name: .openFile, object: nil)
                }
                .keyboardShortcut("o")

                Button("Save As...") {
                    NotificationCenter.default.post(name: .saveFile, object: nil)
                }
                .keyboardShortcut("s")

                Divider()

                Button("Export Image...") {
                    NotificationCenter.default.post(name: .exportImage, object: nil)
                }
                .keyboardShortcut("e")

                Button("Export Concept Map...") {
                    NotificationCenter.default.post(name: .exportMarkdown, object: nil)
                }
                .keyboardShortcut("e", modifiers: [.command, .shift])
            }

            CommandGroup(replacing: .help) {
                Button(mcpButtonLabel(.claude)) {
                    mcpSetupAction(.claude)
                }
                Button(mcpButtonLabel(.cursor)) {
                    mcpSetupAction(.cursor)
                }
                Button("Setup MCP — Custom Path...") {
                    let panel = NSOpenPanel()
                    panel.title = "Select MCP config file"
                    panel.allowedContentTypes = [.json]
                    panel.canCreateDirectories = true
                    if panel.runModal() == .OK, let url = panel.url {
                        let result = MCPSetup.configure(customPath: url.path)
                        NotificationCenter.default.post(name: .mcpConfigured, object: nil)
                        showAlert("MCP Setup", result)
                    }
                }

                Divider()

                Button("ConceptLLM Help") {
                    NotificationCenter.default.post(name: .showHelp, object: nil)
                }
                .keyboardShortcut("?")
            }
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Ensure app directories exist and copy templates on first run
        MCPSetup.ensureDirectories()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

// MARK: - MCP Menu Helpers

private func mcpButtonLabel(_ client: LLMClient) -> String {
    let installed = client.isInstalled
    let configured = installed && MCPSetup.isConfigured(for: client)
    if configured { return "✓ MCP: \(client.rawValue)" }
    if installed { return "Setup MCP for \(client.rawValue)" }
    return "Setup MCP for \(client.rawValue) (not installed)"
}

private func mcpSetupAction(_ client: LLMClient) {
    guard client.isInstalled else {
        showAlert("MCP Setup", "\(client.rawValue) is not installed.\n\nInstall it first, then try again.")
        return
    }
    let result = MCPSetup.configure(for: client)
    NotificationCenter.default.post(name: .mcpConfigured, object: nil)
    showAlert("MCP Setup — \(client.rawValue)", result)
}

private func showAlert(_ title: String, _ message: String) {
    let alert = NSAlert()
    alert.messageText = title
    alert.informativeText = message
    alert.alertStyle = .informational
    alert.runModal()
}

extension Notification.Name {
    static let openFile = Notification.Name("openFile")
    static let saveFile = Notification.Name("saveFile")
    static let exportImage = Notification.Name("exportImage")
    static let exportMarkdown = Notification.Name("exportMarkdown")
    static let showHelp = Notification.Name("showHelp")
    static let newTaxonomy = Notification.Name("newTaxonomy")
    static let mcpConfigured = Notification.Name("mcpConfigured")
}
