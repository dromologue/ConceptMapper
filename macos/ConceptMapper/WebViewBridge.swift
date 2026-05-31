import Foundation
import WebKit
import os.log

private let logger = Logger(subsystem: "com.dromologue.ConceptMapper", category: "Bridge")

/// Bidirectional communication between Swift and the React SPA over a single
/// typed transport (`bridge` JS→Swift handler / `window.__bridge_receive`
/// Swift→JS callback). All messages ride a `BridgeEnvelope` carrying a
/// version field, a kind discriminator, a method, and a typed payload.
@MainActor
class WebViewBridge: NSObject, ObservableObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    /// Platform handler for opening external URLs. Injected by the shell so the
    /// bridge itself stays free of AppKit/UIKit. Defaults to the macOS opener.
    var urlOpener: PlatformURLOpener = AppKitURLOpener()

    // MARK: - JS → Swift

    nonisolated func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        // WebKit always delivers script messages on the main thread, but the
        // protocol requirement is nonisolated. `WKScriptMessage.name`/`.body`
        // are main-actor-isolated, so assert the known isolation to read them.
        MainActor.assumeIsolated {
            // jsLog stays a separate handler for early-boot error reporting
            // before the bridge is established. Everything else rides the
            // bridge channel.
            if message.name == "jsLog" {
                logger.warning("[JS] \("\(message.body)")")
                return
            }
            guard message.name == "bridge" else {
                logger.error("[Bridge] unknown channel: \(message.name)")
                return
            }
            let body = "\(message.body)"
            Task { @MainActor in
                await self.dispatchEnvelope(body: body)
            }
        }
    }

    private func dispatchEnvelope(body: String) async {
        let envelope: BridgeEnvelope
        do {
            envelope = try BridgeEnvelope.decode(from: body)
        } catch let err as BridgeError {
            logger.error("[Bridge] decode failure: \(err.message)")
            sendError(id: nil, method: .jsLog, error: err)
            return
        } catch {
            logger.error("[Bridge] decode failure: \(error.localizedDescription)")
            return
        }

        guard envelope.kind == .request else {
            // We currently only receive requests from JS. Responses/events
            // travel Swift→JS only.
            logger.error("[Bridge] unexpected kind: \(envelope.kind.rawValue)")
            return
        }

        do {
            try await handleRequest(envelope)
        } catch let err as BridgeError {
            sendError(id: envelope.id, method: envelope.method, error: err)
        } catch {
            sendError(id: envelope.id, method: envelope.method,
                      error: .init(code: .internalError, message: error.localizedDescription))
        }
    }

    private func handleRequest(_ env: BridgeEnvelope) async throws {
        switch env.method {
        case .jsLog:
            let p = try env.decodePayload(as: JSLogPayload.self)
            logger.warning("[JS] \(p.message)")

        case .openFile:
            let (content, filename, filePath) = try await FileHandler.openFile()
            sendEvent(method: .fileLoaded, payload: FileLoadedPayload(
                content: content.data(using: .utf8)?.base64EncodedString() ?? "",
                filename: filename,
                filePath: filePath
            ))

        case .exportImage:
            let dataURL = await requestCanvasImage()
            try await FileHandler.saveImageFromDataURL(dataURL)

        case .exportMarkdown:
            let md = await requestGraphMarkdown()
            try await FileHandler.saveFile(content: md, type: "md", title: "Export Markdown")

        case .saveToDownloads:
            let p = try env.decodePayload(as: SaveToDownloadsPayload.self)
            try await FileHandler.saveExport(base64Data: p.data, filename: p.filename)

        case .saveToPath:
            let p = try env.decodePayload(as: SaveToPathPayload.self)
            try await FileHandler.saveToPath(content: p.content, path: p.path)

        case .saveNewTaxonomy:
            let p = try env.decodePayload(as: SaveNewTaxonomyPayload.self)
            let slug = p.title.lowercased()
                .replacingOccurrences(of: "[^a-z0-9]+", with: "_", options: .regularExpression)
                .trimmingCharacters(in: CharacterSet(charactersIn: "_"))
            let savedPath = try await FileHandler.saveNewFile(content: p.content, defaultName: "\(slug).cm")
            sendEvent(method: .taxonomySaved, payload: TaxonomySavedPayload(path: savedPath))

        case .listTemplates:
            FileHandler.copyBundledTemplates()
            let list = try await FileHandler.listTemplates().map { TemplateListItem(name: $0.name, path: $0.path) }
            sendEvent(method: .templatesAvailable, payload: TemplatesAvailablePayload(templates: list))

        case .listMaps:
            let list = try await FileHandler.listMaps().map { MapListItem(name: $0.name, path: $0.path) }
            sendEvent(method: .mapsAvailable, payload: MapsAvailablePayload(maps: list))

        case .loadMap:
            let p = try env.decodePayload(as: LoadMapPayload.self)
            let url = URL(fileURLWithPath: p.path)
            guard let content = try? String(contentsOf: url, encoding: .utf8) else {
                throw BridgeError.io("cannot read map: \(p.path)")
            }
            var templateContent = ""
            if let range = content.range(of: #"<!--\s*template:\s*(.+?)\s*-->"#, options: .regularExpression) {
                let comment = String(content[range])
                let tmplName = comment
                    .replacingOccurrences(of: #"<!--\s*template:\s*"#, with: "", options: .regularExpression)
                    .replacingOccurrences(of: #"\s*-->"#, with: "", options: .regularExpression)
                    .trimmingCharacters(in: .whitespaces)
                let cmtName = tmplName.hasSuffix(".cmt") ? tmplName : "\(tmplName).cmt"
                let bundleURL = Bundle.main.url(forResource: cmtName.replacingOccurrences(of: ".cmt", with: ""),
                                                withExtension: "cmt", subdirectory: "templates")
                let candidate = bundleURL ?? FileHandler.getTemplatesFolder().appendingPathComponent(cmtName)
                if let tmpl = try? String(contentsOf: candidate, encoding: .utf8) {
                    templateContent = tmpl
                }
            }
            sendEvent(method: .mapLoaded, payload: MapLoadedPayload(
                mapContent: content.data(using: .utf8)?.base64EncodedString() ?? "",
                templateContent: templateContent.data(using: .utf8)?.base64EncodedString() ?? "",
                filename: url.lastPathComponent,
                filePath: p.path
            ))

        case .loadTemplate:
            let p = try env.decodePayload(as: LoadTemplatePayload.self)
            let content = try await FileHandler.loadTemplateFile(path: p.path)
            sendEvent(method: .templateAvailable, payload: TemplateAvailablePayload(content: content))

        case .saveTemplate:
            let p = try env.decodePayload(as: SaveTemplatePayload.self)
            let defaultName: String
            if let src = p.sourceTemplate, !src.isEmpty {
                defaultName = src.hasSuffix(".cmt") ? src : "\(src).cmt"
            } else {
                let slug = p.title.lowercased()
                    .replacingOccurrences(of: "[^a-z0-9]+", with: "_", options: .regularExpression)
                    .trimmingCharacters(in: CharacterSet(charactersIn: "_"))
                defaultName = "\(slug).cmt"
            }
            if (p.silent ?? false), p.sourceTemplate != nil {
                try await FileHandler.overwriteTemplateForMap(
                    content: p.content,
                    templateFilename: defaultName,
                    sourceMapPath: p.sourceMapPath
                )
            } else {
                _ = try await FileHandler.saveTemplateFile(content: p.content, defaultName: defaultName)
            }

        case .openURL:
            let p = try env.decodePayload(as: OpenURLPayload.self)
            guard let url = URL(string: p.url) else {
                throw BridgeError.malformedPayload("invalid URL: \(p.url)")
            }
            urlOpener.open(url)

        case .attachNotesFile:
            let p = try env.decodePayload(as: AttachNotesFilePayload.self)
            guard let (path, content) = try await FileHandler.attachMarkdownFile() else {
                return // user cancelled — silent no-op
            }
            sendEvent(method: .notesFileAttached, payload: NotesFileAttachedPayload(
                nodeId: p.nodeId, path: path, content: content
            ))

        case .readNotesFile:
            let p = try env.decodePayload(as: ReadNotesFilePayload.self)
            let url = URL(fileURLWithPath: p.path)
            let content = try? String(contentsOf: url, encoding: .utf8)
            sendEvent(method: .notesFileRead, payload: NotesFileReadPayload(
                nodeId: p.nodeId, path: p.path, content: content ?? "", exists: content != nil
            ))

        case .writeNotesFile:
            let p = try env.decodePayload(as: WriteNotesFilePayload.self)
            try await FileHandler.writeText(content: p.content, toPath: p.path)

        // Event-only methods should never appear as requests
        case .fileLoaded, .mapLoaded, .templatesAvailable, .templateAvailable,
             .mapsAvailable, .taxonomySaved, .showTaxonomyWizard,
             .notesFileAttached, .notesFileRead:
            throw BridgeError.unknownMethod(env.method.rawValue)
        }
    }

    // MARK: - Swift → JS

    /// Send an event envelope. Events are fire-and-forget — no response is
    /// awaited.
    func sendEvent<P: Encodable>(method: BridgeMethod, payload: P) {
        sendEnvelope(kind: .event, id: nil, method: method, payload: payload)
    }

    /// Send a request rejection. Used when a JS request fails on the Swift
    /// side — the JS bridge resolves the pending promise to an error.
    func sendError(id: String?, method: BridgeMethod, error: BridgeError) {
        let envelope: [String: Any] = [
            "version": BridgeProtocolVersion,
            "kind": BridgeKind.error.rawValue,
            "method": method.rawValue,
            "id": id as Any,
            "error": [
                "code": error.code.rawValue,
                "message": error.message
            ]
        ]
        emit(envelope)
    }

    /// Bare event used by ContentView for command-driven flows (menu items).
    func emitShowTaxonomyWizard() {
        sendEnvelope(kind: .event, id: nil, method: .showTaxonomyWizard, payload: EmptyPayload())
    }

    private func sendEnvelope<P: Encodable>(kind: BridgeKind, id: String?, method: BridgeMethod, payload: P) {
        let encoder = JSONEncoder()
        guard let payloadData = try? encoder.encode(payload),
              let payloadAny = try? JSONSerialization.jsonObject(with: payloadData, options: [.fragmentsAllowed]) else {
            logger.error("[Bridge] cannot encode payload for \(method.rawValue)")
            return
        }
        let envelope: [String: Any] = [
            "version": BridgeProtocolVersion,
            "kind": kind.rawValue,
            "method": method.rawValue,
            "id": id as Any,
            (kind == .response ? "result" : "payload"): payloadAny
        ]
        emit(envelope)
    }

    private func emit(_ envelope: [String: Any]) {
        guard let json = try? JSONSerialization.data(withJSONObject: envelope, options: [.fragmentsAllowed]),
              let str = String(data: json, encoding: .utf8) else {
            logger.error("[Bridge] cannot serialise envelope")
            return
        }
        let safeJSON = safeJSString(str)
        webView?.evaluateJavaScript("window.__bridge_receive?.(\(safeJSON));") { _, error in
            if let error = error { logger.error("Bridge emit error: \(error)") }
        }
    }

    private func safeJSString(_ str: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: str, options: .fragmentsAllowed),
              let json = String(data: data, encoding: .utf8) else {
            return "\"\""
        }
        return json
    }

    // MARK: - JS → Swift synchronous getters (used by menu-driven exports)

    /// Request the canvas as a data URL from the React app. JS owns the
    /// canvas so this still uses evaluateJavaScript.
    func requestCanvasImage() async -> String {
        await withCheckedContinuation { (cont: CheckedContinuation<String, Never>) in
            webView?.evaluateJavaScript("window.__bridge_getCanvasImage?.() ?? '';") { result, _ in
                cont.resume(returning: (result as? String) ?? "")
            }
        }
    }

    /// Request the graph as markdown from the React app.
    func requestGraphMarkdown() async -> String {
        await withCheckedContinuation { (cont: CheckedContinuation<String, Never>) in
            webView?.evaluateJavaScript("window.__bridge_getGraphMarkdown?.() ?? '';") { result, _ in
                cont.resume(returning: (result as? String) ?? "")
            }
        }
    }

    // MARK: - Legacy completion-handler shims (transitional — used by ContentView)

    /// Bridge entry from native menu command. Mirrors a JS-initiated openFile.
    func loadFileContent(_ content: String, filename: String, filePath: String? = nil) {
        sendEvent(method: .fileLoaded, payload: FileLoadedPayload(
            content: content.data(using: .utf8)?.base64EncodedString() ?? "",
            filename: filename,
            filePath: filePath
        ))
    }
}
