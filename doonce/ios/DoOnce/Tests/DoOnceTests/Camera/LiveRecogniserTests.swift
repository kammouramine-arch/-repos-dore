import CoreVideo
import DoOnceCore
import XCTest
@testable import DoOnce

/// The consistency rule: two agreeing samples lock, one does not; silence becomes unknown.
@MainActor
final class LiveRecogniserTests: XCTestCase {
    /// Returns queued embeddings in order, ignoring the frame.
    private final class FakeSource: FrameEmbeddingSource, @unchecked Sendable {
        var queue: [Embedding]
        init(_ queue: [Embedding]) { self.queue = queue }
        func embedding(for frame: CVPixelBuffer) throws -> Embedding { queue.isEmpty ? SampleEmbeddings.camera(near: SampleEmbeddings.car, noise: 1, seed: 999) : queue.removeFirst() }
        func salientRegion(in frame: CVPixelBuffer) throws -> CGRect? { CGRect(x: 0.2, y: 0.2, width: 0.5, height: 0.5) }
    }

    private func makeRecogniser(_ source: FakeSource) -> LiveRecogniser {
        LiveRecogniser(source: source, objects: SampleData.objects, sampleInterval: 0, requiredHits: 2, unknownAfter: 2.5)
    }

    private func boilerFrame(noise: Double = 0.02, seed: Int = 7) -> Embedding {
        SampleEmbeddings.camera(near: SampleEmbeddings.boilerFront, noise: noise, seed: seed)
    }

    func testOneHitDoesNotLock() {
        let recogniser = makeRecogniser(FakeSource([]))
        recogniser.ingest(boilerFrame(), region: nil, at: 0)
        XCTAssertEqual(recogniser.output, .searching)
    }

    func testTwoConsistentHitsLock() {
        let recogniser = makeRecogniser(FakeSource([]))
        recogniser.ingest(boilerFrame(seed: 7), region: CGRect(x: 0.1, y: 0.1, width: 0.5, height: 0.5), at: 0)
        recogniser.ingest(boilerFrame(seed: 8), region: CGRect(x: 0.1, y: 0.1, width: 0.5, height: 0.5), at: 0.35)
        guard case .exact(let sighting) = recogniser.output else { return XCTFail("expected an exact lock, got \(recogniser.output)") }
        XCTAssertEqual(sighting.result.best?.objectID, SampleIDs.boiler)
        XCTAssertEqual(recogniser.recentRegions[SampleIDs.boiler]?.minX, 0.1)
    }

    func testAlternatingObjectsDoNotLock() {
        let recogniser = makeRecogniser(FakeSource([]))
        recogniser.ingest(boilerFrame(), region: nil, at: 0)
        recogniser.ingest(SampleEmbeddings.camera(near: SampleEmbeddings.router, noise: 0.02), region: nil, at: 0.35)
        XCTAssertEqual(recogniser.output, .searching)
        recogniser.ingest(boilerFrame(), region: nil, at: 0.7)
        XCTAssertEqual(recogniser.output, .searching)
        recogniser.ingest(boilerFrame(seed: 9), region: nil, at: 1.05)
        if case .exact = recogniser.output {} else { XCTFail("two consecutive boiler hits should lock") }
    }

    func testNoiseBecomesUnknownAfterTimeout() {
        let recogniser = makeRecogniser(FakeSource([]))
        for i in 0..<8 {
            recogniser.ingest(SampleEmbeddings.camera(near: SampleEmbeddings.car, noise: 1, seed: 500 + i), region: nil, at: Double(i) * 0.4)
        }
        XCTAssertEqual(recogniser.output, .unknown)
    }

    func testMediumConfidenceBecomesCategoryAfterTimeout() {
        let recogniser = makeRecogniser(FakeSource([]))
        for i in 0..<8 {
            recogniser.ingest(boilerFrame(noise: 0.45, seed: 100 + i), region: nil, at: Double(i) * 0.4)
        }
        switch recogniser.output {
        case .category(let sighting): XCTAssertEqual(sighting.result.suggestedCategory, "Boiler")
        case .exact: break // a lucky pair above the exact threshold is also acceptable
        default: XCTFail("expected category or exact, got \(recogniser.output)")
        }
    }

    func testSubmitThrottlesAndUsesSource() async throws {
        let source = FakeSource([boilerFrame(seed: 1), boilerFrame(seed: 2)])
        let recogniser = LiveRecogniser(source: source, objects: SampleData.objects, sampleInterval: 0, requiredHits: 2, unknownAfter: 2.5)
        var buffer: CVPixelBuffer?
        CVPixelBufferCreate(nil, 4, 4, kCVPixelFormatType_32BGRA, nil, &buffer)
        let frame = try XCTUnwrap(buffer)
        recogniser.submit(pixelBuffer: frame)
        recogniser.submit(pixelBuffer: frame)
        try await Task.sleep(for: .milliseconds(100))
        if case .exact = recogniser.output {} else { XCTFail("two submitted boiler frames should lock, got \(recogniser.output)") }
    }
}
