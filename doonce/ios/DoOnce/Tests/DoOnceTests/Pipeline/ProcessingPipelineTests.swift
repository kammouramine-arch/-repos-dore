import DoOnceCore
import XCTest
@testable import DoOnce

/// The pipeline with mocks: stages arrive in order, every step keeps provenance, the user's
/// "Remember this" markers become observed moments, a failed transcription fails the job (never a
/// stand-in), and a second run resumes from the saved checkpoint.
final class ProcessingPipelineTests: XCTestCase {
    private struct StubFrames: KeyFrameExtracting {
        func keyFrame(of recording: Recording, at seconds: TimeInterval) async throws -> MediaRef {
            MediaRef(kind: .image, localURL: URL(fileURLWithPath: "/tmp/frames/\(recording.id.uuidString)/\(Int(seconds)).jpg"), sourceOffset: seconds)
        }
    }

    private struct StubClips: StepClipExporting {
        func clip(of recording: Recording, stepOrder: Int, range: ClosedRange<TimeInterval>) async throws -> MediaRef {
            MediaRef(kind: .video, localURL: URL(fileURLWithPath: "/tmp/clips/\(recording.id.uuidString)/\(stepOrder).mp4"), sourceOffset: range.lowerBound, duration: range.upperBound - range.lowerBound)
        }
    }

    private struct FailingTranscription: TranscriptionService {
        struct Failure: Error {}
        func transcribe(_ recording: Recording) async throws -> Transcript { throw Failure() }
    }

    private struct CountingGeneration: ProcedureGenerationService {
        let counter: InMemoryAnalytics
        func generateMemory(from recording: Recording, transcript: Transcript, analysis: Analysis?, context: GenerationContext) async throws -> Memory {
            await counter.track(.share)
            return try await MockProcedureGenerationService().generateMemory(from: recording, transcript: transcript, analysis: analysis, context: context)
        }
    }

    private var store: FileStore!

    override func setUpWithError() throws {
        store = try FileStore(directory: FileManager.default.temporaryDirectory.appending(path: "pipeline-\(UUID().uuidString)"))
    }

    private func makePipeline(analytics: InMemoryAnalytics = InMemoryAnalytics(), transcription: any TranscriptionService = MockTranscriptionService(), generation: any ProcedureGenerationService = MockProcedureGenerationService()) -> ProcessingPipeline {
        ProcessingPipeline(
            transcription: transcription,
            generation: generation,
            recognition: MockObjectRecognitionService(),
            recordings: store,
            memories: store,
            jobs: store,
            analytics: analytics,
            frames: StubFrames(),
            clips: StubClips()
        )
    }

    /// A recording whose file exists (the "secured" stage checks for it).
    private func makeRecording(markers: [TimeInterval] = []) throws -> Recording {
        let url = FileManager.default.temporaryDirectory.appending(path: "pipeline-\(UUID().uuidString).mov")
        try Data([0]).write(to: url)
        return Recording(householdID: SampleIDs.household, localURL: url, byteCount: 1, duration: 118, userMarkers: markers)
    }

    private var context: GenerationContext { GenerationContext(householdID: SampleIDs.household, creatorID: SampleIDs.amine) }

    private func run(_ pipeline: ProcessingPipeline, _ recording: Recording, objects: [PhysicalObject] = []) async throws -> [ProcessingStage] {
        let job = try await store.job(recordingID: recording.id) ?? ProcessingJob(recordingID: recording.id)
        var draft: Memory?
        if let id = job.memoryID { draft = try await store.memory(id: id) }
        var stages: [ProcessingStage] = []
        for try await stage in pipeline.run(job: job, recording: recording, draft: draft, context: context, objects: objects) { stages.append(stage) }
        return stages
    }

    private func names(_ stages: [ProcessingStage]) -> [String] {
        var order: [String] = []
        for stage in stages {
            let name: String
            switch stage {
            case .secured: name = "secured"
            case .transcribing: name = "transcribing"
            case .findingMoments: name = "moments"
            case .understanding: name = "understanding"
            case .creatingSteps: name = "steps"
            case .preparing: name = "preparing"
            case .done: name = "done"
            }
            if order.last != name { order.append(name) }
        }
        return order
    }

    func testStagesArriveInOrder() async throws {
        let analytics = InMemoryAnalytics()
        let recording = try makeRecording()
        try await store.save(recording)

        let stages = try await run(makePipeline(analytics: analytics), recording, objects: SampleData.objects)
        XCTAssertEqual(names(stages), ["secured", "transcribing", "moments", "understanding", "steps", "preparing", "done"])
        let events = await analytics.events
        XCTAssertTrue(events.contains { if case .processingLatency = $0 { return true } else { return false } })
        let job = try await store.job(recordingID: recording.id)
        XCTAssertEqual(job?.stage, .framesReady, "the job waits at framesReady until Review's Remember deletes it")
        XCTAssertNotNil(job?.memoryID)
    }

    func testEveryStepHasProvenanceAndSource() async throws {
        let recording = try makeRecording()
        try await store.save(recording)
        var memory: Memory?
        for stage in try await run(makePipeline(), recording) {
            if case .done(let m) = stage { memory = m }
        }
        let unwrapped = try XCTUnwrap(memory)
        XCTAssertTrue(unwrapped.isDraft, "a generated memory is a draft until it is remembered")
        let steps = unwrapped.steps
        XCTAssertFalse(steps.isEmpty)
        for step in steps {
            XCTAssertTrue(Provenance.allCases.contains(step.provenance))
            XCTAssertNotNil(step.sourceRange, "a step must point back into the recording")
            XCTAssertNotNil(step.keyFrame, "a frame is extracted one second into each step")
            XCTAssertNotNil(step.clip, "a clip is cut for each step")
        }
        XCTAssertEqual(steps.map(\.order), Array(1...steps.count))
    }

    func testTranscriptionFailureFailsTheJobWithoutAStandIn() async throws {
        let recording = try makeRecording()
        try await store.save(recording)
        do {
            _ = try await run(makePipeline(transcription: FailingTranscription()), recording)
            XCTFail("expected a failure")
        } catch let failure as ProcessingFailure {
            if case .transcription = failure {} else { XCTFail("expected a transcription failure, got \(failure)") }
        }
        let job = try await store.job(recordingID: recording.id)
        XCTAssertEqual(job?.stage, .failed)
        XCTAssertNotNil(job?.lastError)
        let saved = try await store.recording(id: recording.id)
        XCTAssertNil(saved?.transcript, "no transcript is ever invented")
    }

    func testSecondRunResumesFromTheDraft() async throws {
        let counter = InMemoryAnalytics()
        let recording = try makeRecording()
        try await store.save(recording)
        let pipeline = makePipeline(generation: CountingGeneration(counter: counter))
        _ = try await run(pipeline, recording)
        let again = try await run(pipeline, recording)
        XCTAssertEqual(names(again), ["secured", "transcribing", "moments", "understanding", "steps", "preparing", "done"])
        let generations = await counter.events.count
        XCTAssertEqual(generations, 1, "the draft memory is reused; the analysis is not called again")
    }

    func testUserMarkersBecomeObservedMoments() async throws {
        let recording = try makeRecording(markers: [35, 58])
        try await store.save(recording)
        var moments: [DetectedMoment] = []
        for stage in try await run(makePipeline(), recording) {
            if case .findingMoments(let found) = stage { moments = found }
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
