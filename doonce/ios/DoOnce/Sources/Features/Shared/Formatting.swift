import Foundation
import DoOnceCore

/// Dates, durations and initials formatted one way everywhere: "18 Mar" in rows, "18 March 2026"
/// on a passport, "2 min" next to a step count. Views never build their own formatters.
enum DSFormat {
    private static func formatter(_ template: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale.current
        f.setLocalizedDateFormatFromTemplate(template)
        return f
    }

    nonisolated(unsafe) private static let shortDayFormatter = formatter("d MMM")
    nonisolated(unsafe) private static let longDayFormatter = formatter("d MMMM yyyy")
    nonisolated(unsafe) private static let dayMonthFormatter = formatter("d MMMM")
    nonisolated(unsafe) private static let monthFormatter = formatter("MMMM")
    nonisolated(unsafe) private static let monthYearFormatter = formatter("MMMM yyyy")

    /// "18 Mar"
    static func shortDay(_ date: Date) -> String { shortDayFormatter.string(from: date) }
    /// "18 March 2026"
    static func longDay(_ date: Date) -> String { longDayFormatter.string(from: date) }
    /// "18 March"
    static func dayMonth(_ date: Date) -> String { dayMonthFormatter.string(from: date) }
    /// "March" or, for another year, "March 2025".
    static func month(_ date: Date, calendar: Calendar = .current, now: Date = Date()) -> String {
        let sameYear = calendar.component(.year, from: date) == calendar.component(.year, from: now)
        return sameYear ? monthFormatter.string(from: date) : monthYearFormatter.string(from: date)
    }

    /// "2 min" (rounded) or "45 s" under a minute.
    static func duration(_ seconds: TimeInterval) -> String {
        let minutes = Int((seconds / 60).rounded())
        if minutes >= 1 { return L10n.plural("procedure.minutes", n: minutes) }
        return L10n.plural("procedure.seconds", n: Int(seconds.rounded()))
    }

    /// "0:27" for a position inside a recording.
    static func clock(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded()))
        return "\(total / 60):" + String(format: "%02d", total % 60)
    }

    /// Whole months between two dates, never negative.
    static func months(from start: Date, to end: Date = Date(), calendar: Calendar = .current) -> Int {
        max(0, calendar.dateComponents([.month], from: start, to: end).month ?? 0)
    }
}

extension DSFormat {
    /// "Julien" from "Julien Martin"; the copy speaks about people the way the household does.
    static func firstName(_ person: Person?) -> String {
        guard let person else { return L10n.string("ask.unknownPerson") }
        return person.displayName.split(separator: " ").first.map(String.init) ?? person.displayName
    }

    /// Initials for a small avatar; "?" when the person is unknown.
    static func initials(_ person: Person?) -> String { person?.initials ?? "?" }
}

extension String {
    /// "JM" for "Julien Martin", "D" for "Dad". At most two letters.
    var initials: String {
        let words = split(separator: " ").prefix(2)
        return words.compactMap { $0.first }.map { String($0).uppercased() }.joined()
    }
}

extension Person {
    /// Initials for the avatar. Never a photo without explicit consent.
    var initials: String { displayName.initials }
}
