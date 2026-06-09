import UIKit
import UniformTypeIdentifiers

/// iOS file IO. Exposes the SAME static API the shared `WebViewBridge` calls as
/// the macOS `FileHandler`, so the bridge compiles unchanged in both targets.
/// FileManager-based operations are identical; native panels are replaced with
/// `UIDocumentPicker` (open/attach) and writes to the app's Documents folder.
@MainActor
enum FileHandler {

    // MARK: - Base directories

    /// The iCloud container the macOS and iOS apps share so Maps + Templates are
    /// the same files on both. Must match the macOS FileHandler and both
    /// entitlements / `NSUbiquitousContainers` Info.plist entries.
    static let iCloudContainerID = "iCloud.com.dromologue.ConceptMapper"
    private static var cachedBaseFolder: URL?

    /// Base data directory. Prefers the shared iCloud container's `Documents`
    /// folder (user-visible as "ConceptMapper" in iCloud Drive); falls back to
    /// the local Documents folder when iCloud is unavailable (not signed in /
    /// simulator). Resolved once and cached — the ubiquity lookup does IO.
    static func getBaseFolder() -> URL {
        if let cached = cachedBaseFolder { return cached }
        let base: URL
        if let ubiquity = FileManager.default.url(forUbiquityContainerIdentifier: iCloudContainerID) {
            base = ubiquity.appendingPathComponent("Documents")
        } else {
            base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
                .appendingPathComponent("ConceptMapper")
        }
        if !FileManager.default.fileExists(atPath: base.path) {
            try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        }
        cachedBaseFolder = base
        return base
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

    // MARK: - Bundled-asset hydration (idempotent)

    /// One-time flag so we seed the example maps exactly once and never
    /// resurrect an example the user has since deleted.
    static let seededMapsKey = "cm.didSeedExampleMaps.v1"

    static func copyBundledMaps() {
        let folder = getMapsFolder()
        guard let resourceURL = Bundle.main.resourceURL else { return }
        let bundledDir = resourceURL.appendingPathComponent("maps")
        guard FileManager.default.fileExists(atPath: bundledDir.path) else { return }
        guard let bundledFiles = try? FileManager.default.contentsOfDirectory(at: bundledDir, includingPropertiesForKeys: nil)
            .filter({ $0.pathExtension == "cm" }), !bundledFiles.isEmpty else { return }

        // Seed each bundled example by name when it's missing — but only on the
        // first launch that runs this code (gated by the flag). The earlier
        // logic seeded only when the Maps folder was *entirely* empty, so a
        // pre-existing or iCloud-synced Maps folder meant the examples never
        // arrived. Seeding missing-by-name guarantees they ship through on first
        // run regardless; the one-time flag means a later deletion sticks.
        guard !UserDefaults.standard.bool(forKey: seededMapsKey) else { return }
        for file in bundledFiles {
            let dest = folder.appendingPathComponent(file.lastPathComponent)
            if !FileManager.default.fileExists(atPath: dest.path) {
                try? FileManager.default.copyItem(at: file, to: dest)
            }
        }
        UserDefaults.standard.set(true, forKey: seededMapsKey)
    }

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
            for file in userFiles where !bundledNames.contains(file.lastPathComponent) {
                try FileManager.default.removeItem(at: file)
            }
        } catch {
            // best-effort hydration
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
        return try String(contentsOf: URL(fileURLWithPath: path), encoding: .utf8)
    }

    // MARK: - Writes

    static func saveToPath(content: String, path: String) async throws {
        try content.write(to: URL(fileURLWithPath: path), atomically: true, encoding: .utf8)
    }

    static func writeText(content: String, toPath path: String) async throws {
        try content.write(to: URL(fileURLWithPath: path), atomically: true, encoding: .utf8)
    }

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

    // MARK: - Saves (iOS: write to the app's Documents subfolders)

    /// Save a new .cm into the Maps folder and return its path.
    static func saveNewFile(content: String, defaultName: String) async throws -> String {
        let url = getMapsFolder().appendingPathComponent(defaultName)
        try content.write(to: url, atomically: true, encoding: .utf8)
        return url.path
    }

