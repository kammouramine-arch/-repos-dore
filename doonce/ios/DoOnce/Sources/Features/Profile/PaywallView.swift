import SwiftUI
import StoreKit
import DoOnceCore

/// The paywall: one promise, five things DoOnce+ does, two honest plans (yearly preselected, the
/// saving stated), a trial, and a way out that is just as easy. No countdowns, no guilt.
///
/// Live mode shows the App Store's own prices and trial (`Product.displayPrice`,
/// `introductoryOffer`); while they load, quiet skeleton rows; when there are none, a calm
/// "not available yet" instead of a made-up price. Demo mode keeps the mock plans, marked "Demo".
@MainActor
struct PaywallView: View {
    /// What the plan list is showing.
    private enum Catalog: Equatable {
        case loading
        case ready([Product])
        case unavailable
        case demo
    }

    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var catalog: Catalog = .loading
    @State private var selectedID: String?
    @State private var purchasing = false
    @State private var error: String?

    /// Demo plans. Placeholder prices, never copy, so not in strings.json.
    private static let demoPlans: [(id: String, nameKey: String, price: String, perMonth: String?)] = [
        ("demo.yearly", "paywall.yearlyName", "€59.99", "€5"),
        ("demo.monthly", "paywall.monthlyName", "€7.99", nil),
    ]

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
                    featureList.padding(.top, DS.Space.s5)
                    plans.padding(.top, DS.Space.s5)
                    if let error {
                        Text(error).dsText(.footnote).foregroundStyle(DSColor.danger)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, DS.Space.s3)
                    }
                    if catalog != .unavailable {
                        Button(ctaText) { subscribe() }
                            .buttonStyle(.dsPrimary)
                            .disabled(purchasing || catalog == .loading)
                            .padding(.top, DS.Space.s5)
                    }
                    Button(L10n.string("paywall.notNow")) { dismiss() }
                        .buttonStyle(.ds(.ghost, fullWidth: true))
                        .padding(.top, catalog == .unavailable ? DS.Space.s5 : 0)
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
        .task { await load() }
        .dsAnimation(DSMotion.standard(0.2), value: catalog)
    }

    // MARK: Sections

    private var featureList: some View {
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
    }

    @ViewBuilder
    private var plans: some View {
        switch catalog {
        case .loading:
            VStack(spacing: DS.Space.s2) {
                PlanRow(name: L10n.string("paywall.yearlyName"), price: "—— / ——", badge: nil, chip: nil, selected: true) {}
                PlanRow(name: L10n.string("paywall.monthlyName"), price: "—— / ——", badge: nil, chip: nil, selected: false) {}
            }
            .redacted(reason: .placeholder)
            .disabled(true)
            .accessibilityHidden(true)
        case .ready(let products):
            VStack(spacing: DS.Space.s2) {
                ForEach(products, id: \.id) { product in
                    PlanRow(name: name(of: product), price: priceLine(for: product), badge: saving(for: product, among: products), chip: nil, selected: selectedID == product.id) {
                        select(product.id)
                    }
                }
            }
        case .unavailable:
            VStack(alignment: .leading, spacing: DS.Space.s1) {
                Text(L10n.string("paywall.unavailable.title")).dsText(.headline).foregroundStyle(DSColor.textPrimary)
                Text(L10n.string("paywall.unavailable.sub")).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            }
            .padding(DS.Space.s4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DSColor.backgroundElevated, in: RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            .accessibilityElement(children: .combine)
        case .demo:
            VStack(spacing: DS.Space.s2) {
                ForEach(Self.demoPlans, id: \.id) { plan in
                    let price = plan.perMonth.map { [L10n.string("paywall.yearly", ["price": plan.price]), L10n.string("paywall.monthly", ["price": $0])].joined(separator: " · ") }
                        ?? L10n.string("paywall.monthly", ["price": plan.price])
                    PlanRow(name: L10n.string(plan.nameKey), price: price, badge: plan.perMonth != nil ? L10n.string("paywall.save") : nil,
                            chip: L10n.string("paywall.demo"), selected: selectedID == plan.id) { select(plan.id) }
                }
            }
        }
    }

    private var ctaText: String {
        if case .ready(let products) = catalog, let product = products.first(where: { $0.id == selectedID }) {
            return product.freeTrialText ?? L10n.string("paywall.subscribe")
        }
        return L10n.string("paywall.trial")
    }

    // MARK: Product copy

    private func name(of product: Product) -> String {
        switch product.subscription?.subscriptionPeriod.unit {
        case .year?: L10n.string("paywall.yearlyName")
        case .month?: L10n.string("paywall.monthlyName")
        default: product.displayName
        }
    }

    /// "€59.99 / year · €5.00 / month" for a yearly plan, "€7.99 / month" for a monthly one.
    private func priceLine(for product: Product) -> String {
        guard let period = product.subscription?.subscriptionPeriod else { return product.displayPrice }
        switch period.unit {
        case .year:
            let perMonth = (product.price / Decimal(12 * period.value)).formatted(product.priceFormatStyle)
            return [L10n.string("paywall.yearly", ["price": product.displayPrice]), L10n.string("paywall.monthly", ["price": perMonth])].joined(separator: " · ")
        case .month where period.value == 1:
            return L10n.string("paywall.monthly", ["price": product.displayPrice])
        default:
            return "\(product.displayPrice) / \(period.dsDescription)"
        }
    }

    /// "Save 30%" on the yearly plan, computed from the real prices; nil without a monthly plan.
    private func saving(for product: Product, among products: [Product]) -> String? {
        guard product.subscription?.subscriptionPeriod.unit == .year,
              let monthly = products.first(where: { $0.subscription?.subscriptionPeriod.unit == .month }) else { return nil }
        let yearOfMonthly = monthly.price * 12
        guard yearOfMonthly > 0, product.price < yearOfMonthly else { return nil }
        let percent = NSDecimalNumber(decimal: (yearOfMonthly - product.price) / yearOfMonthly * 100).intValue
        return percent > 0 ? L10n.string("paywall.savePercent", ["n": String(percent)]) : nil
    }

    // MARK: Actions

    private func load() async {
        guard catalog == .loading else { return }
        if let store = app.services.subscription as? StoreKitSubscriptionService {
            let products = (try? await store.loadProducts()) ?? []
            catalog = products.isEmpty ? .unavailable : .ready(products)
            selectedID = products.first?.id
        } else {
            catalog = .demo
            selectedID = Self.demoPlans.first?.id
        }
    }

    private func select(_ id: String) {
        HapticsService.shared.play(.selection)
        withDSAnimation(DSMotion.snappy) { selectedID = id }
    }

    /// Live: a StoreKit purchase of the selected product. Demo: flips the mock to DoOnce+.
    private func subscribe() {
        guard !purchasing else { return }
        purchasing = true
        error = nil
        Task {
            defer { purchasing = false }
            do {
                let tier: SubscriptionTier
                if let store = app.services.subscription as? StoreKitSubscriptionService,
                   case .ready(let products) = catalog, let product = products.first(where: { $0.id == selectedID }) {
                    tier = try await store.purchase(product)
                } else if let mock = app.services.subscription as? MockSubscriptionService {
                    await mock.setTier(.plus)
                    tier = .plus
                } else {
                    return
                }
                guard tier == .plus else { return }
                await app.services.analytics.track(.subscriptionConversion(tier: tier))
                HapticsService.shared.play(.success)
                dismiss()
            } catch {
                HapticsService.shared.play(.error)
                self.error = L10n.string("paywall.purchaseFailed")
            }
        }
    }
}

/// One plan: name, price line, optional saving badge, optional "Demo" chip, a stroke when chosen.
@MainActor
private struct PlanRow: View {
    var name: String
    var price: String
    var badge: String?
    var chip: String?
    var selected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: DS.Space.s3) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name).dsText(.headline).foregroundStyle(DSColor.textPrimary)
                    HStack(spacing: DS.Space.s2) {
                        Text(price).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
                        if let chip { DSChip(text: chip, tone: .neutral).scaleEffect(0.8, anchor: .leading) }
                    }
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
