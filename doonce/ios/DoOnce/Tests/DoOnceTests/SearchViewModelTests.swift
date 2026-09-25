import XCTest
import DoOnceCore
@testable import DoOnce

/// Search ranks the way people ask: the best-scoring memory first, a best answer only when a
/// step carries a value, and nothing for an empty query.
@MainActor
final class SearchViewModelTests: XCTestCase {
    private func makeModel(_ query: String = "") -> SearchViewModel {
        SearchViewModel(query: query, memories: SampleData.memories, objects: SampleData.objects, people: SampleData.people, spaces: SampleData.spaces)
    }

    func testEmptyQueryHasNoResults() async {
        let model = makeModel("")
        XCTAssertTrue(model.results.isEmpty)
        XCTAssertNil(model.results.bestAnswer)
    }

    func testPlumberPressureQueryRanksRepressuriseFirstWithABestAnswer() async throws {
        let model = makeModel("what pressure did the plumber say")
        let results = model.results
        XCTAssertEqual(results.memories.first?.id, SampleIDs.repressuriseBoiler)
        let best = try XCTUnwrap(results.bestAnswer)
        XCTAssertEqual(best.memory.id, SampleIDs.repressuriseBoiler)
        XCTAssertEqual(best.value.unit, "bar")
        XCTAssertEqual(best.value.value, 1.5)
        XCTAssertEqual(best.step.order, 4)
    }

    func testObjectNameAloneGivesNoBestAnswer() async {
        // "boiler" hits step 1 of Repressurise, whose details mention "1 bar"; that is not an answer.
        XCTAssertNil(makeModel("boiler").results.bestAnswer)
    }

    func testDadAndBoilerQueryPrefersWhatDadShowedOnTheBoiler() async {
        let results = makeModel("thing dad showed me for boiler").results
        XCTAssertEqual(results.memories.first?.id, SampleIDs.restartBoiler)
        XCTAssertTrue(results.objects.contains { $0.id == SampleIDs.boiler })
    }

    func testSpaceNameInQueryReturnsObjectsInThatSpace() async {
        let results = makeModel("things in the garage").results
        XCTAssertTrue(results.objects.contains { $0.id == SampleIDs.car })
    }

    func testMemoriesAreOrderedByScoreThenRecency() async {
        let results = makeModel("boiler").results
        let boilerMemories = results.memories.filter { $0.objectID == SampleIDs.boiler }
        XCTAssertEqual(boilerMemories.count, 3)
        // Title matches outrank object-name matches; equal scores break on recency.
        XCTAssertEqual(boilerMemories.map(\.id), [SampleIDs.repressuriseBoiler, SampleIDs.restartBoiler, SampleIDs.emergencyShutoff])
    }

    func testQueryChangesResults() async {
        let model = makeModel("router")
        XCTAssertEqual(model.results.memories.first?.id, SampleIDs.resetRouter)
        model.query = "espresso"
        XCTAssertTrue(model.results.memories.allSatisfy { $0.objectID == SampleIDs.espressoMachine })
        XCTAssertFalse(model.results.memories.isEmpty)
    }
}
