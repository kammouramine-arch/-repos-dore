import XCTest
@testable import DoOnceCore

final class LocalizationTests: XCTestCase {
    func testBundledStringsLoad() throws {
        let strings = try Localization.bundled()
        XCTAssertEqual(strings.string("app.tagline"), "Show it once.")
        XCTAssertEqual(strings.availableLanguages, ["en", "fr"])
    }

    func testPlaceholders() throws {
        let strings = try Localization.bundled()
        XCTAssertEqual(strings.string("look.found", ["object": "boiler"]), "Found your boiler.")
        XCTAssertEqual(strings.string("memory.continue.progress", ["done": "2", "total": "7"]), "2 of 7 steps done")
        XCTAssertEqual(strings.string("do.taughtBy", ["person": "Julien", "date": "18 March"]), "Julien showed you this · 18 March")
    }

    func testPlurals() throws {
        let strings = try Localization.bundled()
        XCTAssertEqual(strings.plural("memory.count", count: 0), "Nothing remembered yet.")
        XCTAssertEqual(strings.plural("memory.count", count: 1), "1 thing")
        XCTAssertEqual(strings.plural("memory.count", count: 12), "12 things")
        XCTAssertEqual(strings.plural("object.procedures", count: 0), "0 memories", "no zero form falls through to other")
        XCTAssertEqual(strings.plural("household.members", count: 1), "1 member")
    }

    func testFrenchFallsBackToEnglish() throws {
        let french = try Localization.bundled(language: "fr")
        XCTAssertEqual(french.string("center.look"), "Regarder")
        XCTAssertEqual(french.string("do.seeOriginal"), "See original")
    }

    func testListsAndMissingKeys() throws {
        let strings = try Localization.bundled()
        XCTAssertEqual(strings.list("firstRun.examples").first, "Coffee machine")
        XCTAssertEqual(strings.string("no.such.key"), "no.such.key")
    }

    func testRejectsMalformedData() {
        XCTAssertThrowsError(try Localization(data: Data("[1,2]".utf8)))
    }
}
