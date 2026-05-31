import SwiftUI
import WebKit
import os.log

private let logger = Logger(subsystem: "com.dromologue.ConceptMapper", category: "WebView")

struct ContentView: View {
    @StateObject private var bridge = WebViewBridge()

    var body: some View {
        WebView(bridge: bridge)
            .ignoresSafeArea(.container, edges: .bottom)
    }
}

/// Hosts the bundled React SPA in a WKWebView. Mirrors the macOS WebView: same
/// two bridge channels, the early-boot error script, and a file:// load of the
/// bundled `web/index.html`. The SPA is identical across platforms.
struct WebView: UIViewRepresentable {
    let bridge: WebViewBridge

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let userContentController = WKUserContentController()

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
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        userContentController.addUserScript(errorScript)

        config.userContentController = userContentController
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.websiteDataStore = WKWebsiteDataStore.nonPersistent()
        config.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isInspectable = true
        webView.scrollView.bounces = false
        bridge.webView = webView

        if let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            let dirURL = htmlURL.deletingLastPathComponent()
            logger.info("Loading \(htmlURL.absoluteString)")
            webView.loadFileURL(htmlURL, allowingReadAccessTo: dirURL)
        } else {
            logger.error("index.html not found in app bundle")
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            logger.info("Page loaded successfully")
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            logger.error("Navigation failed: \(error.localizedDescription)")
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            logger.error("Provisional navigation failed: \(error.localizedDescription)")
        }
    }
}
