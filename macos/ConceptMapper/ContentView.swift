import SwiftUI
import WebKit
import os.log

private let logger = Logger(subsystem: "com.dromologue.ConceptMapper", category: "WebView")

struct ContentView: View {
    @StateObject private var bridge = WebViewBridge()

    var body: some View {
        WebView(bridge: bridge)
            .frame(minWidth: 800, minHeight: 600)
            .onReceive(NotificationCenter.default.publisher(for: .openFile)) { _ in
            Task {
                if let (content, filename, filePath) = try? await FileHandler.openFile() {
                    bridge.loadFileContent(content, filename: filename, filePath: filePath)
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .saveFile)) { _ in
            Task {
                let md = await bridge.requestGraphMarkdown()
                _ = try? await FileHandler.saveFile(content: md, type: "cm", title: "Save Concept Map")
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .exportImage)) { _ in
            Task {
                let dataURL = await bridge.requestCanvasImage()
                try? await FileHandler.saveImageFromDataURL(dataURL)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .exportMarkdown)) { _ in
            Task {
                let md = await bridge.requestGraphMarkdown()
                _ = try? await FileHandler.saveFile(content: md, type: "cm", title: "Export Concept Map")
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .newTaxonomy)) { _ in
            bridge.emitShowTaxonomyWizard()
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

        // Single typed transport plus a separate jsLog channel for early-boot
        // error reporting (fires before the bridge is fully wired).
        userContentController.add(bridge, name: "bridge")
        userContentController.add(bridge, name: "jsLog")

        let errorScript = WKUserScript(
            source: """
            window.onerror = function(msg, url, line, col, error) {
                window.webkit.messageHandlers.jsLog.postMessage('ERROR: ' + msg + ' at ' + url + ':' + line);
                return false;
            };
            window.addEventListener('unhandledrejection', function(e) {
                window.webkit.messageHandlers.jsLog.postMessage('UNHANDLED_REJECTION: ' + e.reason);
            });
            console.log('Error handler injected');
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        userContentController.addUserScript(errorScript)

        config.userContentController = userContentController

        // Allow file:// access for local resources
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        // Disable caching to always load fresh bundle resources
        config.websiteDataStore = WKWebsiteDataStore.nonPersistent()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isInspectable = true
        bridge.webView = webView

        // Load the bundled React SPA
        if let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            let dirURL = htmlURL.deletingLastPathComponent()
            logger.info("Loading \(htmlURL.absoluteString)")
            webView.loadFileURL(htmlURL, allowingReadAccessTo: dirURL)
        } else {
            logger.error("index.html not found in app bundle")
        }

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            logger.info("Page loaded successfully")

            webView.evaluateJavaScript("document.getElementById('root').innerHTML.length") { result, error in
                if let len = result as? Int {
                    logger.info("React root innerHTML length: \(len)")
                }
                if let error = error {
                    logger.error("JS eval error: \(error.localizedDescription)")
                }
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            logger.error("Navigation failed: \(error.localizedDescription)")
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            logger.error("Provisional navigation failed: \(error.localizedDescription)")
        }
    }
}
