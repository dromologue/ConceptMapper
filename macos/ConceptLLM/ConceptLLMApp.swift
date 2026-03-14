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

                Button("Export Markdown...") {
                    NotificationCenter.default.post(name: .exportMarkdown, object: nil)
                }
                .keyboardShortcut("e", modifiers: [.command, .shift])
            }
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

extension Notification.Name {
    static let openFile = Notification.Name("openFile")
    static let saveFile = Notification.Name("saveFile")
    static let exportImage = Notification.Name("exportImage")
    static let exportMarkdown = Notification.Name("exportMarkdown")
}
