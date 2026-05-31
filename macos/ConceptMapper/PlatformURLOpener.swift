import Foundation

/// Opens a URL in the platform's default handler.
///
/// This is the seam that keeps the bridge free of AppKit/UIKit: `WebViewBridge`
/// depends only on this protocol, and each platform shell injects its own
/// implementation (macOS: `NSWorkspace`; iOS: `UIApplication.shared.open`).
/// Part of the future shared BridgeCore — the protocol travels, the
/// implementation stays per-shell.
@MainActor
protocol PlatformURLOpener {
    func open(_ url: URL)
}

#if canImport(AppKit)
import AppKit

/// macOS implementation backed by `NSWorkspace`.
struct AppKitURLOpener: PlatformURLOpener {
    func open(_ url: URL) {
        NSWorkspace.shared.open(url)
    }
}
#endif
