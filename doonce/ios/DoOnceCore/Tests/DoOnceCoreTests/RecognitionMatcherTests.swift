import XCTest
@testable import DoOnceCore

final class RecognitionMatcherTests: XCTestCase {
    let matcher = RecognitionMatcher(exactThreshold: 0.85, categoryThreshold: 0.6)

    private func object(_ name: String, _ values: [Float]) -> PhysicalObject {
        PhysicalObject(householdID: SampleIDs.household, name: name, category: name, visualEmbeddings: [Embedding(values)])
    }

    func testExactMatchAboveThreshold() {
        let boiler = object("Boiler", [1, 0, 0])
        let result = matcher.match(Embedding([0.98, 0.2, 0]), against: [boiler])
        XCTAssertEqual(result.level, .exact)
        XCTAssertEqual(result.best?.objectID, boiler.id)
        XCTAssertEqual(result.suggestedCategory, "Boiler")
    }

    func testCategoryMatchBetweenThresholds() {
        let boiler = object("Boiler", [1, 0, 0])
        let result = matcher.match(Embedding([0.7, 0.714, 0]), against: [boiler])
        XCTAssertEqual(result.level, .category)
        XCTAssertEqual(result.suggestedCategory, "Boiler")
        XCTAssertEqual(result.candidates.count, 1)
    }

    func testUnknownBelowThreshold() {
        let boiler = object("Boiler", [1, 0, 0])
        let result = matcher.match(Embedding([0, 1, 0]), against: [boiler])
        XCTAssertEqual(result.level, .unknown)
        XCTAssertTrue(result.candidates.isEmpty)
        XCTAssertNil(result.suggestedCategory)
    }

    func testCandidatesAreSortedAndCapped() {
        let objects = [object("A", [1, 0, 0]), object("B", [0.9, 0.436, 0]), object("C", [0.8, 0.6, 0]), object("D", [0.7, 0.714, 0])]
        let result = matcher.match(Embedding([1, 0, 0]), against: objects)
        XCTAssertEqual(result.level, .exact)
        XCTAssertEqual(result.candidates.map(\.name), ["A", "B", "C"])
        XCTAssertEqual(result.candidates.map(\.confidence), result.candidates.map(\.confidence).sorted(by: >))
    }

    func testUsesBestOfSeveralReferenceImages() {
        var boiler = object("Boiler", [1, 0, 0])
        boiler.visualEmbeddings.append(Embedding([0, 0, 1]))
        XCTAssertEqual(matcher.match(Embedding([0, 0.1, 0.99]), against: [boiler]).level, .exact)
    }

    func testSampleEmbeddingsSeparateHouseholdObjects() {
        for target in SampleData.objects {
            let seen = SampleEmbeddings.camera(near: target.visualEmbeddings[0], noise: 0.1)
            let result = matcher.match(seen, against: SampleData.objects)
            XCTAssertEqual(result.level, .exact, target.name)
            XCTAssertEqual(result.best?.objectID, target.id, target.name)
        }
        let noise = SampleEmbeddings.unit(seed: 4242)
        XCTAssertEqual(matcher.match(noise, against: SampleData.objects).level, .unknown)
    }

    func testMockRecognitionServiceRecognisesByImageName() async throws {
        let service = MockObjectRecognitionService()
        let image = MediaRef(kind: .image, localURL: URL(string: "file:///tmp/boiler-front.jpg")!)
        let result = try await service.recognise(image, among: SampleData.objects)
        XCTAssertEqual(result.level, .exact)
        XCTAssertEqual(result.best?.objectID, SampleIDs.boiler)

        let stranger = MediaRef(kind: .image, localURL: URL(string: "file:///tmp/IMG_0042.jpg")!)
        let strangerResult = try await service.recognise(stranger, among: SampleData.objects)
        XCTAssertEqual(strangerResult.level, .unknown)
    }
}
