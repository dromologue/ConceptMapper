import AppKit
import UniformTypeIdentifiers

/// Handles file open/save operations using native macOS panels.
@MainActor
enum FileHandler {

    // MARK: - Base Directory

    /// Returns the base directory: ~/Documents/ConceptMapper/
    static func getBaseFolder() -> URL {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let folder = home.appendingPathComponent("Documents/ConceptMapper")
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
        return folder
    }

    // MARK: - Config (.cme)

    /// Returns the path to the config file: ~/Documents/ConceptMapper/config.cme
    static func getConfigPath() -> URL {
        let folder = getBaseFolder()
        return folder.appendingPathComponent("config.cme")
    }

    /// Load the config.cme JSON file. Returns empty JSON object if not found.
    static func loadConfig(completion: @escaping @MainActor (String) -> Void) {
        let url = getConfigPath()
        if FileManager.default.fileExists(atPath: url.path) {
            do {
                let content = try String(contentsOf: url, encoding: .utf8)
                completion(content)
            } catch {
                completion("{}")
            }
        } else {
            completion("{}")
        }
    }

    /// Save content to config.cme.
    static func saveConfig(content: String) {
        let url = getConfigPath()
        do {
            try content.write(to: url, atomically: true, encoding: .utf8)
        } catch {
            let alert = NSAlert()
            alert.messageText = "Failed to save config"
            alert.informativeText = error.localizedDescription
            alert.runModal()
        }
    }

    // MARK: - Maps

    /// Returns (and creates if needed) the Maps folder: ~/Documents/ConceptMapper/Maps/
    static func getMapsFolder() -> URL {
        let folder = getBaseFolder().appendingPathComponent("Maps")
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
        return folder
    }

    /// Enumerate .cm files in the Maps folder.
    static func listMaps(completion: @escaping @MainActor ([Any]) -> Void) {
        let folder = getMapsFolder()
        do {
            let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.contentModificationDateKey])
                .filter { $0.pathExtension == "cm" }
                .sorted { a, b in
                    let da = (try? a.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? Date.distantPast
                    let db = (try? b.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? Date.distantPast
                    return da > db // newest first
                }
            let results = files.map { url -> [String: String] in
                return ["name": url.deletingPathExtension().lastPathComponent, "path": url.path]
            }
            completion(results)
        } catch {
            completion([])
        }
    }

    // MARK: - Templates

    /// Returns (and creates if needed) the Templates folder: ~/Documents/ConceptMapper/Templates/
    static func getTemplatesFolder() -> URL {
        let folder = getBaseFolder().appendingPathComponent("Templates")
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
        return folder
    }

    /// Copy bundled .cmt templates from app Resources into the templates folder if not already present.
    static func copyBundledTemplates() {
        let folder = getTemplatesFolder()
        guard let resourceURL = Bundle.main.resourceURL else { return }
        let bundledDir = resourceURL.appendingPathComponent("templates")
        guard FileManager.default.fileExists(atPath: bundledDir.path) else { return }
        do {
            let files = try FileManager.default.contentsOfDirectory(at: bundledDir, includingPropertiesForKeys: nil)
                .filter { $0.pathExtension == "cmt" }
            for file in files {
                let dest = folder.appendingPathComponent(file.lastPathComponent)
                if !FileManager.default.fileExists(atPath: dest.path) {
                    try FileManager.default.copyItem(at: file, to: dest)
                }
            }
        } catch {
            // silently ignore — not critical
        }
    }

    /// Copy bundled .cm example maps from app Resources into the Maps folder if not already present.
    static func copyBundledMaps() {
        let folder = getMapsFolder()
        guard let resourceURL = Bundle.main.resourceURL else { return }
        let bundledDir = resourceURL.appendingPathComponent("maps")
        guard FileManager.default.fileExists(atPath: bundledDir.path) else { return }
        do {
            let files = try FileManager.default.contentsOfDirectory(at: bundledDir, includingPropertiesForKeys: nil)
                .filter { $0.pathExtension == "cm" }
            for file in files {
                let dest = folder.appendingPathComponent(file.lastPathComponent)
                if !FileManager.default.fileExists(atPath: dest.path) {
                    try FileManager.default.copyItem(at: file, to: dest)
                }
            }
        } catch {
            // silently ignore — not critical
        }
    }

