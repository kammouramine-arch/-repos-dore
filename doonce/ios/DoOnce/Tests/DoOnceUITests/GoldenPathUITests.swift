import XCTest

/// The golden path: open the app with sample content, continue the memory in progress, tap Done through
/// every step, land on "Done." Skeleton: identifiers on the Do surfaces are stable (`do.done`,
/// `do.counter`, `complete.title`); the Memory screen's Continue card is found by its label until the
/// Memory feature exposes an identifier.
final class GoldenPathUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        // `-key value` pairs land in UserDefaults (NSArgumentDomain): skip onboarding and first run.
        app.launchArguments += ["-DOONCE_SAMPLE_CONTENT", "1", "-uiTesting", "1", "-onboarded", "1", "-firstMemorySaved", "1"]
        app.launchEnvironment["DOONCE_SAMPLE_CONTENT"] = "1"
        app.launch()
    }

    func testMemoryContinueDoneToCompletion() throws {
        let identified = app.buttons["memory.continue"]
        let byLabel = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'Continue'")).firstMatch
        let continueCard = identified.waitForExistence(timeout: 8) ? identified : byLabel
        XCTAssertTrue(continueCard.waitForExistence(timeout: 8), "The Memory screen shows a Continue card in sample mode")
        continueCard.tap()

        let done = app.buttons["do.done"]
        XCTAssertTrue(done.waitForExistence(timeout: 5), "Do mode opens with Done reachable")
        XCTAssertTrue(app.staticTexts["do.counter"].exists)

        let title = app.staticTexts["complete.title"]
        var taps = 0
        while !title.exists, taps < 12 {
            done.tap()
            taps += 1
            _ = title.waitForExistence(timeout: 0.6)
        }
        XCTAssertTrue(title.waitForExistence(timeout: 5), "Tapping Done through every step lands on the completion screen")

        let home = app.buttons["complete.done"]
        XCTAssertTrue(home.waitForExistence(timeout: 3))
        home.tap()
    }
}
