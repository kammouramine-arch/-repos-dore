import Foundation

/// Generates a real `Memory` by running `ProcedureAssembler` over the transcript and analysis.
///
/// Nothing is canned: give it a different transcript and you get different steps.
public struct MockProcedureGenerationService: ProcedureGenerationService {
    public var assembler: ProcedureAssembler

    public init(assembler: ProcedureAssembler = ProcedureAssembler()) {
        self.assembler = assembler
    }

    public func generateMemory(from recording: Recording, transcript: Transcript, analysis: Analysis?, context: GenerationContext) async throws -> Memory {
        let moments = analysis?.moments ?? recording.userMarkers.map { DetectedMoment(time: $0, kind: .userMarked) }
        let result = assembler.assemble(transcript: transcript, moments: moments)

        let steps = result.steps.map { step -> Step in
            var step = step
            if let range = step.sourceRange {
                step.clip = MediaRef(kind: .video, localURL: recording.localURL, sourceOffset: range.lowerBound, duration: range.upperBound - range.lowerBound)
            }
            return step
        }

        let title = context.preferredTitle
            ?? transcript.keyPhrases.first
            ?? steps.first?.instruction
            ?? "New memory"

        let riskFromAnalysis = analysis?.riskFlags.map(\.level).max() ?? .low
        let observed = steps.filter { $0.provenance == .observed }.count

        return Memory(
            householdID: context.householdID,
            title: title,
            summary: "\(steps.count) steps from a \(Self.format(recording.duration)) recording, \(observed) seen directly.",
            objectID: context.objectID,
            spaceID: context.spaceID,
            demonstratorID: context.demonstratorID,
            creatorID: context.creatorID,
            createdAt: recording.recordedAt,
            sourceRecordingID: recording.id,
            duration: recording.duration,
            riskLevel: max(result.riskLevel, riskFromAnalysis),
            steps: steps,
            tools: result.tools,
            warnings: result.warnings,
            tags: []
        )
    }

    private static func format(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded())
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}
