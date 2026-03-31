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
                Button("MCP Setup: Claude Desktop") {
                    let instructions = MCPSetup.setupInstructions(for: .claude)
                    showAlert("MCP Setup — Claude Desktop", instructions)
                }
                Button("MCP Setup: Cursor") {
                    let instructions = MCPSetup.setupInstructions(for: .cursor)
                    showAlert("MCP Setup — Cursor", instructions)
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

// MARK: - Helpers

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
}
