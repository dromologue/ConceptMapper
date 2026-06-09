import SwiftUI

@main
struct ConceptMapperApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Hydrate bundled example maps/templates into the Documents container on
        // first run, so the start screen has content without a file picker.
        Task { @MainActor in
            FileHandler.copyBundledTemplates()
            FileHandler.copyBundledMaps()
        }
        return true
    }
}
