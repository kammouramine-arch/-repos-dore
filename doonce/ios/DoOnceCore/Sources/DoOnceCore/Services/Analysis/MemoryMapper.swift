import Foundation

/// Turns a validated response into the `Memory` the app stores.
///
/// Pure and total: it never looks anything up, so the same response and context always give the
/// same memory (apart from fresh UUIDs). Provenance, source ranges and transcripts are copied
/// through untouched; only the validator may change them.
public enum MemoryMapper {
    /// - Parameters:
    ///   - keyFrames: `KeyFrameReference.id` → the frame on disk, from `MediaLibrary`.
    ///   - clips: step order → the clip on disk (or the original with an offset).
    public static func memory(
        from response: ProcedureAnalysisResponse,
        request: ProcedureAnalysisRequest,
        context: GenerationContext,
        keyFrames: [String: MediaRef],
        clips: [Int: MediaRef] = [:]
    ) -> Memory {
        let steps = response.steps.map { step(from: $0, keyFrames: keyFrames, clips: clips) }
        let title = context.preferredTitle?.trimmingCharacters(in: .whitespacesAndNewlines)
        return Memory(
            householdID: context.householdID,
            title: title.flatMap { $0.isEmpty ? nil : $0 } ?? response.title,
            summary: response.shortDescription,
            objectID: context.objectID,
            spaceID: context.spaceID,
            demonstratorID: context.demonstratorID,
            creatorID: context.creatorID,
            sourceRecordingID: request.recordingID,
            duration: request.duration,
            riskLevel: response.riskLevel,
            steps: steps,
            tools: response.tools,
            warnings: response.warnings.map(warning),
            tags: []
        )
    }

    public static func step(from analyzed: AnalyzedStep, keyFrames: [String: MediaRef], clips: [Int: MediaRef]) -> Step {
        Step(
            order: analyzed.order,
            instruction: analyzed.instruction,
            details: analyzed.detail.flatMap { $0.isEmpty ? nil : $0 },
            sourceRange: analyzed.sourceRange,
            sourceTranscript: analyzed.sourceTranscript,
            keyFrame: analyzed.keyFrameReference.flatMap { keyFrames[$0] },
            clip: clips[analyzed.order],
            warning: analyzed.warning.map(warning),
            provenance: analyzed.provenance,
            completionRule: completionRule(for: analyzed)
        )
    }

    /// A gauge rule when the instruction (or, failing that, the speech) says to stop at a value.
    /// Same cues and extractor as `ProcedureAssembler`, so both providers agree.
    static func completionRule(for analyzed: AnalyzedStep) -> CompletionRule {
        let fromInstruction = ProcedureAssembler.completionRule(for: analyzed.instruction)
        if case .gaugeReaches = fromInstruction { return fromInstruction }
        if let spoken = analyzed.sourceTranscript { return ProcedureAssembler.completionRule(for: spoken) }
        return .manual
    }

    /// Severity from the words, never below medium: a provider only reports what it thought mattered.
    static func warning(_ text: String) -> Warning {
        Warning(text: text, severity: max(.medium, RiskClassifier.classify(text)), trigger: ImportantStatementDetector.detect(in: text).first?.keyword)
    }
}

/// The production `ProcedureGenerationService`: request → provider → validator → mapper.
///
/// Whatever provider is plugged in, the memory the app stores has passed the validator.
public struct AnalysisBackedGenerationService: ProcedureGenerationService {
    public var analysis: any ProcedureAnalysisService
    public var locale: String
    /// Frames already extracted for the recording, sent with the request.
    public var keyFrames: [KeyFrameReference]
    /// Where those frames are on disk, by `KeyFrameReference.id`.
    public var keyFrameMedia: [String: MediaRef]
    public var untitledFallback: String

    public init(
        analysis: any ProcedureAnalysisService,
        locale: String = "en",
        keyFrames: [KeyFrameReference] = [],
        keyFrameMedia: [String: MediaRef] = [:],
        untitledFallback: String = AnalysisValidator.defaultUntitled
    ) {
        self.analysis = analysis
        self.locale = locale
        self.keyFrames = keyFrames
        self.keyFrameMedia = keyFrameMedia
        self.untitledFallback = untitledFallback
    }

    public func generateMemory(from recording: Recording, transcript: Transcript, analysis detected: Analysis?, context: GenerationContext) async throws -> Memory {
        let request = Self.request(for: recording, transcript: transcript, analysis: detected, locale: locale, keyFrames: keyFrames)
        let raw = try await analysis.analyze(request)
        let validated = AnalysisValidator.validate(raw, request: request, untitledFallback: untitledFallback).response

        // Until clips are cut, every step's clip is the original at the step's offset.
        var clips: [Int: MediaRef] = [:]
        for step in validated.steps {
            if let range = step.sourceRange {
                clips[step.order] = MediaRef(kind: .video, localURL: recording.localURL, sourceOffset: range.lowerBound, duration: range.upperBound - range.lowerBound)
            }
        }

        var memory = MemoryMapper.memory(from: validated, request: request, context: context, keyFrames: keyFrameMedia, clips: clips)
        memory.createdAt = recording.recordedAt
        memory.riskLevel = max(memory.riskLevel, detected?.riskFlags.map(\.level).max() ?? .low)
        return memory
    }

    /// The request for a recording. Moments come from the analysis, or from the user's markers alone.
    public static func request(for recording: Recording, transcript: Transcript, analysis: Analysis?, locale: String, keyFrames: [KeyFrameReference]) -> ProcedureAnalysisRequest {
        let moments = analysis?.moments ?? recording.userMarkers.map { DetectedMoment(time: $0, kind: .userMarked) }
        return ProcedureAnalysisRequest(
            recordingID: recording.id,
            duration: recording.duration,
            locale: locale,
            transcript: transcript,
            markers: recording.userMarkers,
            moments: moments,
            keyFrames: keyFrames
        )
    }
}
