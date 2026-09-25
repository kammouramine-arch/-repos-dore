import Foundation

/// How to do one thing with one object, as someone once showed you.
public struct Memory: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var householdID: UUID
    public var title: String
    public var summary: String
    public var objectID: UUID?
    public var spaceID: UUID?
    /// The person who demonstrated it ("Taught by Julien").
    public var demonstratorID: UUID?
    /// The user who recorded and saved it.
    public var creatorID: UUID
    public var createdAt: Date
    public var sourceRecordingID: UUID?
    public var duration: TimeInterval
    public var riskLevel: RiskLevel
    public var steps: [Step]
    public var tools: [String]
    public var warnings: [Warning]
    public var tags: [String]
    /// Starts at 1 and increments on every edit. See `MemoryVersioning`.
    public var version: Int
    public var versionHistory: [MemoryVersion]
    /// When the user last answered "Was this still accurate?" with yes.
    public var lastConfirmedAt: Date?

    public init(
        id: UUID = UUID(),
        householdID: UUID,
        title: String,
        summary: String = "",
        objectID: UUID? = nil,
        spaceID: UUID? = nil,
        demonstratorID: UUID? = nil,
        creatorID: UUID,
        createdAt: Date = Date(),
        sourceRecordingID: UUID? = nil,
        duration: TimeInterval = 0,
        riskLevel: RiskLevel = .low,
        steps: [Step] = [],
        tools: [String] = [],
        warnings: [Warning] = [],
        tags: [String] = [],
        version: Int = 1,
        versionHistory: [MemoryVersion] = [],
        lastConfirmedAt: Date? = nil
    ) {
        self.id = id
        self.householdID = householdID
        self.title = title
        self.summary = summary
        self.objectID = objectID
        self.spaceID = spaceID
        self.demonstratorID = demonstratorID
        self.creatorID = creatorID
        self.createdAt = createdAt
        self.sourceRecordingID = sourceRecordingID
        self.duration = duration
        self.riskLevel = riskLevel
        self.steps = steps
        self.tools = tools
        self.warnings = warnings
        self.tags = tags
        self.version = version
        self.versionHistory = versionHistory
        self.lastConfirmedAt = lastConfirmedAt
    }

    public var stepCount: Int { steps.count }

    /// Steps in display order.
    public var orderedSteps: [Step] { steps.sorted { $0.order < $1.order } }

    /// The date the content was last known good: the last confirmation, or creation.
    public var lastKnownAccurateAt: Date { lastConfirmedAt ?? createdAt }
}

/// How dangerous getting a procedure wrong could be.
public enum RiskLevel: String, Codable, Hashable, Sendable, CaseIterable, Comparable {
    case low
    case medium
    case high

    private var rank: Int {
        switch self {
        case .low: 0
        case .medium: 1
        case .high: 2
        }
    }

    public static func < (lhs: RiskLevel, rhs: RiskLevel) -> Bool {
        lhs.rank < rhs.rank
    }
}

/// A snapshot of a memory's steps before an edit.
public struct MemoryVersion: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    /// The version number these steps belonged to.
    public var version: Int
    public var steps: [Step]
    public var title: String
    public var editedBy: UUID
    public var editedAt: Date
    public var note: String?

    public init(
        id: UUID = UUID(),
        version: Int,
        steps: [Step],
        title: String,
        editedBy: UUID,
        editedAt: Date,
        note: String? = nil
    ) {
        self.id = id
        self.version = version
        self.steps = steps
        self.title = title
        self.editedBy = editedBy
        self.editedAt = editedAt
        self.note = note
    }
}
