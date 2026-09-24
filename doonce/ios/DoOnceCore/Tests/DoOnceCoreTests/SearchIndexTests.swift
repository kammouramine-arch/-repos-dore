import XCTest
@testable import DoOnceCore

final class SearchIndexTests: XCTestCase {
    let index = SearchIndex(
        memories: SampleData.memories,
        objects: SampleData.objects,
        people: SampleData.people,
        spaces: SampleData.spaces
    )

    func testThingDadShowedMeForBoilerRanksDadsBoilerMemoryFirst() {
        let hits = index.search("thing dad showed me for boiler")
        XCTAssertEqual(hits.first?.memoryID, SampleIDs.restartBoiler)
        XCTAssertEqual(hits.first?.matchedTokens, ["boiler", "dad"])
        // Boiler-only and Dad-only memories still show up, below.
        let ids = hits.map(\.memoryID)
        XCTAssertTrue(ids.contains(SampleIDs.repressuriseBoiler))
        XCTAssertTrue(ids.contains(SampleIDs.dadsSettings))
    }

    func testWhatPressureDidPlumberSayFindsTheOnePointFiveBarStep() throws {
        let hits = index.search("what pressure did plumber say")
        let top = try XCTUnwrap(hits.first)
        XCTAssertEqual(top.memoryID, SampleIDs.repressuriseBoiler)
        let step = try XCTUnwrap(top.bestStep)
        XCTAssertEqual(step.order, 4)
        XCTAssertTrue(step.instruction.contains("1.5 bar"))
    }

    func testSearchesByObjectSpaceAndTag() {
        XCTAssertEqual(index.search("wifi").first?.memoryID, SampleIDs.resetRouter)
        XCTAssertEqual(index.search("garage").first?.memoryID, SampleIDs.topUpWasherFluid)
        XCTAssertEqual(index.search("nest thermostat").first?.memoryID, SampleIDs.holidayMode)
    }

    func testRecencyBreaksTies() {
        let hits = index.search("coffee")
        XCTAssertGreaterThanOrEqual(hits.count, 5)
        let coffee = hits.map(\.memoryID)
        let byDate = SampleData.memories
            .filter { $0.tags.contains("coffee") }
            .sorted { $0.createdAt > $1.createdAt }
            .map(\.id)
        XCTAssertEqual(coffee, byDate)
    }

    func testStopWordsOnlyOrNoMatchGivesNothing() {
        XCTAssertTrue(index.search("the thing").isEmpty)
        XCTAssertTrue(index.search("helicopter").isEmpty)
    }

    func testLimitIsRespected() {
        XCTAssertEqual(index.search("coffee", limit: 2).count, 2)
    }
}
