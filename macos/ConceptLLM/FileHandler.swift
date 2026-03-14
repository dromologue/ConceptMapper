import AppKit
import UniformTypeIdentifiers

/// Handles file open/save operations using native macOS panels.
@MainActor
enum FileHandler {

    /// Show NSOpenPanel for .md and .json files, read contents, and call completion.
    static func openFile(completion: @escaping @MainActor (String, String) -> Void) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.allowedContentTypes = [
            UTType(filenameExtension: "md")!,
            UTType.json,
        ]
        panel.message = "Select a taxonomy markdown or JSON file"

        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            do {
                let content = try String(contentsOf: url, encoding: .utf8)
                completion(content, url.lastPathComponent)
            } catch {
                let alert = NSAlert()
                alert.messageText = "Failed to read file"
                alert.informativeText = error.localizedDescription
                alert.runModal()
            }
        }
    }

    /// Show NSSavePanel and write content to the selected file.
    static func saveFile(content: String, type: String, title: String) {
        let panel = NSSavePanel()
        panel.title = title
        panel.nameFieldStringValue = "concept-map.\(type)"
        if type == "json" {
            panel.allowedContentTypes = [UTType.json]
        } else {
            panel.allowedContentTypes = [UTType(filenameExtension: "md")!]
        }

        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            do {
                try content.write(to: url, atomically: true, encoding: .utf8)
            } catch {
                let alert = NSAlert()
                alert.messageText = "Failed to save file"
                alert.informativeText = error.localizedDescription
                alert.runModal()
            }
        }
    }

    /// Decode a data URL from the canvas and save as PNG.
    static func saveImageFromDataURL(_ dataURL: String) {
        guard let commaIndex = dataURL.firstIndex(of: ",") else { return }
        let base64 = String(dataURL[dataURL.index(after: commaIndex)...])
        guard let imageData = Data(base64Encoded: base64) else { return }

        let panel = NSSavePanel()
        panel.title = "Export Image"
        panel.nameFieldStringValue = "concept-map.png"
        panel.allowedContentTypes = [UTType.png]

        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            do {
                try imageData.write(to: url)
            } catch {
                let alert = NSAlert()
                alert.messageText = "Failed to save image"
                alert.informativeText = error.localizedDescription
                alert.runModal()
            }
        }
    }
}
