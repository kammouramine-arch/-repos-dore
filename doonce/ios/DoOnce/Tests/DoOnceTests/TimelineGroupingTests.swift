import XCTest
import DoOnceCore
@testable import DoOnce

/// The timeline groups newest first: the last seven days together, then one group per month,
/// with the year shown only when it differs from now.
final class TimelineGroupingTests: XCTestCase {
    private var calendar: Calendar { FreshnessPolicy.utcCalendar }

    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        var components = DateComponents()
        components.year = year; components.month = month; components.day = day; components.hour = 12
        return calendar.date(from: components)!
    }

    private func memory(_ title: String, _ createdAt: Date) -> Memory {
        Memory(householdID: SampleIDs.household, title: title, creatorID: SampleIDs.amine, createdAt: createdAt)
    }

    func testGroupsAreNewestFirstAndLabelledByMonth() {
        let now = date(2026, 9, 24)
        let memories = [
            memory("March", date(2026, 3, 18)),
            memory("Yesterday", date(2026, 9, 23)),
            memory("Last year", date(2025, 11, 12)),
            memory("August", date(2026, 8, 22)),
            memory("Also March", date(2026, 3, 1)),
        ]
        let groups = TimelineGrouping.groups(memories, now: now, calendar: calendar)
        XCTAssertEqual(groups.map(\.label), [L10n.string("timeline.thisWeek"), "August", "March", "November 2025"])
        XCTAssertEqual(groups[2].memories.map(\.title), ["March", "Also March"])
    }

    func testThisWeekCoversSevenDaysOnly() {
        let now = date(2026, 9, 24)
        let groups = TimelineGrouping.groups([memory("Six days ago", date(2026, 9, 18)), memory("Ten days ago", date(2026, 9, 14))], now: now, calendar: calendar)
        XCTAssertEqual(groups.count, 2)
        XCTAssertEqual(groups[0].label, L10n.string("timeline.thisWeek"))
        XCTAssertEqual(groups[0].memories.map(\.title), ["Six days ago"])
        XCTAssertEqual(groups[1].label, "September")
    }

    func testEmptyInputGivesNoGroups() {
        XCTAssertTrue(TimelineGrouping.groups([], now: date(2026, 9, 24), calendar: calendar).isEmpty)
    }

    func testSampleDataProducesDescendingGroups() {
        let groups = TimelineGrouping.groups(SampleData.memories, now: date(2026, 9, 24), calendar: calendar)
        let firstDates = groups.compactMap { $0.memories.first?.createdAt }
        XCTAssertEqual(firstDates, firstDates.sorted(by: >))
        XCTAssertEqual(groups.flatMap(\.memories).count, SampleData.memories.count)
    }
}
