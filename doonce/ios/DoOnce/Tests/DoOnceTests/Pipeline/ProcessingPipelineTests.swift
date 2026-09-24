import DoOnceCore
import XCTest
@testable import DoOnce

/// The pipeline with mocks: stages arrive in order, every step keeps provenance, and the user's
/// "Remember this" markers become observed moments.
final class ProcessingPipelineTests: XCTestCase {
    private struct StubFrames: KeyFrameExtracting {
        func keyFrame(of recording: Recording, at seconds: TimeInterval) async throws -> MediaRef {
            MediaRef(kind: .image, localURL: URL(fileURLWithPath: "/tmp/frames/\(recording.id.uuidString)/\(Int(seconds)).jpg"), sourceOffset: seconds)
        }
    }

    private func makePipeline(store: InMemoryRecordingStore, analytics: InMemoryAnalytics) -> ProcessingPipeline {
        ProcessingPipeline(
            transcription: MockTranscriptionService(),
            generation: MockProcedureGenerationService(),
            recognition: MockObjectRecognitionService(),
            recordings: store,
            analytics: analytics,
            frames: StubFrames()
        )
    }

    private func makeRecording(markers: [TimeInterval] = []) -> Recording {
        Recording(householdID: SampleIDs.household, localURL: URL(fileURLWithPath: "/tmp/test.mov"), byteCount: 1, duration: 118, userMarkers: markers)
    }

    private var context: GenerationContext { GenerationContext(householdID: SampleIDs.household, creatorID: SampleIDs.amine) }

    func testStagesArriveInOrder() async throws {
        let store = InMemoryRecordingStore()
        let analytics = InMemoryAnalytics()
        let recording = makeRecording()
        try await store.save(recording)

        var order: [String] = []
        for try await stage in makePipeline(store: store, analytics: analytics).run(recording: recording, context: context, objects: SampleData.objects) {
            let name: String
            switch stage {
            case .listening: name = "listening"
            case .findingSteps: name = "steps"
            case .matchingObject: name = "object"
            case .creatingGuide: name = "guide"
            case .done: name = "done"
            }
            if order.last != name { order.append(name) }
        }
        XCTAssertEqual(order, ["listening", "steps", "object", "guide", "done"])
        let events = await analytics.events
        XCTAssertTrue(events.contains { if case .processingLatency = $0 { return true } else { return false } })
    }

    func testEveryStepHasProvenanceAndSource() async throws {
        let store = InMemoryRecordingStore()
        let recording = makeRecording()
        try await store.save(recording)
        var memory: Memory?
        for try await stage in makePipeline(store: store, analytics: InMemoryAnalytics()).run(recording: recording, context: context, objects: []) {
            if case .done(let m) = stage { memory = m }
        }
        let steps = try XCTUnwrap(memory).steps
        XCTAssertFalse(steps.isEmpty)
        for step in steps {
            XCTAssertTrue(Provenance.allCases.contains(step.provenance))
            XCTAssertNotNil(step.sourceRange, "a step must point back into the recording")
            XCTAssertNotNil(step.keyFrame, "a frame is extracted one second into each step")
        }
        XCTAssertEqual(steps.map(\.order), Array(1...steps.count))
    }

    func testUserMarkersBecomeObservedMoments() async throws {
        let store = InMemoryRecordingStore()
        let recording = makeRecording(markers: [35, 58])
        try await store.save(recording)
        var moments: [DetectedMoment] = []
        for try await stage in makePipeline(store: store, analytics: InMemoryAnalytics()).run(recording: recording, context: context, objects: []) {
            if case .findingSteps(let found) = stage { moments = found }
        }
        let marked = moments.filter { $0.kind == .userMarked }
        XCTAssertEqual(marked.map(\.time), [35, 58])
        XCTAssertTrue(marked.allSatisfy(\.isObserved))
        let saved = try await store.recording(id: recording.id)
        XCTAssertEqual(saved?.analysis?.moments.filter { $0.kind == .userMarked }.count, 2)
    }

    func testMomentDetectorFindsPauseAfterInstruction() {
        let transcript = Transcript(segments: [
            TranscriptSegment(start: 0, end: 3, text: "Open the black valve fully."),
            TranscriptSegment(start: 5, end: 8, text: "Now turn the blue one slowly."),
        ])
        let moments = MomentDetector().moments(in: transcript, markers: [], duration: 10)
        XCTAssertTrue(moments.contains { $0.time == 5 && $0.kind == .speechCue })
        XCTAssertTrue(moments.allSatisfy { !$0.isObserved })
    }
}
