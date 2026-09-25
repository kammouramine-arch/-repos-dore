import Foundation

/// Turns a request into a proposed procedure. The gateway, an on-device model and the
/// deterministic assembler all sit behind this, so the app pipeline is identical in every mode.
public protocol ProcedureAnalysisService: Sendable {
    func analyze(_ request: ProcedureAnalysisRequest) async throws -> ProcedureAnalysisResponse
}

/// Refuses every request with `GatewayError.notConfigured`. Used in live mode when no gateway
/// URL was configured, so the failure is explicit rather than a hang or a silent demo fallback.
public struct UnconfiguredProcedureAnalysisService: ProcedureAnalysisService {
    public init() {}

    public func analyze(_ request: ProcedureAnalysisRequest) async throws -> ProcedureAnalysisResponse {
        throw GatewayError.notConfigured
    }
}

/// The on-device provider: runs `ProcedureAssembler` and reports its steps in the response shape.
///
/// It exists so demo mode and offline processing produce output through the same validator and
/// mapper as the gateway, and so tests have a provider that never invents anything.
public struct DeterministicProcedureAnalysisService: ProcedureAnalysisService {
    public var assembler: ProcedureAssembler

    /// Confidence reported per provenance. The assembler is certain about what it observed and
    /// honest that an unclear step is barely more than a timestamp.
    public static let confidence: [Provenance: Double] = [.observed: 0.9, .inferred: 0.6, .unclear: 0.2]

    public init(assembler: ProcedureAssembler = ProcedureAssembler()) {
        self.assembler = assembler
    }

    public func analyze(_ request: ProcedureAnalysisRequest) async throws -> ProcedureAnalysisResponse {
        let moments = request.moments.isEmpty
            ? request.markers.map { DetectedMoment(time: $0, kind: .userMarked) }
            : request.moments
        let result = assembler.assemble(transcript: request.transcript, moments: moments)
        let observed = result.steps.filter { $0.provenance == .observed }.count

        let steps = result.steps.map { step in
            AnalyzedStep(
                order: step.order,
                instruction: step.instruction,
                detail: step.details,
                sourceStart: step.sourceRange?.lowerBound,
                sourceEnd: step.sourceRange?.upperBound,
                sourceTranscript: step.sourceTranscript,
                keyFrameReference: Self.keyFrame(for: step.sourceRange, in: request.keyFrames)?.id,
                warning: step.warning?.text,
                confidence: Self.confidence[step.provenance] ?? 0.5,
                provenance: step.provenance
            )
        }

        let candidate = request.objectHint.flatMap { hint -> ObjectCandidate? in
            guard let name = hint.name else { return nil }
            return ObjectCandidate(name: name, category: hint.category ?? name, brand: hint.brand, model: hint.model, confidence: 1)
        }

        return ProcedureAnalysisResponse(
            title: request.transcript.keyPhrases.first ?? steps.first?.instruction ?? "",
            shortDescription: "\(steps.count) steps from a \(Self.format(request.duration)) recording, \(observed) seen directly.",
            objectCandidate: candidate,
            durationEstimate: request.duration,
            tools: result.tools,
            warnings: result.warnings.map(\.text),
            riskLevel: result.riskLevel,
            steps: steps,
            uncertainties: []
        )
    }

    /// The key frame closest to the start of a step, provided it falls inside the step's window.
    /// The window is half-open so a frame on the boundary belongs to the step that starts there.
    static func keyFrame(for range: ClosedRange<TimeInterval>?, in keyFrames: [KeyFrameReference]) -> KeyFrameReference? {
        guard let range else { return nil }
        return keyFrames
            .filter { $0.time >= range.lowerBound && ($0.time < range.upperBound || range.lowerBound == range.upperBound) }
            .min { abs($0.time - range.lowerBound) < abs($1.time - range.lowerBound) }
    }

    static func format(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded())
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}