    /// Enumerate .cmt template files in the templates folder.
    static func listTemplates(completion: @escaping @MainActor ([Any]) -> Void) {
        let folder = getTemplatesFolder()
        do {
            let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
                .filter { $0.pathExtension == "cmt" }
            let results = files.map { url -> [String: String] in
                return ["name": url.deletingPathExtension().lastPathComponent, "path": url.path]
            }
            completion(results)
        } catch {
            completion([])
        }
    }

    /// Validate that a path resolves within one of the allowed directories.
    private static func isPathAllowed(_ path: String) -> Bool {
        let resolved = URL(fileURLWithPath: path).standardizedFileURL.path
        var allowedDirs = [
            getTemplatesFolder().standardizedFileURL.path,
            getMapsFolder().standardizedFileURL.path,
        ]
        if let bundlePath = Bundle.main.resourceURL?.standardizedFileURL.path {
            allowedDirs.append(bundlePath)
        }
        return allowedDirs.contains { dir in
            resolved.hasPrefix(dir + "/") || resolved == dir
        }
    }

    /// Read a .cmt template file and return its content.
    /// Validates the path is within allowed directories.
    static func loadTemplateFile(path: String, completion: @escaping @MainActor (String) -> Void) {
        guard isPathAllowed(path) else {
            let alert = NSAlert()
            alert.messageText = "Access denied"
            alert.informativeText = "The file path is outside allowed directories."
            alert.runModal()
            return
        }
        let url = URL(fileURLWithPath: path)
        do {
            let content = try String(contentsOf: url, encoding: .utf8)
            completion(content)
        } catch {
            let alert = NSAlert()
            alert.messageText = "Failed to read template"
            alert.informativeText = error.localizedDescription
            alert.runModal()
        }
    }

    /// Show NSSavePanel for a .cmt template file.
    static func saveTemplateFile(content: String, defaultName: String, completion: @escaping @MainActor (String) -> Void) {
        let panel = NSSavePanel()
        panel.title = "Save Template"
        panel.nameFieldStringValue = defaultName
        panel.allowedContentTypes = [UTType(filenameExtension: "cmt")!]
        panel.directoryURL = getTemplatesFolder()

        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            do {
                try content.write(to: url, atomically: true, encoding: .utf8)
                completion(url.path)
            } catch {
                let alert = NSAlert()
                alert.messageText = "Failed to save template"
                alert.informativeText = error.localizedDescription
                alert.runModal()
            }
        }
    }

    /// Show NSOpenPanel for .cm and .cmt files, read contents, and call completion.
    /// Completion receives (content, filename, fullPath).
    static func openFile(completion: @escaping @MainActor (String, String, String) -> Void) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.allowedContentTypes = [UTType.plainText, UTType.json, UTType.data]
        panel.allowsOtherFileTypes = true
        panel.message = "Select a .cm concept map or .cmt template file"

        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            do {
                let content = try String(contentsOf: url, encoding: .utf8)
                completion(content, url.lastPathComponent, url.path)
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
        panel.nameFieldStringValue = "concept-map.cm"
        panel.allowedContentTypes = [UTType(filenameExtension: "cm")!]

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

    /// Show NSSavePanel for a new file and call completion with the saved path.
    static func saveNewFile(content: String, defaultName: String, completion: @escaping @MainActor (String) -> Void) {
        let panel = NSSavePanel()
        panel.title = "Save New Taxonomy"
        panel.nameFieldStringValue = defaultName
        panel.allowedContentTypes = [UTType(filenameExtension: "cm")!]

        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            do {
                try content.write(to: url, atomically: true, encoding: .utf8)
                completion(url.path)
            } catch {
                let alert = NSAlert()
                alert.messageText = "Failed to save taxonomy"
                alert.informativeText = error.localizedDescription
                alert.runModal()
            }
        }
    }

    /// Write content to a known file path without showing a dialog.
    static func saveToPath(content: String, path: String) {
        let url = URL(fileURLWithPath: path)
        do {
            try content.write(to: url, atomically: true, encoding: .utf8)
        } catch {
            let alert = NSAlert()
            alert.messageText = "Failed to auto-save"
            alert.informativeText = error.localizedDescription
            alert.runModal()
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
