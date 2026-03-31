import Foundation
import WebKit
import AppKit
import os.log

private let logger = Logger(subsystem: "com.dromologue.ConceptLLM", category: "Bridge")

/// Handles bidirectional communication between Swift and the React SPA in WKWebView.
@MainActor
class WebViewBridge: NSObject, ObservableObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    /// Produce a safe JS string literal (double-quoted, properly escaped) using JSON serialization.
    /// Returns a quoted string safe for interpolation into evaluateJavaScript calls.
    private func safeJSString(_ str: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: str, options: .fragmentsAllowed),
              let json = String(data: data, encoding: .utf8) else {
            return "\"\""
        }
        return json
    }

    // MARK: - JS → Swift (message handlers)

    nonisolated func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        let name = message.name
        let body = "\(message.body)"
        Task { @MainActor in
            handleMessage(name, body: body)
        }
    }

    private func handleMessage(_ name: String, body: String) {
        switch name {
        case "jsLog":
            logger.warning("[JS] \(body)")
            return
        case "openFile":
            print("[Bridge] openFile handler called")
            FileHandler.openFile { [weak self] content, filename, filePath in
                print("[Bridge] FileHandler returned: \(filename), \(content.count) bytes")
                self?.loadFileContent(content, filename: filename, filePath: filePath)
            }
        case "saveFile":
            requestGraphJSON { json in
                FileHandler.saveFile(content: json, type: "json", title: "Save Graph")
            }
        case "exportImage":
            requestCanvasImage { dataURL in
                FileHandler.saveImageFromDataURL(dataURL)
            }
        case "exportMarkdown":
            requestGraphMarkdown { md in
                FileHandler.saveFile(content: md, type: "md", title: "Export Markdown")
            }
        case "saveToPath":
            // Auto-save: JS sends JSON with { path, content }
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let path = json["path"],
               let content = json["content"] {
                FileHandler.saveToPath(content: content, path: path)
            }
        case "saveNewTaxonomy":
            // Taxonomy wizard: save new .cm file into Maps folder and callback with path
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let content = json["content"],
               let title = json["title"] {
                let filename = title.lowercased()
                    .replacingOccurrences(of: "[^a-z0-9]+", with: "_", options: .regularExpression)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "_"))
                FileHandler.saveNewFile(content: content, defaultName: "\(filename).cm") { [weak self] savedPath in
                    guard let self = self else { return }
                    self.webView?.evaluateJavaScript(
                        "window.taxonomySaved?.(\(self.safeJSString(savedPath)));"
                    ) { _, _ in }
                }
            }
        case "listTemplates":
            // Copy bundled templates on first call
            FileHandler.copyBundledTemplates()
            FileHandler.listTemplates { [weak self] results in
                guard let self = self else { return }
                if let jsonData = try? JSONSerialization.data(withJSONObject: results),
                   let jsonString = String(data: jsonData, encoding: .utf8) {
                    self.webView?.evaluateJavaScript(
                        "window.templatesLoaded?.(\(self.safeJSString(jsonString)));"
                    ) { _, _ in }
                }
            }
        case "listMaps":
            FileHandler.listMaps { [weak self] results in
                guard let self = self else { return }
                if let jsonData = try? JSONSerialization.data(withJSONObject: results),
                   let jsonString = String(data: jsonData, encoding: .utf8) {
                    self.webView?.evaluateJavaScript(
                        "window.mapsLoaded?.(\(self.safeJSString(jsonString)));"
                    ) { _, _ in }
                }
            }
        case "loadMap":
            // JS sends JSON with { path } — load .cm file and its referenced .cmt template
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let path = json["path"] {
                let url = URL(fileURLWithPath: path)
                do {
                    let content = try String(contentsOf: url, encoding: .utf8)
                    // Extract template reference: <!-- template: filename.cmt -->
                    var templateJSON = "null"
                    if let range = content.range(of: #"<!--\s*template:\s*(.+?)\s*-->"#, options: .regularExpression) {
                        let comment = String(content[range])
                        let tmplName = comment
                            .replacingOccurrences(of: #"<!--\s*template:\s*"#, with: "", options: .regularExpression)
                            .replacingOccurrences(of: #"\s*-->"#, with: "", options: .regularExpression)
                            .trimmingCharacters(in: .whitespaces)
                        let cmtName = tmplName.hasSuffix(".cmt") ? tmplName : "\(tmplName).cmt"
                        let templateURL = Bundle.main.url(forResource: cmtName.replacingOccurrences(of: ".cmt", with: ""),
                                                          withExtension: "cmt", subdirectory: "templates")
                            ?? FileHandler.getTemplatesFolder().appendingPathComponent(cmtName)
                        if let tmplContent = try? String(contentsOf: templateURL, encoding: .utf8) {
                            templateJSON = tmplContent
                        }
                    }
                    // Send both template and map content in one JS call (base64-encode both to avoid escaping issues)
                    guard let mapData = content.data(using: .utf8) else { return }
                    let base64 = mapData.base64EncodedString()
                    let tmplBase64 = templateJSON.data(using: .utf8)?.base64EncodedString() ?? ""
                    let filename = url.lastPathComponent
                    let js = "window.loadMapWithTemplate?.('\(base64)', '\(filename)', '\(path)', '\(tmplBase64)');"
                    webView?.evaluateJavaScript(js) { _, error in
                        if let error = error { print("loadMap error: \(error)") }
                    }
                } catch {
                    print("loadMap file error: \(error)")
                }
            }
        case "loadTemplate":
            // JS sends JSON with { path }
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let path = json["path"] {
                FileHandler.loadTemplateFile(path: path) { [weak self] content in
                    guard let self = self else { return }
                    self.webView?.evaluateJavaScript(
                        "window.templateLoaded?.(\(self.safeJSString(content)));"
                    ) { _, _ in }
                }
            }
        case "saveTemplate":
            // JS sends JSON with { content, title }
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let content = json["content"],
               let title = json["title"] {
                let filename = title.lowercased()
                    .replacingOccurrences(of: "[^a-z0-9]+", with: "_", options: .regularExpression)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "_"))
                FileHandler.saveTemplateFile(content: content, defaultName: "\(filename).cmt") { _ in }
            }

        case "openURL":
            if let url = URL(string: body) {
                NSWorkspace.shared.open(url)
            }

        default:
            break
        }
    }

    // MARK: - Swift → JS

    /// Send file content to the React app for parsing and rendering.
    func loadFileContent(_ content: String, filename: String, filePath: String? = nil) {
        guard let data = content.data(using: .utf8) else { return }
        let base64 = data.base64EncodedString()
        let pathArg = filePath.map { safeJSString($0) } ?? "undefined"
        let js = "window.loadFileContentBase64('\(base64)', \(safeJSString(filename)), \(pathArg));"
        webView?.evaluateJavaScript(js) { _, error in
            if let error = error {
                print("Bridge error: \(error)")
            }
        }
    }

    /// Request the current graph as JSON from the React app.
    func requestGraphJSON(completion: @escaping @MainActor (String) -> Void) {
        webView?.evaluateJavaScript("window.getGraphJSON();") { result, _ in
            if let json = result as? String {
                completion(json)
            }
        }
    }

    /// Request the canvas as a data URL from the React app.
    func requestCanvasImage(completion: @escaping @MainActor (String) -> Void) {
        webView?.evaluateJavaScript("window.getCanvasImage();") { result, _ in
            if let dataURL = result as? String {
                completion(dataURL)
            }
        }
    }

    /// Request the graph as markdown from the React app.
    func requestGraphMarkdown(completion: @escaping @MainActor (String) -> Void) {
        webView?.evaluateJavaScript("window.getGraphMarkdown();") { result, _ in
            if let md = result as? String {
                completion(md)
            }
        }
    }
}
