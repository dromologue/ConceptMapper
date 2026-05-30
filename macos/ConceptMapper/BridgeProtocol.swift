import Foundation

/// Typed protocol between the React SPA and the Swift host. Every JS↔Swift
/// message rides a single transport (`bridge` WKScriptMessageHandler /
/// `window.__bridge_receive`) using the `BridgeEnvelope` shape below.
///
/// The protocol is versioned (`BridgeProtocolVersion`); receivers reject
/// mismatches with an `.error` envelope rather than failing silently.
///
/// Requests carry an `id`; responses correlate by the same `id`. Events have
/// no `id` (fire-and-forget). Errors echo the originating `id` where
/// applicable.

enum BridgeKind: String, Codable {
    case request
    case response
    case event
    case error
}

/// Bump this when the wire format changes. JS must agree.
let BridgeProtocolVersion = 1

/// Methods callable from JS → Swift. Adding a method: extend this enum, add a
/// payload struct, handle it in the dispatcher.
enum BridgeMethod: String, Codable {
    case jsLog
    case openFile
    case exportImage
    case exportMarkdown
    case saveToDownloads
    case saveToPath
    case saveNewTaxonomy
    case listTemplates
    case listMaps
    case loadMap
    case loadTemplate
    case saveTemplate
    case openURL
    case attachNotesFile
    case readNotesFile
    case writeNotesFile

    // Swift → JS event methods (only used in outgoing envelopes)
    case fileLoaded
    case mapLoaded
    case templatesAvailable
    case templateAvailable
    case mapsAvailable
    case taxonomySaved
    case showTaxonomyWizard
    case notesFileAttached
    case notesFileRead
}

/// Structured error returned across the bridge instead of a thrown Swift error
/// or a silent failure. JS consumers receive these as rejected promises.
struct BridgeError: Codable, Error {
    enum Code: String, Codable {
        case versionMismatch
        case unknownMethod
        case malformedPayload
        case ioFailure
        case userCancelled
        case internalError
    }
    let code: Code
    let message: String

    static func versionMismatch(_ got: Int) -> BridgeError {
        .init(code: .versionMismatch,
              message: "Bridge protocol version mismatch: expected \(BridgeProtocolVersion), got \(got)")
    }
    static func unknownMethod(_ method: String) -> BridgeError {
        .init(code: .unknownMethod, message: "Unknown method: \(method)")
    }
    static func malformedPayload(_ detail: String) -> BridgeError {
        .init(code: .malformedPayload, message: "Malformed payload: \(detail)")
    }
    static func io(_ detail: String) -> BridgeError {
        .init(code: .ioFailure, message: detail)
    }
}

/// Wire format. `payload`, `result`, and `error` are `Data` blobs holding the
/// raw JSON for the method-specific type; this keeps the envelope itself
/// monomorphic and lets the dispatcher decode against the concrete type.
struct BridgeEnvelope {
    let id: String?
    let version: Int
    let kind: BridgeKind
    let method: BridgeMethod
    let payload: Data?
    let result: Data?
    let error: BridgeError?
}

extension BridgeEnvelope {
    /// Decode an envelope from the raw `body` of a WKScriptMessage. The
    /// payload/result fields are extracted as raw `Data` for downstream
    /// type-specific decoding.
    static func decode(from body: String) throws -> BridgeEnvelope {
        guard let data = body.data(using: .utf8) else {
            throw BridgeError.malformedPayload("not UTF-8")
        }
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw BridgeError.malformedPayload("envelope is not a JSON object")
        }
        guard let version = root["version"] as? Int else {
            throw BridgeError.malformedPayload("missing version")
        }
        if version != BridgeProtocolVersion {
            throw BridgeError.versionMismatch(version)
        }
        guard let kindRaw = root["kind"] as? String,
              let kind = BridgeKind(rawValue: kindRaw) else {
            throw BridgeError.malformedPayload("missing or invalid kind")
        }
        guard let methodRaw = root["method"] as? String,
              let method = BridgeMethod(rawValue: methodRaw) else {
            throw BridgeError.unknownMethod((root["method"] as? String) ?? "<missing>")
        }
        let id = root["id"] as? String

        let payloadData: Data? = try root["payload"].flatMap {
            try JSONSerialization.data(withJSONObject: $0, options: [.fragmentsAllowed])
        }
        let resultData: Data? = try root["result"].flatMap {
            try JSONSerialization.data(withJSONObject: $0, options: [.fragmentsAllowed])
        }
        var error: BridgeError? = nil
        if let errObj = root["error"] as? [String: Any],
           let codeRaw = errObj["code"] as? String,
           let code = BridgeError.Code(rawValue: codeRaw),
           let message = errObj["message"] as? String {
            error = BridgeError(code: code, message: message)
        }
        return BridgeEnvelope(id: id, version: version, kind: kind, method: method,
                              payload: payloadData, result: resultData, error: error)
    }

    /// Decode the payload into a concrete Codable type.
    func decodePayload<T: Decodable>(as type: T.Type) throws -> T {
        guard let payload = payload else {
            throw BridgeError.malformedPayload("missing payload for \(method.rawValue)")
        }
        do {
            return try JSONDecoder().decode(T.self, from: payload)
        } catch {
            throw BridgeError.malformedPayload("payload decode failed: \(error.localizedDescription)")
        }
    }
}

// MARK: - Request payloads (JS → Swift)

struct EmptyPayload: Codable {}

struct SaveToDownloadsPayload: Codable {
    let data: String       // base64-encoded bytes
    let filename: String
}

struct SaveToPathPayload: Codable {
    let path: String
    let content: String
}

struct SaveNewTaxonomyPayload: Codable {
    let content: String
    let title: String
}

struct LoadMapPayload: Codable {
    let path: String
}

struct LoadTemplatePayload: Codable {
    let path: String
}

struct SaveTemplatePayload: Codable {
    let content: String
    let title: String
    let sourceTemplate: String?
    let sourceMapPath: String?
    let silent: Bool?
}

struct OpenURLPayload: Codable {
    let url: String
}

struct AttachNotesFilePayload: Codable {
    let nodeId: String
}

struct ReadNotesFilePayload: Codable {
    let nodeId: String
    let path: String
}

struct WriteNotesFilePayload: Codable {
    let path: String
    let content: String
}

struct JSLogPayload: Codable {
    let message: String
}

// MARK: - Event payloads (Swift → JS)

struct FileLoadedPayload: Codable {
    let content: String       // base64
    let filename: String
    let filePath: String?
}

struct MapLoadedPayload: Codable {
    let mapContent: String      // base64
    let templateContent: String // base64 (empty string if none)
    let filename: String
    let filePath: String
}

struct TemplateListItem: Codable {
    let name: String
    let path: String
}

struct TemplatesAvailablePayload: Codable {
    let templates: [TemplateListItem]
}

struct TemplateAvailablePayload: Codable {
    let content: String  // JSON string of the template
}

struct MapListItem: Codable {
    let name: String
    let path: String
}

struct MapsAvailablePayload: Codable {
    let maps: [MapListItem]
}

struct TaxonomySavedPayload: Codable {
    let path: String
}

struct NotesFileAttachedPayload: Codable {
    let nodeId: String
    let path: String
    let content: String
}

struct NotesFileReadPayload: Codable {
    let nodeId: String
    let path: String
    let content: String
    let exists: Bool
}
