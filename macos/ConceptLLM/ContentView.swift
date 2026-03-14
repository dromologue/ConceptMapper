import SwiftUI
import WebKit

struct ContentView: View {
    @StateObject private var bridge = WebViewBridge()

    var body: some View {
        WebView(bridge: bridge)
            .frame(minWidth: 800, minHeight: 600)
            .onReceive(NotificationCenter.default.publisher(for: .openFile)) { _ in
                FileHandler.openFile { content, filename in
                    bridge.loadFileContent(content, filename: filename)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .saveFile)) { _ in
                bridge.requestGraphJSON { json in
                    FileHandler.saveFile(content: json, type: "json", title: "Save Graph")
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .exportImage)) { _ in
                bridge.requestCanvasImage { dataURL in
                    FileHandler.saveImageFromDataURL(dataURL)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .exportMarkdown)) { _ in
                bridge.requestGraphMarkdown { md in
                    FileHandler.saveFile(content: md, type: "md", title: "Export Markdown")
                }
            }
    }
}

struct WebView: NSViewRepresentable {
    let bridge: WebViewBridge

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()

        // Register JS → Swift message handlers
        for handler in ["openFile", "saveFile", "exportImage", "exportMarkdown"] {
            userContentController.add(bridge, name: handler)
        }
        config.userContentController = userContentController

        // Allow file:// access for local resources
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isInspectable = true
        bridge.webView = webView

        // Load the bundled React SPA
        if let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            let dirURL = htmlURL.deletingLastPathComponent()
            webView.loadFileURL(htmlURL, allowingReadAccessTo: dirURL)
        } else {
            NSLog("[ConceptLLM] ERROR: index.html not found in app bundle")
        }

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            NSLog("[ConceptLLM] Navigation failed: %@", error.localizedDescription)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            NSLog("[ConceptLLM] Provisional navigation failed: %@", error.localizedDescription)
        }
    }
}
