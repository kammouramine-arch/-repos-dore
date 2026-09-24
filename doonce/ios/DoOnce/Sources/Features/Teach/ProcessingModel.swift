import DoOnceCore
import Foundation
import Observation
import SwiftUI

/// Drives Processing: consumes the pipeline's stages and turns them into what the screen shows.
/// The status line only ever names the stage that is running; the ribbon fill is transcript
/// progress; ticks and frames appear when the data behind them exists.
@MainActor
@Observable
final class ProcessingModel {
    enum Status: Equatable { case listening, steps, object, guide, ready, failed(String) }

    private(set) var status: Status = .listening
    private(set) var recording: Recording?
    private(set) var hero: MediaRef?
    /// The segment being streamed in, word by word.
    private(set) var shownText = ""
    private(set) var highlights: [String] = []
    private(set) var fill: Double = 0
    private(set) var ticks: [RibbonTick] = []
    private(set) var revealedSteps: [Step] = []
    private(set) var memory: Memory?
    private(set) var recognition: RecognitionResult?
    private(set) var isReady = false

    var duration: TimeInterval { recording?.duration ?? 0 }

    private var shownSegments = 0
    private var revealQueue: [TranscriptSegment] = []
    private var revealing = false
    private var pipelineTask: Task<Void, Never>?

    func start(app: AppState, recordingID: UUID, objectID: UUID?) {
        guard pipelineTask == nil else { return }
        pipelineTask = Task { await run(app: app, recordingID: recordingID, objectID: objectID) }
    }

    func cancel() { pipelineTask?.cancel() }

    /// After a failure: forget what was shown and run the pipeline again on the same recording.
    func retry(app: AppState, recordingID: UUID, objectID: UUID?) {
        pipelineTask?.cancel()
        pipelineTask = nil
        status = .listening
        shownText = ""; highlights = []; fill = 0; ticks = []; revealedSteps = []
        memory = nil; recognition = nil; isReady = false
        shownSegments = 0; revealQueue = []; revealing = false
        start(app: app, recordingID: recordingID, objectID: objectID)
    }

    private func run(app: AppState, recordingID: UUID, objectID: UUID?) async {
        guard let recording = try? await app.services.recordings.recording(id: recordingID) else {
            status = .failed(L10n.string("error.generic.title"))
            return
        }
        self.recording = recording
        hero = try? await KeyFrames.lastFrame(of: recording)

        let pipeline = ProcessingPipeline(
            transcription: app.services.transcription,
            generation: app.services.generation,
            recognition: app.services.recognition,
            recordings: app.services.recordings,
            analytics: app.services.analytics,
            frames: AssetKeyFrameExtractor()
        )
        let object = app.object(objectID)
        let context = GenerationContext(
            householdID: app.household.id,
            creatorID: app.currentUser.id,
            objectID: objectID,
            spaceID: object?.spaceID,
            demonstratorID: app.people.first(where: { $0.isSelf })?.id
        )
        do {
            for try await stage in pipeline.run(recording: recording, context: context, objects: app.objects) {
                apply(stage, recording: recording)
            }
        } catch {
            status = .failed(L10n.string("processing.failed"))
        }
    }

    private func apply(_ stage: ProcessingStage, recording: Recording) {
        switch stage {
        case .listening(let transcript):
            status = .listening
            enqueue(Array(transcript.segments.dropFirst(shownSegments)))
        case .findingSteps(let moments):
            setStatus(.steps)
            Task { @MainActor in
                for moment in moments {
                    ticks.append(RibbonTick(at: moment.time, kind: moment.kind == .userMarked ? .marked : .step))
                    if !UIAccessibility.isReduceMotionEnabled { try? await Task.sleep(for: .milliseconds(140)) }
                }
            }
        case .matchingObject(let result):
            recognition = result
            setStatus(.object)
        case .creatingGuide:
            setStatus(.guide)
        case .done(let memory):
            self.memory = memory
            Task { @MainActor in await finish(memory) }
        }
    }

    private func setStatus(_ new: Status) {
        withDSAnimation(DSMotion.standard(0.2)) { status = new }
    }

    // MARK: Transcript reveal

    /// Words stream at word cadence (42 ms) so a transcript that arrives in one piece still reads
    /// as listening. Partial results just extend the queue.
    private func enqueue(_ segments: [TranscriptSegment]) {
        guard !segments.isEmpty else { return }
        shownSegments += segments.count
        revealQueue.append(contentsOf: segments)
        guard !revealing else { return }
        revealing = true
        Task { @MainActor in await reveal() }
    }

    private func reveal() async {
        let reduce = UIAccessibility.isReduceMotionEnabled
        while !revealQueue.isEmpty {
            let segment = revealQueue.removeFirst()
            let words = segment.text.split(separator: " ").map(String.init)
            highlights = TranscriptBuilder.keyPhrases(in: segment.text)
            for index in words.indices {
                shownText = words[0...index].joined(separator: " ")
                if !reduce { try? await Task.sleep(for: .milliseconds(42)) }
            }
            fill = duration > 0 ? min(1, segment.end / duration) : 0
            if ImportantStatementDetector.isImportant(segment.text) || NumericValueExtractor.first(in: segment.text) != nil {
                ticks.append(RibbonTick(at: segment.start, kind: ImportantStatementDetector.isImportant(segment.text) ? .important : .step))
                HapticsService.shared.play(.selection)
            }
            if !reduce { try? await Task.sleep(for: .milliseconds(120)) }
        }
        fill = memory == nil ? fill : 1
        revealing = false
    }

    /// Frames lift into a vertical sequence, 60 ms stagger; then the CTA.
    private func finish(_ memory: Memory) async {
        while revealing { try? await Task.sleep(for: .milliseconds(60)) }
        fill = 1
        let reduce = UIAccessibility.isReduceMotionEnabled
        for step in memory.orderedSteps {
            withDSAnimation(DSMotion.gentle) { revealedSteps.append(step) }
            if !reduce { try? await Task.sleep(for: .milliseconds(60)) }
        }
        setStatus(.ready)
        HapticsService.shared.play(.light)
        withDSAnimation(DSMotion.emphasized(0.26)) { isReady = true }
    }
}
