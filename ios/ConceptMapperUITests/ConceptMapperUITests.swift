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
}
