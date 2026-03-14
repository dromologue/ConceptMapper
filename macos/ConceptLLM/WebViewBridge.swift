import Foundation
import WebKit

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
        Task { @MainActor in
            handleMessage(name)
        }
    }

    private func handleMessage(_ name: String) {
        switch name {
        case "openFile":
            FileHandler.openFile { [weak self] content, filename in
                self?.loadFileContent(content, filename: filename)
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
        default:
            break
        }
    }

    // MARK: - Swift → JS

    /// Send file content to the React app for parsing and rendering.
    func loadFileContent(_ content: String, filename: String) {
        let escaped = content
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
        let js = "window.loadFileContent('\(escaped)', '\(filename)');"
        webView?.evaluateJavaScript(js)
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
