import DoOnceCore
import Foundation

/// What Processing is doing right now. Each case carries the real data produced so far, so the
/// screen shows progress by showing results, never a percentage it made up.
enum ProcessingStage: Sendable {
    /// The original file is in the media library and will not be lost.
    case secured
    /// Transcription is running; the transcript grows as partial results arrive.
    case transcribing(Transcript)
    /// Step boundaries found from markers, pauses and important statements.
    case findingMoments([DetectedMoment])
    /// The analysis (gateway or deterministic) is turning the recording into steps. Carries the
    /// object match made first, when Teach was not told which object this is.
    case understanding(RecognitionResult?)
    /// Key frames and clips are being cut for each step; the steps that have theirs so far.
    case creatingSteps([Step])
    /// The draft memory is being saved for review.
    case preparing
    case done(Memory)
}

/// Why processing stopped. `messageKey` is the calm copy the screen shows; the recording, its
/// transcript and analysis stay saved whatever the reason, so retry never starts from zero.
enum ProcessingFailure: LocalizedError {
    case originalMissing
    case transcription(String)
    case notConfigured
    case unreachable
    case rejected(String)
    case generation(String)

    var messageKey: String {
        switch self {
        case .originalMissing: "error.recording.title"
        case .transcription: "processing.transcriptionFailed"
        case .notConfigured: "processing.notConfigured"
        case .unreachable: "processing.unreachable"
        case .rejected: "processing.rejected"
        case .generation: "processing.failed"
        }
    }

    var errorDescription: String? { L10n.string(messageKey) }

    /// The gateway's errors, and everything else, as one of ours.
    static func wrap(_ error: any Error) -> ProcessingFailure {
        if let failure = error as? ProcessingFailure { return failure }
        if let gateway = error as? GatewayError {
            switch gateway {
            case .notConfigured: return .notConfigured
            case .unavailable, .unauthorized: return .unreachable
            case .rejected, .malformedResponse: return .rejected("\(gateway)")
            }
        }
        return .generation(error.localizedDescription)
    }
}

/// Extracts a still from a recording at a time. Real: `AVAssetImageGenerator`; tests: a stub.
protocol KeyFrameExtracting: Sendable {
    func keyFrame(of recording: Recording, at seconds: TimeInterval) async throws -> MediaRef
}

/// Stop → memory, resumable. Orchestrates the services in order and reports each stage as it
/// starts; a `ProcessingJob` is saved at every boundary so a relaunch continues from the last
/// completed one.
///
/// Stages: secured → transcribing (skipped when the recording already has a transcript; the
/// transcript is real or the job fails, never a stand-in) → finding moments (heuristics over
/// the transcript plus the user's markers) → understanding (object match, then the injected
/// `ProcedureGenerationService`; skipped when a draft memory already exists) → creating steps
/// (a key frame and a clip per step, each optional) → preparing → done.
struct ProcessingPipeline: Sendable {
    let transcription: any TranscriptionService
    let generation: any ProcedureGenerationService
    let recognition: any ObjectRecognitionService
    let recordings: any RecordingStore
    let memories: any MemoryRepository
    let jobs: any ProcessingJobStore
    let analytics: any Analytics
    let frames: any KeyFrameExtracting
    let clips: any StepClipExporting
    var momentDetector = MomentDetector()

