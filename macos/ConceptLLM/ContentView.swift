import SwiftUI
import WebKit
import os.log

private let logger = Logger(subsystem: "com.dromologue.ConceptLLM", category: "WebView")

struct ContentView: View {
    @StateObject private var bridge = WebViewBridge()
    @State private var showHelp = false

    var body: some View {
        ZStack {
            WebView(bridge: bridge)
                .frame(minWidth: 800, minHeight: 600)

            if showHelp {
                HelpOverlay(onClose: { showHelp = false })
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .openFile)) { _ in
            FileHandler.openFile { content, filename, filePath in
                bridge.loadFileContent(content, filename: filename, filePath: filePath)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .saveFile)) { _ in
            bridge.requestGraphMarkdown { md in
                FileHandler.saveFile(content: md, type: "cm", title: "Save Concept Map")
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .exportImage)) { _ in
            bridge.requestCanvasImage { dataURL in
                FileHandler.saveImageFromDataURL(dataURL)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .exportMarkdown)) { _ in
            bridge.requestGraphMarkdown { md in
                FileHandler.saveFile(content: md, type: "cm", title: "Export Concept Map")
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .showHelp)) { _ in
            showHelp.toggle()
        }
        .onReceive(NotificationCenter.default.publisher(for: .newTaxonomy)) { _ in
            bridge.webView?.evaluateJavaScript("window.showTaxonomyWizard?.();") { _, _ in }
        }
    }
}

struct HelpOverlay: View {
    let onClose: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()
                .onTapGesture { onClose() }

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("ConceptLLM Help")
                        .font(.headline)
                    Spacer()
                    Button(action: onClose) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding()

                Divider()

                // Help content
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        helpSection("Getting Started", content: """
                        ConceptLLM visualises intellectual influence networks as interactive concept maps.

                        Open a .cm file (File → Open or Cmd+O) to load a concept map. The .cm format is a structured markdown file describing thinkers, concepts, and their relationships.
                        """)

                        helpSection("Navigation", content: """
                        • Pan: Click and drag empty canvas
                        • Zoom: Scroll wheel or trackpad pinch
                        • Select node: Click on a node
                        • Marquee zoom: Shift+drag to zoom to a region
                        """)

                        helpSection("View Modes", content: """
                        • Full Network: Shows all thinkers and concepts
                        • People: Shows thinkers only — click a thinker to reveal connected concepts
                        • Concepts: Shows concepts only — click a concept to reveal connected thinkers
                        """)

                        helpSection("Editing Nodes", content: """
                        Select a node to open the Detail Panel on the right. All attributes are editable inline:
                        • Name, dates, generation, stream
                        • Eminence (thinkers): dominant, major, secondary, minor
                        • Concept type: framework, principle, distinction, mechanism, prescription, synthesis
                        • Abstraction level: meta-theoretical, theoretical, operational, concrete

                        Click "Edit Notes" to open the Notes pane with an inline markdown editor.
                        """)

                        helpSection("Adding Nodes & Edges", content: """
                        • + Thinker / + Concept: Opens a modal to create a new node
                        • + Edge: Enter edge-drawing mode — click a source node, then a target node, then choose the edge type
                        • Press Esc to cancel edge drawing
                        """)

                        helpSection("Notes Editor", content: """
                        The notes editor supports inline markdown:
                        • # Heading — large styled text
                        • **bold** — bold text
                        • *italic* — italic text
                        • `code` — inline code
                        • - item — list items
                        • > quote — blockquotes

                        Formatting updates live as you type. Notes auto-save.
                        """)

                        helpSection("Themes & Customisation", content: """
                        Click the ⚙ gear icon in the toolbar to open Settings:
                        • Theme: Choose from 6 themes (Midnight, Obsidian, Solarized Dark, Nord, Ivory, Paper)
                        • Stream Colors: Customise the colour for each intellectual stream
                        • Edge Colors: Customise colours by edge type (rivalry, chain, etc.)

                        All customisations persist across sessions.
                        """)

                        helpSection("Legend & Filtering", content: """
                        The legend bar at the bottom shows intellectual streams:
                        • Click a stream to filter — only that stream's nodes are shown
                        • Click additional streams to show multiple
                        • Click "Show All" to reset
                        """)

                        helpSection("Search", content: """
                        Use the search field in the header to find nodes by name. Click a result to select and centre on that node.
                        """)

                        helpSection("File Format (.cm)", content: """
                        ConceptLLM uses .cm files — structured markdown with fenced code blocks defining nodes and edges.

                        Key sections:
                        • Generations table: time periods
                        • Streams table: intellectual traditions with colours
                        • Thinker Nodes: fenced blocks with id, name, eminence, etc.
                        • Concept Nodes: fenced blocks with originator, type, etc.
                        • Edges: fenced blocks with from, to, type

                        Changes auto-save back to the source .cm file.
                        """)

                        helpSection("Keyboard Shortcuts", content: """
                        • Cmd+O: Open file
                        • Cmd+S: Save As
                        • Cmd+E: Export image
                        • Cmd+Shift+E: Export concept map
                        • Cmd+?: Toggle this help
                        • Esc: Cancel edge drawing
                        """)

                        helpSection("Node Indicators", content: """
                        • Yellow/orange dot near a node: This node has notes attached
                        • Dashed circle (thinker): Placeholder thinker (referenced but not fully defined)
                        • Dashed rectangle (concept): Contested concept status
                        • White outline: Selected or hovered node
                        • Green outline: Edge source during edge drawing
                        """)
                    }
                    .padding()
                }
            }
            .frame(width: 560, height: 600)
            .background(.ultraThickMaterial)
            .cornerRadius(12)
            .shadow(radius: 20)
        }
    }

    private func helpSection(_ title: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
            Text(content)
                .font(.system(size: 12))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
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
        for handler in ["openFile", "exportImage", "exportMarkdown", "saveToPath", "saveToDownloads", "saveNewTaxonomy", "listTemplates", "listMaps", "loadMap", "loadTemplate", "saveTemplate", "openURL", "jsLog"] {
            userContentController.add(bridge, name: handler)
        }

        // Inject JS error catcher that reports to Swift
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

            // Inject MCP status for the status bar
            let mcpConfigured = MCPSetup.detectedClients.contains { MCPSetup.isConfigured(for: $0) }
            webView.evaluateJavaScript("window.__MCP_CONFIGURED__ = \(mcpConfigured)") { _, _ in }

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
