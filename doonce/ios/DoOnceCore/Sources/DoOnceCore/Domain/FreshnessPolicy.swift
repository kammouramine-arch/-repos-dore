import Foundation

/// Whether a memory should be double-checked before trusting it.
public enum FreshnessAssessment: Hashable, Sendable {
    case fresh
    case checkAccuracy(reason: FreshnessReason)

    public var needsCheck: Bool {
        if case .checkAccuracy = self { return true }
        return false
    }
}

public enum FreshnessReason: Hashable, Sendable {
    /// Not confirmed for longer than the policy allows.
    case olderThanMonths(Int)
    /// High-risk procedures are checked more often.
    case highRisk
}

/// Flags memories that are old, or dangerous enough that "still accurate?" is worth asking.
public struct FreshnessPolicy: Sendable {
    /// Months before any memory is flagged.
    public var maxAgeMonths: Int
    /// Months before a high-risk memory is flagged.
    public var highRiskMaxAgeMonths: Int
    public var calendar: Calendar

    public init(maxAgeMonths: Int = 12, highRiskMaxAgeMonths: Int = 3, calendar: Calendar = FreshnessPolicy.utcCalendar) {
        self.maxAgeMonths = maxAgeMonths
        self.highRiskMaxAgeMonths = highRiskMaxAgeMonths
        self.calendar = calendar
    }

    public static let utcCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }()

    public func assess(_ memory: Memory, now: Date = Date()) -> FreshnessAssessment {
        let since = memory.lastKnownAccurateAt
        if memory.riskLevel == .high, isOlder(than: highRiskMaxAgeMonths, since: since, now: now) {
            return .checkAccuracy(reason: .highRisk)
        }
        if isOlder(than: maxAgeMonths, since: since, now: now) {
            return .checkAccuracy(reason: .olderThanMonths(maxAgeMonths))
        }
        return .fresh
    }

    /// The memories that need a check, oldest first.
    public func memoriesNeedingCheck(in memories: [Memory], now: Date = Date()) -> [Memory] {
        memories
            .filter { assess($0, now: now).needsCheck }
            .sorted { $0.lastKnownAccurateAt < $1.lastKnownAccurateAt }
    }

    private func isOlder(than months: Int, since: Date, now: Date) -> Bool {
        guard let cutoff = calendar.date(byAdding: .month, value: -months, to: now) else { return false }
        return since < cutoff
    }
}
