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

    /// Changed with the multi-reference scoring: a second reference view that contradicts the match
    /// now costs confidence (0.6 × best + 0.4 × mean), so a boiler taught from two unrelated angles is
    /// asked about ("Is this your boiler?") rather than asserted. Two agreeing views stay exact.
    func testUsesBestOfSeveralReferenceImages() {
        var boiler = object("Boiler", [1, 0, 0])
        boiler.visualEmbeddings.append(Embedding([0, 0, 1]))
        let contradicted = matcher.match(Embedding([0, 0.1, 0.99]), against: [boiler])
        XCTAssertEqual(contradicted.level, .category)
        XCTAssertEqual(contradicted.best?.objectID, boiler.id)

        boiler.visualEmbeddings = [Embedding([0, 0, 1]), Embedding([0, 0.3, 0.954])]
        XCTAssertEqual(matcher.match(Embedding([0, 0.1, 0.99]), against: [boiler]).level, .exact)
    }

    func testObjectTaughtFromSeveralAnglesBeatsSinglePhotoOnRotatedQuery() {
        var multi = object("Boiler", [1, 0, 0])
        multi.visualEmbeddings += [Embedding([0.8, 0.6, 0]), Embedding([0.6, 0.8, 0])]
        let single = object("Heater", [1, 0, 0])
        let rotated = Embedding([0.75, 0.66, 0])
        let result = matcher.match(rotated, against: [single, multi])
        XCTAssertEqual(result.level, .exact)
        XCTAssertEqual(result.best?.objectID, multi.id)
        XCTAssertGreaterThan(matcher.score(multi, query: rotated), matcher.score(single, query: rotated) + 0.1)
    }

    func testLookAlikeObjectsWithoutMarginAreCategoryNotExact() {
        let left = object("Left radiator", [1, 0, 0])
        let right = object("Right radiator", [0.99, 0.141, 0])
        let result = matcher.match(Embedding([0.999, 0.045, 0]), against: [left, right])
        XCTAssertEqual(result.level, .category, "both score above exact but within the margin")
        XCTAssertEqual(result.candidates.count, 2)
        XCTAssertEqual(result.candidates.map(\.confidence), result.candidates.map(\.confidence).sorted(by: >))

        let lenient = RecognitionMatcher(minMargin: 0)
        XCTAssertEqual(lenient.match(Embedding([0.999, 0.045, 0]), against: [left, right]).level, .exact)
    }

    func testMultiFrameVotingStabilisesAnAmbiguousFrame() {
        let boiler = object("Boiler", [1, 0, 0])
        let heater = object("Heater", [0, 1, 0])
        let ambiguous = Embedding([0.72, 0.69, 0])
        let clear = Embedding([0.98, 0.2, 0])
        XCTAssertEqual(matcher.match(ambiguous, against: [boiler, heater]).level, .category)

        let voted = matcher.match([ambiguous, clear, clear, clear], against: [boiler, heater])
        XCTAssertEqual(voted.level, .exact)
        XCTAssertEqual(voted.best?.objectID, boiler.id)
        XCTAssertEqual(matcher.match([], against: [boiler, heater]).level, .unknown)
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
