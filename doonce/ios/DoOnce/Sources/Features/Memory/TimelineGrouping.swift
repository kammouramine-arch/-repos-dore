import Foundation
import DoOnceCore

/// A run of memories under one timeline label ("This week", "March", "November 2025").
struct TimelineGroup: Identifiable, Equatable {
    var id: String { label }
    var label: String
    var memories: [Memory]
}

/// Groups memories for the timeline: newest first, the last seven days together, then one group
/// per month. Pure so it can be tested without a view.
enum TimelineGrouping {
    static func groups(_ memories: [Memory], now: Date = Date(), calendar: Calendar = .current) -> [TimelineGroup] {
        let sorted = memories.sorted { $0.createdAt > $1.createdAt }
        let weekStart = calendar.date(byAdding: .day, value: -7, to: now) ?? now
        var groups: [TimelineGroup] = []
        for memory in sorted {
            let label = memory.createdAt >= weekStart && memory.createdAt <= now
                ? L10n.string("timeline.thisWeek")
                : DSFormat.month(memory.createdAt, calendar: calendar, now: now)
            if let index = groups.firstIndex(where: { $0.label == label }) {
                groups[index].memories.append(memory)
            } else {
                groups.append(TimelineGroup(label: label, memories: [memory]))
            }
        }
        return groups
    }
}
