import XCTest

/// Walks the native app's main surfaces and attaches a screenshot of each (`keepAlways`), so CI can
/// export them from the result bundle for visual review. Runs in demo configuration with sample
/// content; the simulator has no camera, so Look and Teach show their real "camera unavailable"
/// states. Navigation is best-effort: a surface that cannot be reached is recorded as a failure
/// but the walk continues so the remaining screens are still captured.
final class ScreenshotUITests: XCTestCase {
    private var app: XCUIApplication!
    private var prefix: String { (ProcessInfo.processInfo.environment["DOONCE_APPEARANCE"] ?? "light") + "-" }

    override func setUpWithError() throws {
        continueAfterFailure = true
        app = XCUIApplication()
        app.launchEnvironment["DOONCE_SAMPLE_CONTENT"] = "1"
    }

    private func shoot(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = prefix + name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func tapIfExists(_ element: XCUIElement, timeout: TimeInterval = 3, _ what: String) -> Bool {
        guard element.waitForExistence(timeout: timeout) else {
            shoot("missing-" + what.lowercased().replacingOccurrences(of: " ", with: "-"))
            XCTFail("Missing: \(what)")
            return false
        }
        element.tap()
        return true
    }

    private func button(labelled text: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", text)).firstMatch
    }

    private func settle(_ seconds: TimeInterval = 0.8) { Thread.sleep(forTimeInterval: seconds) }

    // MARK: Launch and onboarding (fresh install)

    func test01LaunchAndOnboarding() {
        app.launchArguments += ["-onboarded", "0", "-firstMemorySaved", "0", "-launchCount", "0"]
        app.launch()
        settle(1.0)
        shoot("01-launch")
        let next = app.buttons["Continue"]
        XCTAssertTrue(next.waitForExistence(timeout: 12), "Onboarding shows after the launch animation")
        shoot("02-onboarding-1")
        for i in 2...4 where next.exists {
            next.tap(); settle()
            shoot("0\(i + 1)-onboarding-\(i)")
        }
        settle(1.0)
        shoot("06-after-onboarding")
    }

    // MARK: The shell: Memory, centre action, Look, Teach

    func test02MemoryAndCentreAction() {
        launchIntoShell()
        shoot("10-memory")
        app.swipeUp(); settle()
        shoot("11-memory-scrolled")
        app.swipeDown(); settle()

        if tapIfExists(app.buttons["center.action"], "centre action button") {
            settle()
            shoot("12-centre-bloom")
            if tapIfExists(app.buttons["center.look"], "Look in the bloom") {
                settle(2.0)
                shoot("13-look")
                dismissCameraSurface()
            }
            // The bloom may still be open after the camera surface goes away.
            if app.buttons["center.teach"].waitForExistence(timeout: 2) || tapIfExists(app.buttons["center.action"], timeout: 5, "centre action button again") {
                settle()
                if tapIfExists(app.buttons["center.teach"], timeout: 5, "Teach in the bloom") {
                    settle(2.0)
                    shoot("14-teach")
                    dismissCameraSurface()
                }
            }
        }
    }

    // MARK: Object passport and procedure

    func test03ObjectAndProcedure() {
        launchIntoShell()
        if tapIfExists(button(labelled: "Boiler"), timeout: 8, "Boiler object card") {
            settle()
            shoot("20-object")
            if tapIfExists(app.buttons["memory.row"].firstMatch, "a memory row on the object") {
                settle()
                shoot("21-procedure")
            }
        }
    }

    // MARK: Do mode, Ask, completion

    func test04DoModeToCompletion() {
        launchIntoShell()
        // The Continue card exists only while a memory is in progress; the golden-path test may have
        // finished it (progress is persisted), so fall back to opening a procedure and starting it.
        let card = app.buttons["memory.continue"]
        if card.waitForExistence(timeout: 6) {
            card.tap()
        } else {
            guard tapIfExists(button(labelled: "Boiler"), timeout: 5, "Boiler object card"),
                  tapIfExists(app.buttons["memory.row"].firstMatch, timeout: 5, "a memory row"),
                  tapIfExists(app.buttons["procedure.start"], timeout: 5, "Start on the procedure") else { return }
        }
        let done = app.buttons["do.done"]
        XCTAssertTrue(done.waitForExistence(timeout: 6), "Do mode opens")
        settle()
        shoot("30-do")
        if tapIfExists(app.buttons["do.ask"], "Ask") {
            settle()
            shoot("31-ask")
            let input = app.textFields["ask.input"]
            if input.waitForExistence(timeout: 2) {
                input.tap(); input.typeText("what pressure did he say")
                let returnKey = app.keyboards.buttons["return"].firstMatch
                if returnKey.exists { returnKey.tap() } else { app.typeText("\n") }
                _ = app.staticTexts["ask.answer"].waitForExistence(timeout: 4)
                settle()
                shoot("32-ask-answer")
            }
            app.swipeDown(); settle()
            if app.buttons["Close"].exists { app.buttons["Close"].firstMatch.tap(); settle() }
        }
        let title = app.staticTexts["complete.title"]
        var taps = 0
        while !title.exists, taps < 12, done.exists { done.tap(); taps += 1; _ = title.waitForExistence(timeout: 0.6) }
        if title.waitForExistence(timeout: 5) {
            settle()
            shoot("33-completion")
        } else {
            XCTFail("Completion screen not reached")
        }
    }

    // MARK: You, paywall, settings, services

    func test05YouPaywallSettings() {
        launchIntoShell()
        guard tapIfExists(app.buttons["tab.you"], timeout: 8, "You tab") else { return }
        settle()
        shoot("40-you")
        if tapIfExists(button(labelled: "DoOnce+"), "DoOnce+ row") {
            settle(1.2)
            shoot("41-paywall")
            if app.buttons["Not now"].exists { app.buttons["Not now"].firstMatch.tap() } else { app.swipeDown() }
            settle()
        }
        if tapIfExists(button(labelled: "Settings"), "Settings row") {
            settle()
            shoot("42-settings")
            if tapIfExists(button(labelled: "Services"), "Services row") {
                settle()
                shoot("43-services")
                if app.buttons["Back"].exists { app.buttons["Back"].firstMatch.tap(); settle() }
            }
            if tapIfExists(button(labelled: "Privacy"), "Privacy row") {
                settle()
                shoot("44-privacy")
            }
        }
    }

    // MARK: Search

    func test06Search() {
        launchIntoShell()
        let search = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'search' OR label CONTAINS[c] 'Ask'")).firstMatch
        if tapIfExists(search, timeout: 8, "Search field on Memory") {
            settle()
            let field = app.textFields.firstMatch
            if field.waitForExistence(timeout: 3) { field.tap(); field.typeText("pressure"); settle(1.0) }
            shoot("50-search")
        }
    }

    // MARK: Helpers

    private func launchIntoShell() {
        app.launchArguments += ["-onboarded", "1", "-firstMemorySaved", "1", "-launchCount", "1"]
        app.launch()
        XCTAssertTrue(app.buttons["tab.you"].waitForExistence(timeout: 15), "The shell appears after launch")
        settle()
    }

    private func dismissCameraSurface() {
        if app.buttons["Allow"].firstMatch.exists { shoot("permission-education") }
        for label in ["Close", "Not now", "Cancel"] where app.buttons[label].firstMatch.exists {
            app.buttons[label].firstMatch.tap(); settle(); return
        }
        app.swipeDown(); settle()
    }
}
