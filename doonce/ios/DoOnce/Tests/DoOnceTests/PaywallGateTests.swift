import XCTest
import DoOnceCore
@testable import DoOnce

/// The free tier stops at `MemoryQuota.freeLimit`; the paywall's mock purchase opens the gate.
final class PaywallGateTests: XCTestCase {
    func testFreeTierAllowsUpToTheLimit() {
        XCTAssertTrue(MemoryQuota.gate(existingCount: MemoryQuota.freeLimit - 1, tier: .free).isAllowed)
        XCTAssertEqual(MemoryQuota.gate(existingCount: MemoryQuota.freeLimit, tier: .free), .blocked(limit: MemoryQuota.freeLimit))
        XCTAssertFalse(MemoryQuota.gate(existingCount: MemoryQuota.freeLimit + 3, tier: .free).isAllowed)
    }

    func testPlusTierIsNeverGated() {
        XCTAssertTrue(MemoryQuota.gate(existingCount: 1_000, tier: .plus).isAllowed)
    }

    func testMockPurchaseOpensTheGate() async {
        let service = MockSubscriptionService(tier: .free)
        let before = await service.canCreateMemory(existingCount: MemoryQuota.freeLimit)
        XCTAssertFalse(before.isAllowed)
        await service.setTier(.plus)
        let after = await service.canCreateMemory(existingCount: MemoryQuota.freeLimit)
        XCTAssertTrue(after.isAllowed)
        let tier = await service.currentTier()
        XCTAssertEqual(tier, .plus)
    }

    /// A demo-mode `AppState` on a throwaway store directory.
    @MainActor
    private func makeApp(sample: Bool) async -> AppState {
        let configuration = ServiceConfiguration.resolve(
            environment: ["DOONCE_SAMPLE_CONTENT": sample ? "1" : "0"],
            info: ["DoOnceServiceMode": "demo"]
        )
        let app = AppState(configuration: configuration, directories: .temporary())
        await app.bootstrap()
        return app
    }

    @MainActor
    func testSampleHouseholdIsOverTheFreeLimit() async {
        let app = await makeApp(sample: true)
        XCTAssertGreaterThan(app.memories.count, MemoryQuota.freeLimit)
        let allowed = await app.canCreateMemory()
        XCTAssertFalse(allowed, "The sample household has more memories than the free limit, so Teach must show the paywall.")
    }

    @MainActor
    func testEmptyHouseholdCanCreate() async {
        let app = await makeApp(sample: false)
        let allowed = await app.canCreateMemory()
        XCTAssertTrue(allowed)
    }
}
