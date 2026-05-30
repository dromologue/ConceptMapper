import AppKit
import UniformTypeIdentifiers

/// Handles file open/save operations using native macOS panels. All async.
@MainActor
enum FileHandler {

    // MARK: - Base directories (synchronous — pure path math)

    /// App data directory (sandbox container Documents/).
    static func getBaseFolder() -> URL {
        let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
            .appendingPathComponent("ConceptMapper")
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
        return folder
    }

    static func getMapsFolder() -> URL {
        let folder = getBaseFolder().appendingPathComponent("Maps")
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
        return folder
    }

    static func getTemplatesFolder() -> URL {
        let folder = getBaseFolder().appendingPathComponent("Templates")
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        }
        return folder
    }

    /// Sandbox path whitelist for read operations.
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

    // MARK: - Bundled-asset hydration (idempotent, no IO errors propagated)

    /// Copy bundled example .cm maps to the user Maps folder on first run.
    static func copyBundledMaps() {
        let folder = getMapsFolder()
        guard let resourceURL = Bundle.main.resourceURL else { return }
        let bundledDir = resourceURL.appendingPathComponent("maps")
        guard FileManager.default.fileExists(atPath: bundledDir.path) else { return }
        let existing = (try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "cm" }) ?? []
        guard existing.isEmpty else { return }
        if let bundledFiles = try? FileManager.default.contentsOfDirectory(at: bundledDir, includingPropertiesForKeys: nil)
            .filter({ $0.pathExtension == "cm" }) {
            for file in bundledFiles {
                let dest = folder.appendingPathComponent(file.lastPathComponent)
                try? FileManager.default.copyItem(at: file, to: dest)
            }
        }
    }

    /// Sync bundled .cmt templates to the user templates folder.
    static func copyBundledTemplates() {
        let folder = getTemplatesFolder()
        guard let resourceURL = Bundle.main.resourceURL else { return }
        let bundledDir = resourceURL.appendingPathComponent("templates")
        guard FileManager.default.fileExists(atPath: bundledDir.path) else { return }
        do {
            let bundledFiles = try FileManager.default.contentsOfDirectory(at: bundledDir, includingPropertiesForKeys: nil)
                .filter { $0.pathExtension == "cmt" }
            let bundledNames = Set(bundledFiles.map { $0.lastPathComponent })
            for file in bundledFiles {
                let dest = folder.appendingPathComponent(file.lastPathComponent)
                if !FileManager.default.fileExists(atPath: dest.path) {
                    try FileManager.default.copyItem(at: file, to: dest)
                }
            }
            let userFiles = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
                .filter { $0.pathExtension == "cmt" }
            for file in userFiles {
                if !bundledNames.contains(file.lastPathComponent) {
                    try FileManager.default.removeItem(at: file)
                }
            }
        } catch {
            // best-effort hydration; failures here aren't fatal
        }
    }

    // MARK: - Catalogue queries

    struct CatalogueEntry {
        let name: String
        let path: String
    }

    static func listMaps() async throws -> [CatalogueEntry] {
        let folder = getMapsFolder()
        let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.contentModificationDateKey])
            .filter { $0.pathExtension == "cm" }
            .sorted { a, b in
                let da = (try? a.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? Date.distantPast
                let db = (try? b.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? Date.distantPast
                return da > db
            }
        return files.map { CatalogueEntry(name: $0.deletingPathExtension().lastPathComponent, path: $0.path) }
    }

    static func listTemplates() async throws -> [CatalogueEntry] {
        let folder = getTemplatesFolder()
        let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "cmt" }
        return files.map { CatalogueEntry(name: $0.deletingPathExtension().lastPathComponent, path: $0.path) }
    }

    // MARK: - Reads

    static func loadTemplateFile(path: String) async throws -> String {
        guard isPathAllowed(path) else {
            throw BridgeError.io("Access denied: \(path) is outside allowed directories")
        }
        let url = URL(fileURLWithPath: path)
        return try String(contentsOf: url, encoding: .utf8)
    }

    // MARK: - Writes

    static func saveToPath(content: String, path: String) async throws {
        let url = URL(fileURLWithPath: path)
        try content.write(to: url, atomically: true, encoding: .utf8)
    }

    static func writeText(content: String, toPath path: String) async throws {
        let url = URL(fileURLWithPath: path)
        try content.write(to: url, atomically: true, encoding: .utf8)
    }

    /// Silently overwrite a .cmt template colocated with its map, or fall back
    /// to the shared templates folder.
    static func overwriteTemplateForMap(
        content: String,
        templateFilename: String,
        sourceMapPath: String?
    ) async throws {
        if let mapPath = sourceMapPath, !mapPath.isEmpty {
            let mapDir = URL(fileURLWithPath: mapPath).deletingLastPathComponent()
            let candidate = mapDir.appendingPathComponent(templateFilename)
            if FileManager.default.fileExists(atPath: candidate.path) {
                try content.write(to: candidate, atomically: true, encoding: .utf8)
                return
            }
        }
        let folder = getTemplatesFolder()
        let url = folder.appendingPathComponent(templateFilename)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try content.write(to: url, atomically: true, encoding: .utf8)
    }

    // MARK: - Panel-driven IO (NSOpenPanel / NSSavePanel wrapped as async)

    /// Show NSSavePanel for a .cmt template file. Returns the saved path or
    /// nil if the user cancelled.
    static func saveTemplateFile(content: String, defaultName: String) async throws -> String? {
        let panel = NSSavePanel()
        panel.title = "Save Template"
        panel.nameFieldStringValue = defaultName
        panel.allowedContentTypes = [UTType(filenameExtension: "cmt")!]
        panel.directoryURL = getTemplatesFolder()
        guard let url = await runSavePanel(panel) else { return nil }
        try content.write(to: url, atomically: true, encoding: .utf8)
        return url.path
    }

    /// NSOpenPanel for .cm and .cmt files. Throws on read failure; returns
    /// nil if the user cancelled.
    static func openFile() async throws -> (content: String, filename: String, filePath: String) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.allowedContentTypes = [UTType.plainText, UTType.json, UTType.data]
        panel.allowsOtherFileTypes = true
        panel.message = "Select a .cm concept map or .cmt template file"
        guard let url = await runOpenPanel(panel) else {
            throw BridgeError(code: .userCancelled, message: "openFile cancelled")
        }
        let content = try String(contentsOf: url, encoding: .utf8)
        return (content, url.lastPathComponent, url.path)
    }

    /// NSSavePanel for a generic file. Returns the saved path or nil if
    /// cancelled.
    @discardableResult
    static func saveFile(content: String, type: String, title: String) async throws -> String? {
        let panel = NSSavePanel()
        panel.title = title
        panel.nameFieldStringValue = "concept-map.\(type)"
        if let utType = UTType(filenameExtension: type) {
            panel.allowedContentTypes = [utType]
        }
        guard let url = await runSavePanel(panel) else { return nil }
        try content.write(to: url, atomically: true, encoding: .utf8)
        return url.path
    }

    /// NSSavePanel for a new .cm file. Returns the saved path or nil if
    /// cancelled.
    static func saveNewFile(content: String, defaultName: String) async throws -> String {
        let panel = NSSavePanel()
        panel.title = "Save New Taxonomy"
        panel.nameFieldStringValue = defaultName
        panel.allowedContentTypes = [UTType(filenameExtension: "cm")!]
        guard let url = await runSavePanel(panel) else {
            throw BridgeError(code: .userCancelled, message: "saveNewFile cancelled")
        }
        try content.write(to: url, atomically: true, encoding: .utf8)
        return url.path
    }

    /// Decode a data URL from the canvas and save as PNG via NSSavePanel.
    static func saveImageFromDataURL(_ dataURL: String) async throws {
        guard let commaIndex = dataURL.firstIndex(of: ",") else {
            throw BridgeError.malformedPayload("data URL missing comma")
        }
        let base64 = String(dataURL[dataURL.index(after: commaIndex)...])
        guard let imageData = Data(base64Encoded: base64) else {
            throw BridgeError.malformedPayload("data URL not valid base64")
        }
        let panel = NSSavePanel()
        panel.title = "Export Image"
        panel.nameFieldStringValue = "concept-map.png"
        panel.allowedContentTypes = [UTType.png]
        guard let url = await runSavePanel(panel) else { return }
        try imageData.write(to: url)
    }

    /// Prompt for an export location (defaults to Downloads) and write the
    /// base64-decoded bytes there. Sandbox-compliant via NSSavePanel.
    static func saveExport(base64Data: String, filename: String) async throws {
        guard let data = Data(base64Encoded: base64Data) else {
            throw BridgeError.malformedPayload("export payload not valid base64")
        }
        let panel = NSSavePanel()
        panel.title = "Export"
        panel.nameFieldStringValue = filename
        panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        let ext = (filename as NSString).pathExtension
        if !ext.isEmpty, let type = UTType(filenameExtension: ext) {
            panel.allowedContentTypes = [type]
        }
        guard let url = await runSavePanel(panel) else { return }
        try data.write(to: url)
    }

    /// Open a markdown file via NSOpenPanel for attachment to a node. Returns
    /// nil if the user cancelled.
    static func attachMarkdownFile() async throws -> (path: String, content: String)? {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [
            UTType(filenameExtension: "md")!,
            UTType(filenameExtension: "markdown")!,
            UTType.text
        ]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.title = "Attach Markdown File"
        guard let url = await runOpenPanel(panel) else { return nil }
        let content = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
        return (url.path, content)
    }

    // MARK: - Panel helpers

    private static func runSavePanel(_ panel: NSSavePanel) async -> URL? {
        await withCheckedContinuation { (cont: CheckedContinuation<URL?, Never>) in
            panel.begin { response in
                cont.resume(returning: response == .OK ? panel.url : nil)
            }
        }
    }

    private static func runOpenPanel(_ panel: NSOpenPanel) async -> URL? {
        await withCheckedContinuation { (cont: CheckedContinuation<URL?, Never>) in
            panel.begin { response in
                cont.resume(returning: response == .OK ? panel.url : nil)
            }
        }
    }
}
