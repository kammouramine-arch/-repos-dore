import Foundation

/// What the video analysis saw: moments that look like step boundaries, objects, and risk.
public struct Analysis: Codable, Hashable, Sendable {
    public var moments: [DetectedMoment]
    public var objects: [DetectedObject]
    public var riskFlags: [RiskFlag]

    public init(moments: [DetectedMoment] = [], objects: [DetectedObject] = [], riskFlags: [RiskFlag] = []) {
        self.moments = moments
        self.objects = objects
        self.riskFlags = riskFlags
    }
}

/// A point in the recording where something happened.
public struct DetectedMoment: Codable, Identifiable, Hashable, Sendable {
    public enum Kind: String, Codable, Hashable, Sendable {
        /// The user tapped "Remember this" while recording.
        case userMarked
        /// Hands or tools changed what they were doing.
        case actionDetected
        /// A pause or "next" in speech suggested a boundary.
        case speechCue
        /// The camera moved to something else.
        case sceneChange
    }

    public var id: UUID
    public var time: TimeInterval
    public var kind: Kind
    public var confidence: Double
    public var label: String?

    public init(id: UUID = UUID(), time: TimeInterval, kind: Kind, confidence: Double = 1, label: String? = nil) {
        self.id = id
        self.time = time
        self.kind = kind
        self.confidence = confidence
        self.label = label
    }

    /// True when the moment comes from something seen or marked, rather than guessed from speech.
    public var isObserved: Bool {
        switch kind {
        case .userMarked, .actionDetected: true
        case .speechCue, .sceneChange: false
        }
    }
}

/// Something the analysis recognised in frame.
public struct DetectedObject: Codable, Hashable, Sendable {
    public var label: String
    public var confidence: Double
    public var firstSeenAt: TimeInterval
    public var lastSeenAt: TimeInterval

    public init(label: String, confidence: Double, firstSeenAt: TimeInterval, lastSeenAt: TimeInterval) {
        self.label = label
        self.confidence = confidence
        self.firstSeenAt = firstSeenAt
        self.lastSeenAt = lastSeenAt
    }
}

/// A reason the procedure may be dangerous.
public struct RiskFlag: Codable, Hashable, Sendable {
    public var level: RiskLevel
    public var reason: String
    public var time: TimeInterval?

    public init(level: RiskLevel, reason: String, time: TimeInterval? = nil) {
        self.level = level
        self.reason = reason
        self.time = time
    }
}
