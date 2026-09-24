import Foundation

/// What the user pays for.
public enum SubscriptionTier: String, Codable, Hashable, Sendable {
    case free
    /// DoOnce+: unlimited memories, household sharing, hands-free, offline.
    case plus
}

/// Whether the user may create another memory right now.
public enum MemoryCreationGate: Hashable, Sendable {
    case allowed
    case blocked(limit: Int)

    public var isAllowed: Bool { self == .allowed }
}

/// The rules of the free tier, independent of any store.
public enum MemoryQuota {
    /// Memories a free household can keep.
    public static let freeLimit = 5

    public static func gate(existingCount: Int, tier: SubscriptionTier) -> MemoryCreationGate {
        switch tier {
        case .plus: .allowed
        case .free: existingCount < freeLimit ? .allowed : .blocked(limit: freeLimit)
        }
    }
}

/// Knows the user's tier and answers "can I make another memory?".
public protocol SubscriptionService: Sendable {
    func currentTier() async -> SubscriptionTier
    func canCreateMemory(existingCount: Int) async -> MemoryCreationGate
    func restorePurchases() async throws -> SubscriptionTier
}

public actor MockSubscriptionService: SubscriptionService {
    private var tier: SubscriptionTier

    public init(tier: SubscriptionTier = .free) {
        self.tier = tier
    }

    public func currentTier() async -> SubscriptionTier { tier }

    public func canCreateMemory(existingCount: Int) async -> MemoryCreationGate {
        MemoryQuota.gate(existingCount: existingCount, tier: tier)
    }

    public func restorePurchases() async throws -> SubscriptionTier { tier }

    /// Simulates a purchase or expiry.
    public func setTier(_ newTier: SubscriptionTier) {
        tier = newTier
    }
}
