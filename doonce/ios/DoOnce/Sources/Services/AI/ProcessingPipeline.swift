import DoOnceCore
import Foundation

/// What Processing is doing right now. Each case carries the real data produced so far, so the
/// screen shows progress by showing results, never a percentage it made up.
enum ProcessingStage: Sendable {
    /// Transcription is running; the transcript grows as partial results arrive.
    case listening(Transcript)
    /// Step boundaries found from markers, pauses and important statements.
    case findingSteps([DetectedMoment])
    /// The key frame was matched against the household's objects (nil when skipped or failed).
    case matchingObject(RecognitionResult?)
    /// Steps are being assembled and key frames extracted.
    case creatingGuide
    case done(Memory)
}

/// Extracts a still from a recording at a time. Real: `AVAssetImageGenerator`; tests: a stub.
protocol KeyFrameExtracting: Sendable {
    func keyFrame(of recording: Recording, at seconds: TimeInterval) async throws -> MediaRef
}

/// Stop → memory. Orchestrates the services in order and reports each stage as it starts.
///
/// Stages: transcription (partial results streamed) → moment detection (pure heuristics over
/// the transcript plus the user's markers) → object match on the first key frame → generation
/// (the injected `ProcedureGenerationService`; the mock runs the real `ProcedureAssembler`) →
/// key frames for every step. Latency from start to `.done` is reported to analytics.
struct ProcessingPipeline: Sendable {
    let transcription: any TranscriptionService
    let generation: any ProcedureGenerationService
    let recognition: any ObjectRecognitionService
    let recordings: any RecordingStore
    let analytics: any Analytics
    let frames: any KeyFrameExtracting
    var momentDetector = MomentDetector()

    func run(recording: Recording, context: GenerationContext, objects: [PhysicalObject]) -> AsyncThrowingStream<ProcessingStage, any Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let started = Date()
                    var recording = recording

                    // 1. Listening
                    continuation.yield(.listening(recording.transcript ?? Transcript(segments: [])))
                    let transcript: Transcript
                    if let existing = recording.transcript {
                        transcript = existing
                    } else if let partial = transcription as? any PartialTranscriptionService {
                        transcript = try await partial.transcribe(recording) { continuation.yield(.listening($0)) }
                    } else {
                        transcript = try await transcription.transcribe(recording)
                    }
                    continuation.yield(.listening(transcript))
                    try Task.checkCancellation()

                    // 2. Finding steps
                    let moments = recording.analysis?.moments.isEmpty == false
                        ? recording.analysis!.moments
                        : momentDetector.moments(in: transcript, markers: recording.userMarkers, duration: recording.duration)
                    continuation.yield(.findingSteps(moments))
                    try Task.checkCancellation()

                    // 3. Matching object (skipped when the user already chose one)
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
                    continuation.yield(.matchingObject(match))
                    try Task.checkCancellation()

                    // 4. Creating the guide
                    continuation.yield(.creatingGuide)
                    let analysis = Analysis(moments: moments, objects: detected, riskFlags: recording.analysis?.riskFlags ?? [])
                    recording.transcript = transcript
                    recording.analysis = analysis
                    try await recordings.save(recording)
                    var memory = try await generation.generateMemory(from: recording, transcript: transcript, analysis: analysis, context: context)
                    memory.steps = await attachKeyFrames(to: memory.steps, recording: recording)
                    await analytics.track(.processingLatency(seconds: Date().timeIntervalSince(started)))
                    continuation.yield(.done(memory))
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    /// A frame one second into each step (motion spec §7). A failed extraction leaves the step
    /// without a frame rather than failing the memory.
    private func attachKeyFrames(to steps: [Step], recording: Recording) async -> [Step] {
        var result: [Step] = []
        for var step in steps {
            if step.keyFrame == nil, let range = step.sourceRange {
                let at = min(range.lowerBound + 1, range.upperBound)
                step.keyFrame = try? await frames.keyFrame(of: recording, at: at)
            }
            result.append(step)
        }
        return result
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

/// Real key frames through `AVAssetImageGenerator`, cached on disk under Frames/<recording>/.
struct AssetKeyFrameExtractor: KeyFrameExtracting {
    func keyFrame(of recording: Recording, at seconds: TimeInterval) async throws -> MediaRef {
        try await KeyFrames.frame(of: recording, at: seconds)
    }
}
