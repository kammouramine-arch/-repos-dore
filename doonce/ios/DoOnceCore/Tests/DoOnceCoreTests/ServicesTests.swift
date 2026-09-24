import XCTest
@testable import DoOnceCore

final class SubscriptionTests: XCTestCase {
    func testFreeTierAllowsFiveMemoriesThenBlocks() async {
        let service = MockSubscriptionService(tier: .free)
        for count in 0..<5 {
            let gate = await service.canCreateMemory(existingCount: count)
            XCTAssertTrue(gate.isAllowed, "memory \(count + 1) should be allowed")
        }
        let sixth = await service.canCreateMemory(existingCount: 5)
        XCTAssertEqual(sixth, .blocked(limit: 5))
    }

    func testPlusIsUnlimited() async {
        let service = MockSubscriptionService(tier: .free)
        await service.setTier(.plus)
        let gate = await service.canCreateMemory(existingCount: 500)
        XCTAssertTrue(gate.isAllowed)
    }

    func testQuotaIsPureAndTestable() {
        XCTAssertEqual(MemoryQuota.gate(existingCount: 4, tier: .free), .allowed)
        XCTAssertEqual(MemoryQuota.gate(existingCount: 5, tier: .free), .blocked(limit: MemoryQuota.freeLimit))
    }
}

final class HapticsPolicyTests: XCTestCase {
    func testFullAllowsEverything() {
        XCTAssertTrue(HapticsIntent.allCases.allSatisfy { HapticsPolicy.full.allows($0) })
    }

    func testReducedKeepsOnlyMeaningfulFeedback() {
        let kept = HapticsIntent.allCases.filter { HapticsPolicy.reduced.allows($0) }
        XCTAssertEqual(kept, [.success, .warning, .error])
        XCTAssertNil(HapticsPolicy.reduced.filter(.selection))
        XCTAssertEqual(HapticsPolicy.reduced.filter(.error), .error)
    }

    func testOffSwallowsEverything() {
        XCTAssertTrue(HapticsIntent.allCases.allSatisfy { HapticsPolicy.off.filter($0) == nil })
    }
}

final class AnalyticsTests: XCTestCase {
    func testEventsHaveStableNamesAndNoContent() async {
        let analytics = InMemoryAnalytics()
        await analytics.track(.processingLatency(seconds: 12.34))
        await analytics.track(.recognitionCorrection(from: .category))
        let events = await analytics.events
        XCTAssertEqual(events.map(\.name), ["processing_latency", "recognition_correction"])
        XCTAssertEqual(events[0].properties, ["seconds": "12.3"])
        XCTAssertEqual(events[1].properties, ["from_level": "category"])
    }
}

final class AuthTests: XCTestCase {
    func testSignInAndOut() async throws {
        let auth = MockAuthService()
        let user = try await auth.signInWithApple(identityToken: "token", displayName: "Amine")
        XCTAssertEqual(user.displayName, "Amine")
        let current = await auth.currentUser()
        XCTAssertEqual(current?.id, user.id)
        await auth.signOut()
        let after = await auth.currentUser()
        XCTAssertNil(after)
    }

    func testRejectsBadCredentials() async {
        let auth = MockAuthService()
        do {
            _ = try await auth.signIn(email: "not-an-email")
            XCTFail("expected an error")
        } catch {
            XCTAssertEqual(error as? AuthError, .invalidEmail)
        }
    }
}

final class RepositoryTests: XCTestCase {
    func testMemoryRepositoryQueries() async throws {
        let repository = InMemoryMemoryRepository(initial: SampleData.memories)
        let boiler = try await repository.memories(forObject: SampleIDs.boiler)
        XCTAssertEqual(boiler.count, 3)
        let byDad = try await repository.memories(taughtBy: SampleIDs.dad)
        XCTAssertEqual(Set(byDad.map(\.id)), [SampleIDs.restartBoiler, SampleIDs.dadsSettings, SampleIDs.topUpWasherFluid])
        try await repository.delete(id: SampleIDs.backflush)
        let all = try await repository.allMemories()
        XCTAssertEqual(all.count, SampleData.memories.count - 1)
        XCTAssertEqual(all.first?.id, SampleIDs.resetRouter, "newest first")
    }

    func testPeopleAndSpaces() async throws {
        let people = InMemoryPersonRepository(initial: SampleData.people)
        let me = try await people.selfPerson()
        XCTAssertEqual(me?.id, SampleIDs.me)
        let objects = InMemoryObjectRepository(initial: SampleData.objects)
        let inKitchen = try await objects.objects(inSpace: SampleIDs.kitchen)
        XCTAssertEqual(inKitchen.map(\.name), ["Espresso machine", "Router", "Thermostat"])
    }
}
