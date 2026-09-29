import XCTest
@testable import DoOnceCore

final class ExampleContentTests: XCTestCase {
    func testSampleContentIsAllExamples() {
        XCTAssertTrue(SampleData.snapshot.memories.allSatisfy(SampleData.isExample))
        XCTAssertTrue(SampleData.snapshot.objects.allSatisfy(SampleData.isExample))
        XCTAssertFalse(SampleData.snapshot.hasRealMemories())
    }

    func testExamplesStayVisibleUntilSomethingRealExists() {
        let snapshot = SampleData.snapshot
        XCTAssertEqual(snapshot.hidingExamplesOnceReal().memories.count, snapshot.memories.count)
    }

    func testADraftDoesNotHideExamples() {
        var snapshot = SampleData.snapshot
        snapshot.memories.append(real(tags: ["draft"]))
        XCTAssertFalse(snapshot.hasRealMemories())
        XCTAssertEqual(snapshot.hidingExamplesOnceReal().memories.count, snapshot.memories.count)
    }

    func testTheFirstRealMemoryHidesExamplesAndWhatOnlyTheyUsed() {
        var snapshot = SampleData.snapshot
        let mine = real()
        snapshot.memories.append(mine)
        let visible = snapshot.hidingExamplesOnceReal()
        XCTAssertEqual(visible.memories.map(\.id), [mine.id])
        XCTAssertTrue(visible.objects.isEmpty)
        XCTAssertTrue(visible.people.allSatisfy { !SampleData.examplePersonIDs.contains($0.id) })
        XCTAssertTrue(visible.progress.isEmpty, "The example's Continue card must go too")
    }

    func testAnExampleObjectTheUserReusedStays() {
        var snapshot = SampleData.snapshot
        let object = SampleData.objects[0]
        snapshot.memories.append(real(objectID: object.id))
        let visible = snapshot.hidingExamplesOnceReal()
        XCTAssertEqual(visible.objects.map(\.id), [object.id])
    }

    private func real(tags: [String] = [], objectID: UUID? = nil) -> Memory {
        Memory(householdID: SampleIDs.household, title: "Fold the stroller", objectID: objectID, creatorID: SampleIDs.amine, tags: tags)
    }
}
