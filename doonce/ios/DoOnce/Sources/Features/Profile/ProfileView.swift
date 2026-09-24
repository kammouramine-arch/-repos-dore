import SwiftUI
import DoOnceCore

/// The You root: who you are, your household and plan, and the doors to every setting. Grouped
/// lists on the page, no boxes in boxes.
@MainActor
struct ProfileView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var tier: SubscriptionTier = .free

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: DS.Space.s4) {
                identity.padding(.bottom, DS.Space.s2)
                DSList {
                    NavRow(title: L10n.string("household.title"), subtitle: householdLine) { router.push(.household) }
                    DSSeparator()
                    planRow
                }
                DSList {
                    NavRow(title: L10n.string("settings.notifications")) { router.push(.notifications) }
                    DSSeparator()
                    NavRow(title: L10n.string("settings.haptics"), subtitle: HapticsService.shared.policy.displayName) { router.push(.haptics) }
                    DSSeparator()
                    NavRow(title: L10n.string("settings.privacy")) { router.push(.privacy) }
                    DSSeparator()
                    DSRow(title: L10n.string("settings.offline"), subtitle: L10n.plural("you.offline.sub", n: app.objectsDownloaded()), leading: { EmptyView() }, trailing: { EmptyView() })
                        .foregroundStyle(DSColor.textPrimary)
                    DSSeparator()
                    NavRow(title: L10n.string("settings.title")) { router.push(.settings) }
                }
                DSList {
                    NavRow(title: L10n.string("qr.title"), subtitle: L10n.string("qr.you.sub")) { router.push(.qrImport) }
                }
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.top, DS.Space.s2)
            .padding(.bottom, DS.Size.tabBarClearance)
        }
        .background(DSColor.backgroundPrimary.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .task { tier = await app.services.subscription.currentTier() }
    }

    private var identity: some View {
        HStack(spacing: DS.Space.s4) {
            DSAvatar(initials: app.currentUser.displayName.initials, size: 64)
            VStack(alignment: .leading, spacing: 2) {
                Text(app.currentUser.displayName).dsText(.title1).foregroundStyle(DSColor.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                Text([app.household.name, L10n.plural("household.members", n: app.household.members.count)].joined(separator: " · "))
                    .dsText(.callout).foregroundStyle(DSColor.textSecondary)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var householdLine: String {
        [L10n.plural("household.members", n: app.household.members.count),
         L10n.plural("space.objects", n: app.objects.count),
         L10n.plural("memory.memoriesCount", n: app.memories.count)].joined(separator: " · ")
    }

    private var planRow: some View {
        Button {
            if tier == .free { router.show(.paywall) } else { router.push(.subscription) }
        } label: {
            DSRow(title: L10n.string("you.plus"), subtitle: tier == .free ? L10n.plural("you.plus.used", n: app.memories.count) : L10n.string("you.plus.unlimited"), leading: { EmptyView() }) {
                if tier == .free { DSChip(text: L10n.string("common.upgrade"), tone: .signal) } else { DSChevron() }
            }
            .foregroundStyle(DSColor.textPrimary)
        }
        .buttonStyle(.dsRowPressable)
    }
}

extension HapticsPolicy {
    /// "Full", "Reduced", "Off" as shown in Settings.
    var displayName: String {
        switch self {
        case .full: L10n.string("settings.haptics.full")
        case .reduced: L10n.string("settings.haptics.reduced")
        case .off: L10n.string("settings.haptics.off")
        }
    }
}