    func run(job initial: ProcessingJob, recording: Recording, draft: Memory?, context: GenerationContext, objects: [PhysicalObject]) -> AsyncThrowingStream<ProcessingStage, any Error> {
        AsyncThrowingStream { (continuation: AsyncThrowingStream<ProcessingStage, any Error>.Continuation) in
            let task = Task {
                var job = initial
                job.attempts += 1
                job.lastError = nil
                do {
                    let started = Date()
                    var recording = recording

                    // 1. Secured: the original is on this phone.
                    guard Self.originalExists(recording) else { throw ProcessingFailure.originalMissing }
                    continuation.yield(.secured)
                    try await checkpoint(&job, .secured)

                    // 2. Transcribing. A real transcript or nothing.
                    continuation.yield(.transcribing(recording.transcript ?? Transcript(segments: [])))
                    let transcript: Transcript
                    if let existing = recording.transcript, !existing.segments.isEmpty {
                        transcript = existing
                    } else {
                        do {
                            if let partial = transcription as? any PartialTranscriptionService {
                                transcript = try await partial.transcribe(recording) { continuation.yield(.transcribing($0)) }
                            } else {
                                transcript = try await transcription.transcribe(recording)
                            }
                        } catch is CancellationError {
                            throw CancellationError()
                        } catch {
                            throw ProcessingFailure.transcription(error.localizedDescription)
                        }
                        recording.transcript = transcript
                        try await recordings.save(recording)
                    }
                    continuation.yield(.transcribing(transcript))
                    try Task.checkCancellation()
                    try await checkpoint(&job, .transcribed)

                    // 3. Finding moments.
                    let moments: [DetectedMoment]
                    if let found = recording.analysis?.moments, !found.isEmpty {
                        moments = found
                    } else {
                        moments = momentDetector.moments(in: transcript, markers: recording.userMarkers, duration: recording.duration)
                        recording.analysis = Analysis(moments: moments, objects: recording.analysis?.objects ?? [], riskFlags: recording.analysis?.riskFlags ?? [])
                        try await recordings.save(recording)
                    }
                    continuation.yield(.findingMoments(moments))
                    try Task.checkCancellation()
                    try await checkpoint(&job, .momentsFound)

                    // 4. Understanding: object match, then the analysis. Skipped once a draft exists.
                    var memory: Memory
                    if let draft {
                        memory = draft
                        continuation.yield(.understanding(nil))
                    } else {
                        var match: RecognitionResult?
                        var detected: [DetectedObject] = []
                        if context.objectID == nil {
                            let at = moments.first.map { $0.time + 1 } ?? min(1, recording.duration / 2)
                            if let frame = try? await frames.keyFrame(of: recording, at: at),
                               let result = try? await recognition.recognise(frame, among: objects) {
                                match = result
                                if let best = result.best {
                                    detected = [DetectedObject(label: best.name, confidence: best.confidence, firstSeenAt: at, lastSeenAt: at)]
                                }
                            }
                        }
                        continuation.yield(.understanding(match))
                        try Task.checkCancellation()
                        let analysis = Analysis(moments: moments, objects: detected, riskFlags: recording.analysis?.riskFlags ?? [])
                        recording.analysis = analysis
                        try await recordings.save(recording)
                        do {
                            memory = try await generation.generateMemory(from: recording, transcript: transcript, analysis: analysis, context: context)
                        } catch is CancellationError {
                            throw CancellationError()
                        } catch {
                            throw ProcessingFailure.wrap(error)
                        }
                        if !memory.isDraft { memory.tags.append(Memory.draftTag) }
                        try await memories.save(memory)
                        job.memoryID = memory.id
                        try await checkpoint(&job, .analysed)
                    }
                    try Task.checkCancellation()

                    // 5. Creating steps: a frame and a clip for each, neither required.
                    continuation.yield(.creatingSteps([]))
                    if job.stage.rank < ProcessingJob.Stage.framesReady.rank {
                        var done: [Step] = []
                        for var step in memory.orderedSteps {
                            if let range = step.sourceRange {
                                if step.keyFrame == nil {
                                    step.keyFrame = try? await frames.keyFrame(of: recording, at: min(range.lowerBound + 1, range.upperBound))
                                }
                                // The mapper points clips at the original until they are cut; a real
                                // clip lives in the clips directory. A failed export leaves no clip.
                                if !Self.isCutClip(step.clip, of: recording) {
                                    step.clip = try? await clips.clip(of: recording, stepOrder: step.order, range: range)
                                }
                            }
                            done.append(step)
                            continuation.yield(.creatingSteps(done))
                            try Task.checkCancellation()
                        }
                        memory.steps = done
                        try await memories.save(memory)
                        try await checkpoint(&job, .framesReady)
                    } else {
                        continuation.yield(.creatingSteps(memory.orderedSteps))
                    }

                    // 6. Preparing: the draft is complete and waits for review.
                    continuation.yield(.preparing)
                    await analytics.track(.processingLatency(seconds: Date().timeIntervalSince(started)))
                    continuation.yield(.done(memory))
                    continuation.finish()
                } catch is CancellationError {
                    // Leaving the screen is not a failure: the job stays at its last checkpoint.
                    continuation.finish(throwing: CancellationError())
                } catch {
                    let failure = ProcessingFailure.wrap(error)
                    job.stage = .failed
                    job.lastError = failure.errorDescription ?? "\(error)"
                    job.updatedAt = Date()
                    try? await jobs.save(job)
                    continuation.finish(throwing: failure)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    /// Advances the job to `stage` (never backwards, except out of `.failed`) and persists it.
    private func checkpoint(_ job: inout ProcessingJob, _ stage: ProcessingJob.Stage) async throws {
        if job.stage == .failed || stage.rank > job.stage.rank { job.stage = stage }
        job.updatedAt = Date()
        try await jobs.save(job)
    }

    private static func originalExists(_ recording: Recording) -> Bool {
        guard recording.localURL.isFileURL else { return true }
        return RecordingFiles.library.playableOriginalURL(for: recording) != nil
    }

    /// True when `ref` is a clip file cut for this recording (not the original at an offset).
    private static func isCutClip(_ ref: MediaRef?, of recording: Recording) -> Bool {
        guard let url = ref?.localURL, url.isFileURL, ref?.kind == .video else { return false }
        let clipsDirectory = RecordingFiles.library.clipsDirectory(recording.id).standardizedFileURL.path
        return url.standardizedFileURL.path.hasPrefix(clipsDirectory) && FileManager.default.fileExists(atPath: url.path)
    }
}

/// Finds step boundaries in what was said. Heuristic on purpose, and it says so through
/// `DetectedMoment.kind`: markers are `.userMarked` (observed), everything else is `.speechCue`
/// (inferred). Nothing here is a substitute for video analysis; it makes the assembler's job
/// possible without one.
struct MomentDetector: Sendable {
    /// A silence this long after an instruction-like sentence marks a boundary.
    var pauseGap: TimeInterval = 1.2
    /// Moments closer than this collapse into one; the user's marker wins.
    var mergeWindow: TimeInterval = 1.5
    var assembler = ProcedureAssembler()

    func moments(in transcript: Transcript, markers: [TimeInterval], duration: TimeInterval) -> [DetectedMoment] {
        var found: [DetectedMoment] = markers.map { DetectedMoment(time: $0, kind: .userMarked, confidence: 1, label: L10n.string("teach.rememberThis")) }
        let segments = transcript.segments.sorted { $0.start < $1.start }

        for (index, segment) in segments.enumerated() {
            if index == 0, segment.start > 0 || segments.count > 1 {
                found.append(DetectedMoment(time: segment.start, kind: .speechCue, confidence: 0.6))
            }
            if index + 1 < segments.count {
                let next = segments[index + 1]
                if next.start - segment.end >= pauseGap, isInstruction(segment.text) {
                    found.append(DetectedMoment(time: next.start, kind: .speechCue, confidence: 0.7, label: L10n.string("teach.stepDetected")))
                }
            }
            if let important = ImportantStatementDetector.detect(in: segment.text).first {
                found.append(DetectedMoment(time: segment.start, kind: .speechCue, confidence: 0.8, label: important.keyword))
            }
        }
        return merge(found.sorted { $0.time < $1.time })
    }

    /// Reuses the assembler's instruction heuristic without duplicating its verb list.
    func isInstruction(_ text: String) -> Bool {
        let probe = Transcript(segments: [TranscriptSegment(start: 0, end: 1, text: text)])
        return !assembler.assemble(transcript: probe, moments: []).steps.isEmpty
    }

    private func merge(_ moments: [DetectedMoment]) -> [DetectedMoment] {
        var merged: [DetectedMoment] = []
        for moment in moments {
            if let last = merged.last, moment.time - last.time < mergeWindow {
                if moment.kind == .userMarked, last.kind != .userMarked { merged[merged.count - 1] = moment }
                continue
            }
            merged.append(moment)
        }
        return merged
    }
}

/// Real key frames through `AVAssetImageGenerator`, cached under the media library's frames
/// directory for the recording.
struct AssetKeyFrameExtractor: KeyFrameExtracting {
    func keyFrame(of recording: Recording, at seconds: TimeInterval) async throws -> MediaRef {
        try await KeyFrames.frame(of: recording, at: seconds)
    }
}
