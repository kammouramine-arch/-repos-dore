import XCTest
@testable import DoOnceCore

final class FreshnessPolicyTests: XCTestCase {
    let policy = FreshnessPolicy(maxAgeMonths: 12, highRiskMaxAgeMonths: 3)
    let now = SampleDates.date(2026, 9, 24)

    private func memory(createdAt: Date, risk: RiskLevel = .low, confirmedAt: Date? = nil) -> Memory {
        Memory(householdID: SampleIDs.household, title: "t", creatorID: SampleIDs.amine, createdAt: createdAt, riskLevel: risk, lastConfirmedAt: confirmedAt)
    }

    func testRecentLowRiskMemoryIsFresh() {
        XCTAssertEqual(policy.assess(memory(createdAt: SampleDates.date(2026, 1, 1)), now: now), .fresh)
    }

    func testOldMemoryNeedsCheck() {
        let assessment = policy.assess(memory(createdAt: SampleDates.date(2025, 6, 1)), now: now)
        XCTAssertEqual(assessment, .checkAccuracy(reason: .olderThanMonths(12)))
    }

    func testHighRiskIsFlaggedSooner() {
        let fourMonthsOld = memory(createdAt: SampleDates.date(2026, 5, 1), risk: .high)
        XCTAssertEqual(policy.assess(fourMonthsOld, now: now), .checkAccuracy(reason: .highRisk))
        let twoMonthsOld = memory(createdAt: SampleDates.date(2026, 8, 1), risk: .high)
        XCTAssertEqual(policy.assess(twoMonthsOld, now: now), .fresh)
    }

    func testConfirmationResetsTheClock() {
        let old = memory(createdAt: SampleDates.date(2024, 1, 1), confirmedAt: SampleDates.date(2026, 8, 1))
        XCTAssertEqual(policy.assess(old, now: now), .fresh)
    }

    func testSampleDataFlagsTheEmergencyShutoffAndOldMemories() {
        let flagged = policy.memoriesNeedingCheck(in: SampleData.memories, now: now).map(\.id)
        XCTAssertTrue(flagged.contains(SampleIDs.emergencyShutoff))
        XCTAssertTrue(flagged.contains(SampleIDs.holidayMode))
        XCTAssertFalse(flagged.contains(SampleIDs.repressuriseBoiler), "confirmed on 20 Sept 2026")
        XCTAssertEqual(flagged.first, SampleIDs.holidayMode, "oldest first")
    }
}
