import SwiftUI
import DoOnceCore

/// DoOnce+: where the free plan stands against its limit, the upgrade, and the App Store doors.
@MainActor
struct SubscriptionView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @Environment(\.openURL) private var openURL
    @State private var tier: SubscriptionTier = .free

    var body: some View {
        PushedScreen {
            VStack(alignment: .leading, spacing: 0) {
                PageTitle(text: L10n.string("subscription.plus")).padding(.top, DS.Space.s2)
                planCard.padding(.top, DS.Space.s5)
                if tier == .free {
                    Button(L10n.string("paywall.headline")) { router.show(.paywall) }
                        .buttonStyle(.dsSignal)
                        .padding(.top, DS.Space.s4)
                }
                DSList {
                    ActionRow(title: L10n.string("paywall.restore")) { restore() }
                    DSSeparator()
                    NavRow(title: L10n.string("subscription.manage")) {
                        if let url = URL(string: "https://apps.apple.com/account/subscriptions") { openURL(url) }
                    }
                }
                .padding(.top, 28)
            }
            .padding(.horizontal, DS.Space.gutter)
        }
        .task { tier = await app.services.subscription.currentTier() }
    }

    private var planCard: some View {
        let used = app.memories.count
        let limit = MemoryQuota.freeLimit
        return VStack(alignment: .leading, spacing: DS.Space.s1) {
            Text(L10n.string(tier == .free ? "subscription.free" : "subscription.plus")).dsText(.headline).foregroundStyle(DSColor.textPrimary)
            if tier == .free {
                Text(L10n.plural("subscription.used", n: limit, ["used": String(min(used, limit))])).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(DSColor.fillMedium)
                        Capsule().fill(DSColor.signal).frame(width: geo.size.width * min(1, Double(used) / Double(limit)))
                    }
                }
                .frame(height: 4)
                .padding(.top, DS.Space.s2)
            } else {
                Text(L10n.string("subscription.plus.sub")).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            }
        }
        .padding(DS.Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DSColor.backgroundElevated, in: RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private func restore() {
        Task {
            if let restored = try? await app.services.subscription.restorePurchases() {
                tier = restored
                HapticsService.shared.play(.success)
            } else {
                HapticsService.shared.play(.error)
            }
        }
    }
}