    /// Save a .cmt into the Templates folder; returns its path.
    @discardableResult
    static func saveTemplateFile(content: String, defaultName: String) async throws -> String? {
        let url = getTemplatesFolder().appendingPathComponent(defaultName)
        try content.write(to: url, atomically: true, encoding: .utf8)
        return url.path
    }

    /// Save a generic concept-map export into the Maps folder; returns its path.
    @discardableResult
    static func saveFile(content: String, type: String, title: String) async throws -> String? {
        let name = "concept-map.\(type)"
        let url = getMapsFolder().appendingPathComponent(name)
        try content.write(to: url, atomically: true, encoding: .utf8)
        return url.path
    }

    /// Decode a canvas data URL and present a share sheet to save the PNG.
    static func saveImageFromDataURL(_ dataURL: String) async throws {
        guard let commaIndex = dataURL.firstIndex(of: ",") else {
            throw BridgeError.malformedPayload("data URL missing comma")
        }
        let base64 = String(dataURL[dataURL.index(after: commaIndex)...])
        guard let imageData = Data(base64Encoded: base64) else {
            throw BridgeError.malformedPayload("data URL not valid base64")
        }
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("concept-map.png")
        try imageData.write(to: tmp)
        await presentShareSheet(for: tmp)
    }

    /// Decode base64 export bytes and present a share sheet.
    static func saveExport(base64Data: String, filename: String) async throws {
        guard let data = Data(base64Encoded: base64Data) else {
            throw BridgeError.malformedPayload("export payload not valid base64")
        }
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try data.write(to: tmp)
        await presentShareSheet(for: tmp)
    }

    // MARK: - Document picker (open / attach)

    static func openFile() async throws -> (content: String, filename: String, filePath: String) {
        guard let url = await pickDocument(types: [.plainText, .json, .data]) else {
            throw BridgeError(code: .userCancelled, message: "openFile cancelled")
        }
        let needsStop = url.startAccessingSecurityScopedResource()
        defer { if needsStop { url.stopAccessingSecurityScopedResource() } }
        let content = try String(contentsOf: url, encoding: .utf8)
        return (content, url.lastPathComponent, url.path)
    }

    static func attachMarkdownFile() async throws -> (path: String, content: String)? {
        let mdTypes = [UTType("net.daringfireball.markdown"), UTType(filenameExtension: "md"), UTType.text]
            .compactMap { $0 }
        guard let url = await pickDocument(types: mdTypes) else { return nil }
        let needsStop = url.startAccessingSecurityScopedResource()
        defer { if needsStop { url.stopAccessingSecurityScopedResource() } }
        let content = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
        return (url.path, content)
    }

    // MARK: - UIKit helpers

    private static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
        var top = scene?.keyWindow?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }

    private static func pickDocument(types: [UTType]) async -> URL? {
        await withCheckedContinuation { (cont: CheckedContinuation<URL?, Never>) in
            guard let presenter = topViewController() else { cont.resume(returning: nil); return }
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
            let delegate = DocumentPickerDelegate { url in cont.resume(returning: url) }
            picker.delegate = delegate
            objc_setAssociatedObject(picker, &DocumentPickerDelegate.assocKey, delegate, .OBJC_ASSOCIATION_RETAIN)
            presenter.present(picker, animated: true)
        }
    }

    private static func presentShareSheet(for url: URL) async {
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            guard let presenter = topViewController() else { cont.resume(); return }
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            sheet.completionWithItemsHandler = { _, _, _, _ in cont.resume() }
            // iPad requires a popover anchor.
            sheet.popoverPresentationController?.sourceView = presenter.view
            sheet.popoverPresentationController?.sourceRect = CGRect(
                x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
            sheet.popoverPresentationController?.permittedArrowDirections = []
            presenter.present(sheet, animated: true)
        }
    }
}

/// Retained delegate that bridges the document picker's callbacks to a closure.
private final class DocumentPickerDelegate: NSObject, UIDocumentPickerDelegate {
    nonisolated(unsafe) static var assocKey: UInt8 = 0
    private let onPick: (URL?) -> Void
    init(onPick: @escaping (URL?) -> Void) { self.onPick = onPick }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        onPick(urls.first)
    }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        onPick(nil)
    }
}
