import XCTest

/// Visual/smoke UI tests for the iOS app. The UI is the React SPA in a
/// WKWebView, so these drive it through the web content's accessibility and
/// capture full-screen screenshots (attached to the test result). iPhone and
/// iPad share one iOS layout: a full-screen outline with a bottom tab bar
/// (Map / Explore / Details / Analysis / Notes), REQ-119.
final class ConceptMapperUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    /// Attach a full-screen screenshot kept regardless of pass/fail.
    private func snapshot(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let att = XCTAttachment(screenshot: shot)
        att.name = name
        att.lifetime = .keepAlways
        add(att)
    }

    /// Find a tappable element by visible label across the common types web
    /// content surfaces as.
    private func element(_ app: XCUIApplication, label: String) -> XCUIElement {
        for q in [app.buttons, app.staticTexts, app.links, app.otherElements] {
            let e = q[label]
            if e.exists { return e }
        }
        // Fall back to a contains-match across any descendant.
        return app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS[c] %@", label))
            .firstMatch
    }

    func testLaunchesAndOpensAMap() {
        let app = XCUIApplication()
        app.launch()

        // Start screen should appear (title comes from the SPA).
        XCTAssertTrue(
            app.staticTexts["Concept Mapper"].waitForExistence(timeout: 20),
            "Start screen (SPA) did not load"
        )
        snapshot("01-start-screen")

        // Open a small bundled map.
        let map = element(app, label: "tasks-and-notes")
        XCTAssertTrue(map.waitForExistence(timeout: 10), "Map list item not found")
        map.tap()

        // Give the outline a moment to render, then capture it (iPhone + iPad
        // share the same tabbed shell — see testTabBarSurfaces).
        sleep(4)
        snapshot("02-map-opened")
    }

    /// iOS tabbed shell (REQ-119): open a map, then walk the bottom tab bar.
    /// Each tab swaps the full-screen surface. The tab buttons carry visible
    /// text labels, so they are reliably hittable in the WKWebView (unlike the
    /// icon-only activity-bar buttons). Runs identically on iPhone and iPad.
    func testTabBarSurfaces() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(
            app.staticTexts["Concept Mapper"].waitForExistence(timeout: 20),
            "Start screen (SPA) did not load"
        )
        let map = element(app, label: "tasks-and-notes")
        XCTAssertTrue(map.waitForExistence(timeout: 10), "Map list item not found")
        map.tap()
        sleep(3)

        // The bottom tab bar should be present with all five tabs.
        for label in ["Map", "Explore", "Details", "Analysis", "Notes"] {
            XCTAssertTrue(app.buttons[label].waitForExistence(timeout: 10), "Tab '\(label)' missing")
        }
        snapshot("03-tab-map")

        // Select an outline node so Details/Notes have content.
        let node = app.buttons["Write alert runbooks"]
        if node.waitForExistence(timeout: 5) { node.tap(); sleep(1) }

        app.buttons["Explore"].tap();  sleep(1); snapshot("04-tab-explore")
        app.buttons["Details"].tap();  sleep(1); snapshot("05-tab-details")
        app.buttons["Analysis"].tap(); sleep(1); snapshot("06-tab-analysis")
        app.buttons["Notes"].tap();    sleep(1); snapshot("07-tab-notes")
        app.buttons["Map"].tap();      sleep(1)
    }

    /// True once the system document picker is on screen (Files UI). Its chrome
    /// runs out-of-process, so look across the app and springboard.
    private func documentPickerVisible(_ app: XCUIApplication, timeout: TimeInterval) -> Bool {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let candidates = [
            app.navigationBars.buttons["Cancel"],
            app.buttons["Cancel"],
            springboard.buttons["Cancel"],
            app.otherElements["DOC.itemCollectionView"],
            app.navigationBars["Recents"],
        ]
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if candidates.contains(where: { $0.exists }) { return true }
            usleep(200_000)
        }
        return false
    }

    private func dismissPicker(_ app: XCUIApplication) {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for btn in [app.navigationBars.buttons["Cancel"], app.buttons["Cancel"], springboard.buttons["Cancel"]] {
            if btn.exists { btn.tap(); break }
        }
    }

    /// Session 3 (iOS file features): "Open File…" must present the system
    /// document picker without a sandbox/presentation crash.
    func testOpenFilePresentsDocumentPicker() {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(
            app.staticTexts["Concept Mapper"].waitForExistence(timeout: 20),
            "Start screen (SPA) did not load"
        )
        let openFile = element(app, label: "Open File")
        XCTAssertTrue(openFile.waitForExistence(timeout: 10), "'Open File…' not found")
        openFile.tap()
        XCTAssertTrue(documentPickerVisible(app, timeout: 10), "Document picker did not present")
        snapshot("08-open-file-picker")
        dismissPicker(app)
    }

    // Session 3 — "Attach .md" and "Export image" are also file-feature flows,
    // but both are triggered from *web content* (the outline node's Notes pane,
    // the activity-bar export icon). Driving them requires selecting/clicking
    // elements inside the WKWebView, and XCUITest's synthesized taps do not
    // reliably fire those web handlers — a tap can register as :hover without
    // delivering the click (see reference: phone web UI is verified via the
    // browser, not XCUITest). The native presentation those flows reach is the
    // same `UIDocumentPicker` / `UIActivityViewController` code exercised by
    // testOpenFilePresentsDocumentPicker above (FileHandler.pickDocument /
    // presentShareSheet share one present(...) path). The *web* side of attach
    // and export is verified end-to-end in web/e2e/file-flows.spec.ts
    // (Playwright, production build), which asserts the exact attachNotesFile /
    // saveToDownloads bridge calls. Split by tool, on purpose (REQ-124).
}
