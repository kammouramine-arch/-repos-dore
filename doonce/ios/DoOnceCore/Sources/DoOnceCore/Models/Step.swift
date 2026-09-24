import Foundation

/// One thing to do, shown on one screen in Do mode.
///
/// Every step keeps its provenance: where in the source video it came from and what was said.
public struct Step: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    /// 1-based position within the memory.
    public var order: Int
    /// Short imperative sentence: "Turn the blue valve slowly."
    public var instruction: String
    /// Extra context shown below the instruction.
    public var details: String?
    /// The range of the source recording this step was built from.
    public var sourceRange: ClosedRange<TimeInterval>?
    /// The exact words spoken during `sourceRange`.
    public var sourceTranscript: String?
    public var keyFrame: MediaRef?
    public var clip: MediaRef?
    public var warning: Warning?
    public var provenance: Provenance
    public var completionRule: CompletionRule?

    public init(
        id: UUID = UUID(),
        order: Int,
        instruction: String,
        details: String? = nil,
        sourceRange: ClosedRange<TimeInterval>? = nil,
        sourceTranscript: String? = nil,
        keyFrame: MediaRef? = nil,
        clip: MediaRef? = nil,
        warning: Warning? = nil,
        provenance: Provenance,
        completionRule: CompletionRule? = nil
    ) {
        self.id = id
        self.order = order
        self.instruction = instruction
        self.details = details
        self.sourceRange = sourceRange
        self.sourceTranscript = sourceTranscript
        self.keyFrame = keyFrame
        self.clip = clip
        self.warning = warning
        self.provenance = provenance
        self.completionRule = completionRule
    }

    /// True when a "See original" jump is possible.
    public var hasSource: Bool { sourceRange != nil }
}

/// Whether a step was seen and heard, or filled in.
public enum Provenance: String, Codable, Hashable, Sendable, CaseIterable {
    /// Directly supported by the recording: a detected or marked moment with matching speech.
    case observed
    /// Derived from speech alone, or from a boundary the analysis guessed.
    case inferred
    /// Something happened but neither video nor audio captured it clearly. Shown as "This part wasn't clearly captured."
    case unclear
}

/// How Do mode knows a step is finished.
public enum CompletionRule: Codable, Hashable, Sendable {
    /// Done when a gauge shows the value, e.g. `.gaugeReaches(value: 1.5, unit: "bar")`.
    case gaugeReaches(value: Double, unit: String)
    /// The user says "next" or taps.
    case manual
}

/// A caution attached to a step or a whole memory.
public struct Warning: Codable, Hashable, Sendable {
    public var text: String
    public var severity: RiskLevel
    /// The keyword that triggered it ("never", "careful") when detected automatically.
    public var trigger: String?

    public init(text: String, severity: RiskLevel = .medium, trigger: String? = nil) {
        self.text = text
        self.severity = severity
        self.trigger = trigger
    }
}
