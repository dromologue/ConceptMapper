import Foundation
import WebKit
import AppKit
import os.log

private let logger = Logger(subsystem: "com.dromologue.ConceptLLM", category: "Bridge")

/// Handles bidirectional communication between Swift and the React SPA in WKWebView.
@MainActor
class WebViewBridge: NSObject, ObservableObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

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
                    self?.webView?.evaluateJavaScript(
                        "window.taxonomySaved?.('\(savedPath)');"
                    ) { _, _ in }
                }
            }
        case "listTemplates":
            // Copy bundled templates on first call
            FileHandler.copyBundledTemplates()
            FileHandler.listTemplates { [weak self] results in
                if let jsonData = try? JSONSerialization.data(withJSONObject: results),
                   let jsonString = String(data: jsonData, encoding: .utf8) {
                    self?.webView?.evaluateJavaScript(
                        "window.templatesLoaded?.('\(jsonString.replacingOccurrences(of: "'", with: "\\'"))');"
                    ) { _, _ in }
                }
            }
        case "listMaps":
            FileHandler.listMaps { [weak self] results in
                if let jsonData = try? JSONSerialization.data(withJSONObject: results),
                   let jsonString = String(data: jsonData, encoding: .utf8) {
                    self?.webView?.evaluateJavaScript(
                        "window.mapsLoaded?.('\(jsonString.replacingOccurrences(of: "'", with: "\\'"))');"
                    ) { _, _ in }
                }
            }
        case "loadMap":
            // JS sends JSON with { path } — load a .cm file from the Maps folder
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let path = json["path"] {
                let url = URL(fileURLWithPath: path)
                do {
                    let content = try String(contentsOf: url, encoding: .utf8)
                    loadFileContent(content, filename: url.lastPathComponent, filePath: path)
                } catch {
                    // silently ignore
                }
            }
        case "loadTemplate":
            // JS sends JSON with { path }
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let path = json["path"] {
                FileHandler.loadTemplateFile(path: path) { [weak self] content in
                    let escaped = content.replacingOccurrences(of: "'", with: "\\'")
                        .replacingOccurrences(of: "\n", with: "\\n")
                    self?.webView?.evaluateJavaScript(
                        "window.templateLoaded?.('\(escaped)');"
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

        // MARK: LLM Config
        case "loadConfig":
            FileHandler.loadConfig { [weak self] content in
                let escaped = content.replacingOccurrences(of: "\\", with: "\\\\")
                    .replacingOccurrences(of: "'", with: "\\'")
                    .replacingOccurrences(of: "\n", with: "\\n")
                self?.webView?.evaluateJavaScript(
                    "window.configLoaded?.('\(escaped)');"
                ) { _, _ in }
            }
        case "saveConfig":
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let content = json["content"] {
                FileHandler.saveConfig(content: content)
            }

        // MARK: LLM Chat
        case "llmChat":
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let configStr = json["config"] as? String,
               let messagesStr = json["messages"] as? String,
               let requestId = json["requestId"] as? String {
                let systemPrompt = json["systemPrompt"] as? String
                LLMService.sendMessage(configJSON: configStr, messagesJSON: messagesStr, systemPrompt: systemPrompt) { [weak self] result in
                    Task { @MainActor in
                        switch result {
                        case .success(let content):
                            let escaped = content.replacingOccurrences(of: "\\", with: "\\\\")
                                .replacingOccurrences(of: "'", with: "\\'")
                                .replacingOccurrences(of: "\n", with: "\\n")
                                .replacingOccurrences(of: "\r", with: "")
                            self?.webView?.evaluateJavaScript(
                                "window.llmResponse?.({requestId: '\(requestId)', content: '\(escaped)'});"
                            ) { _, _ in }
                        case .failure(let error):
                            let msg = error.localizedDescription
                                .replacingOccurrences(of: "'", with: "\\'")
                            self?.webView?.evaluateJavaScript(
                                "window.llmError?.({requestId: '\(requestId)', error: '\(msg)'});"
                            ) { _, _ in }
                        }
                    }
                }
            }

        // MARK: LLM Test Connection
        case "llmTestConnection":
            if let data = body.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: String],
               let configStr = json["config"] {
                let testMessages = "[{\"role\": \"user\", \"content\": \"Say hello in exactly one word.\"}]"
                LLMService.sendMessage(configJSON: configStr, messagesJSON: testMessages, systemPrompt: nil) { [weak self] result in
                    Task { @MainActor in
                        switch result {
                        case .success:
                            self?.webView?.evaluateJavaScript(
                                "window.llmTestResult?.({success: true});"
                            ) { _, _ in }
                        case .failure(let error):
                            let msg = error.localizedDescription
                                .replacingOccurrences(of: "'", with: "\\'")
                            self?.webView?.evaluateJavaScript(
                                "window.llmTestResult?.({success: false, error: '\(msg)'});"
                            ) { _, _ in }
                        }
                    }
                }
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
        let pathArg = filePath.map { "'\($0)'" } ?? "undefined"
        // logger removed — file open is working
        let js = "window.loadFileContentBase64('\(base64)', '\(filename)', \(pathArg));"
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
