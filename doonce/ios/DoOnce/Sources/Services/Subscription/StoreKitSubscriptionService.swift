import DoOnceCore
import Foundation
import StoreKit

/// DoOnce+ through StoreKit 2.
///
/// The tier is whatever `Transaction.currentEntitlements` says right now (a verified, unrevoked
/// transaction for one of `productIDs` is DoOnce+), so a purchase, a refund or a family-sharing
/// change shows up without any server. `Transaction.updates` is listened to for the app's
/// lifetime so a purchase finished outside the paywall (Ask to Buy, a renewal) is finished and
/// reflected. Products are loaded on demand; the paywall shows what the App Store returns and
/// nothing when it returns nothing.
actor StoreKitSubscriptionService: SubscriptionService {
    enum Failure: LocalizedError {
        case unverified
        case pending
        var errorDescription: String? { L10n.string("paywall.purchaseFailed") }
    }

    let productIDs: [String]
    private(set) var products: [Product] = []
    private var updates: Task<Void, Never>?

    init(productIDs: [String]) {
        self.productIDs = productIDs
        updates = Task { [productIDs] in
            for await result in Transaction.updates {
                guard case .verified(let transaction) = result else { continue }
                if productIDs.contains(transaction.productID) { await transaction.finish() }
            }
        }
    }

    deinit { updates?.cancel() }

    // MARK: Products

    /// The App Store's products for `productIDs`, sorted yearly first. Empty when none are
    /// configured or the store returns none; the paywall then says subscriptions are not available.
    @discardableResult
    func loadProducts() async throws -> [Product] {
        guard !productIDs.isEmpty else { products = []; return [] }
        let loaded = try await Product.products(for: productIDs)
        products = loaded.sorted { Self.rank($0) < Self.rank($1) }
        return products
    }

    /// Buys and returns the tier afterwards. Cancelling returns the current tier without an error.
    func purchase(_ product: Product) async throws -> SubscriptionTier {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            guard case .verified(let transaction) = verification else { throw Failure.unverified }
            await transaction.finish()
            return await currentTier()
        case .userCancelled:
            return await currentTier()
        case .pending:
            // Ask to Buy: the transaction arrives through `Transaction.updates` later.
            return await currentTier()
        @unknown default:
            return await currentTier()
        }
    }

    /// Asks the App Store for the account's transactions again (the "Restore purchases" row).
    func restore() async throws -> SubscriptionTier {
        try await AppStore.sync()
        return await currentTier()
    }

    // MARK: SubscriptionService

    func currentTier() async -> SubscriptionTier {
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            if productIDs.contains(transaction.productID), transaction.revocationDate == nil { return .plus }
        }
        return .free
    }

    func canCreateMemory(existingCount: Int) async -> MemoryCreationGate {
        MemoryQuota.gate(existingCount: existingCount, tier: await currentTier())
    }

    func restorePurchases() async throws -> SubscriptionTier {
        try await restore()
    }

    // MARK: Helpers

    private static func rank(_ product: Product) -> Int {
        switch product.subscription?.subscriptionPeriod.unit {
        case .year?: 0
        case .month?: 1
        case .week?: 2
        case .day?: 3
        default: 4
        }
    }
}

extension Product {
    /// "Try free for 7 days" when the product has an introductory free trial, otherwise nil.
    var freeTrialText: String? {
        guard let offer = subscription?.introductoryOffer, offer.paymentMode == .freeTrial else { return nil }
        return L10n.string("paywall.trialFor", ["period": offer.period.dsDescription])
    }
}

extension Product.SubscriptionPeriod {
    /// "7 days", "1 month", "1 year" through the plural copy keys.
    var dsDescription: String {
        switch unit {
        case .day: L10n.plural("paywall.period.day", n: value)
        case .week: L10n.plural("paywall.period.week", n: value)
        case .month: L10n.plural("paywall.period.month", n: value)
        case .year: L10n.plural("paywall.period.year", n: value)
        @unknown default: String(value)
        }
    }
}
