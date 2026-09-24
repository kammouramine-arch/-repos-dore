import SwiftUI
import DoOnceCore

/// The paywall: one promise, five things DoOnce+ does, two honest plans (yearly preselected, the
/// saving stated), a trial, and a way out that is just as easy. No countdowns, no guilt.
@MainActor
struct PaywallView: View {
    private enum Plan { case yearly, monthly }

    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var plan: Plan = .yearly
    @State private var purchasing = false

    // Placeholder prices until StoreKit products are loaded; never copy, so not in strings.json.
    private let yearlyPrice = "€59.99"
    private let yearlyPerMonth = "€5"
    private let monthlyPrice = "€7.99"

    private let features: [(key: String, symbol: String?)] = [
        ("paywall.f1", nil), ("paywall.f2", "viewfinder"), ("paywall.f3", "house"), ("paywall.f4", "ear"), ("paywall.f5", "arrow.down.to.line"),
    ]

    var body: some View {
        ZStack(alignment: .top) {
            DSColor.backgroundPrimary.ignoresSafeArea()
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    DSLoopMark(size: 48, color: DSColor.signalText).padding(.top, DS.Space.s2)
                    Text(L10n.string("paywall.headline")).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary)
                        .padding(.top, 14)
                        .accessibilityAddTraits(.isHeader)
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(features, id: \.key) { feature in
                            HStack(spacing: 14) {
                                if let symbol = feature.symbol {
                                    Image(systemName: symbol).font(.system(size: 20, weight: .medium)).foregroundStyle(DSColor.signalText).frame(width: 28)
                                } else {
                                    DSLoopMark(size: 22, color: DSColor.signalText).frame(width: 28)
                                }
                                Text(L10n.string(feature.key)).dsText(.body).foregroundStyle(DSColor.textPrimary)
                            }
                            .frame(minHeight: 46)
                            .accessibilityElement(children: .combine)
                        }
                    }
                    .padding(.top, DS.Space.s5)
                    VStack(spacing: DS.Space.s2) {
                        PlanRow(name: L10n.string("paywall.yearlyName"),
                                price: [L10n.string("paywall.yearly", ["price": yearlyPrice]), L10n.string("paywall.monthly", ["price": yearlyPerMonth])].joined(separator: " · "),
                                badge: L10n.string("paywall.save"), selected: plan == .yearly) { select(.yearly) }
                        PlanRow(name: L10n.string("paywall.monthlyName"), price: L10n.string("paywall.monthly", ["price": monthlyPrice]), badge: nil, selected: plan == .monthly) { select(.monthly) }
                    }
                    .padding(.top, DS.Space.s5)
                    Button(L10n.string("paywall.trial")) { subscribe() }
                        .buttonStyle(.dsPrimary)
                        .disabled(purchasing)
                        .padding(.top, DS.Space.s5)
                    Button(L10n.string("paywall.notNow")) { dismiss() }
                        .buttonStyle(.ds(.ghost, fullWidth: true))
                    Text([L10n.string("paywall.cancel"), L10n.string("paywall.restore") + "."].joined(separator: " "))
                        .dsText(.caption).foregroundStyle(DSColor.textTertiary)
                        .multilineTextAlignment(.center).frame(maxWidth: .infinity)
                        .padding(.top, DS.Space.s4)
                }
                .padding(.horizontal, DS.Space.gutter)
                .dsTopBarInset()
                .padding(.bottom, DS.Space.s10)
            }
            DSTopBar(leading: .close, onLeading: { dismiss() })
        }
    }

    private func select(_ new: Plan) {
        HapticsService.shared.play(.selection)
        withDSAnimation(DSMotion.snappy) { plan = new }
    }

    /// Mock purchase: flips the mock subscription to DoOnce+ and settles with a success haptic.
    private func subscribe() {
        purchasing = true
        Task {
            if let mock = app.services.subscription as? MockSubscriptionService { await mock.setTier(.plus) }
            HapticsService.shared.play(.success)
            purchasing = false
            dismiss()
        }
    }
}

/// One plan: name, price line, optional saving badge, a stroke when chosen.
@MainActor
private struct PlanRow: View {
    var name: String
    var price: String
    var badge: String?
    var selected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: DS.Space.s3) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name).dsText(.headline).foregroundStyle(DSColor.textPrimary)
                    Text(price).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
                }
                Spacer(minLength: 0)
                if let badge { DSChip(text: badge, tone: .signal) }
            }
            .padding(.horizontal, DS.Space.s4).padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? DSColor.backgroundElevated : Color.clear, in: RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous).strokeBorder(selected ? DSColor.textPrimary : DSColor.separatorStrong, lineWidth: selected ? 1.5 : 1))
        }
        .buttonStyle(.dsPressable)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
