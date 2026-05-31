import XCTest

/// Visual/smoke UI tests for the iOS app. The UI is the React SPA in a
/// WKWebView, so these drive it through the web content's accessibility and
/// capture full-screen screenshots (attached to the test result) of the start
/// screen and an opened map (textmap on iPhone, visual map on iPad).
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

        // Give the canvas/textmap a moment to render, then capture it.
        sleep(4)
        snapshot("02-map-opened")
    }
}
