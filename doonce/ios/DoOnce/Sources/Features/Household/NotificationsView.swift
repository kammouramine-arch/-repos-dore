import SwiftUI
import DoOnceCore

/// Notifications: the few that were actually useful, drawn from real memories, and the switches
/// for each kind. Marketing is off unless asked for.
@MainActor
struct NotificationsView: View {
    @Environment(AppState.self) private var app
    @AppStorage("notifications.yearly") private var yearly = true
    @AppStorage("notifications.household") private var household = true
    @AppStorage("notifications.maintenance") private var maintenance = true
    @AppStorage("notifications.tips") private var tips = false

    private struct Item: Identifiable { let id: Int; let title: String; let subtitle: String; let when: String }

    var body: some View {
        PushedScreen {
            VStack(alignment: .leading, spacing: 0) {
                PageTitle(text: L10n.string("settings.notifications")).padding(.top, DS.Space.s2)
                Text(L10n.string("notifications.sub")).dsText(.body).foregroundStyle(DSColor.textSecondary).padding(.top, DS.Space.s2)
                DSList {
                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        if index > 0 { DSSeparator() }
                        NotificationRow(item: item)
                    }
                }
                .padding(.top, 28)
                DSList {
                    ToggleRow(title: L10n.string("notifications.yearly"), isOn: $yearly)
                    DSSeparator()
                    ToggleRow(title: L10n.string("notifications.household"), isOn: $household)
                    DSSeparator()
                    ToggleRow(title: L10n.string("notifications.maintenance"), isOn: $maintenance)
                    DSSeparator()
                    ToggleRow(title: L10n.string("notifications.tips"), subtitle: L10n.string("notifications.tips.sub"), isOn: $tips)
                }
                .padding(.top, 28)
            }
            .padding(.horizontal, DS.Space.gutter)
        }
    }

    /// Three notifications with real values: an ageing memory, something a member added, a routine due.
    private var items: [Item] {
        var result: [Item] = []
        let policy = FreshnessPolicy()
        if let old = policy.memoriesNeedingCheck(in: app.memories).first ?? app.memories.min(by: { $0.lastKnownAccurateAt < $1.lastKnownAccurateAt }) {
            let object = app.object(old.objectID)?.name.lowercased() ?? old.title
            result.append(Item(id: 0,
                               title: L10n.plural("notifications.age.title", n: DSFormat.months(from: old.lastKnownAccurateAt), ["object": object]),
                               subtitle: L10n.string("notifications.age.sub", ["person": app.demonstratorName(for: old)]),
                               when: L10n.string("notifications.today")))
        }
        let others = app.memories.filter { $0.creatorID != app.currentUser.id }.sorted { $0.createdAt > $1.createdAt }
        if let added = others.first ?? app.memories.sorted(by: { $0.createdAt > $1.createdAt }).first {
            let creator = app.snapshot.users.first { $0.id == added.creatorID }?.displayName ?? app.demonstratorName(for: added)
            result.append(Item(id: 1,
                               title: L10n.fill("notifications.added.title", ["person": creator, "title": added.title, "household": app.household.name]),
                               subtitle: [app.space(added.spaceID)?.name, L10n.plural("procedure.steps", n: added.stepCount)].compactMap { $0 }.joined(separator: " · "),
                               when: DSFormat.shortDay(added.createdAt)))
        }
        if let routine = app.inProgress?.memory ?? app.memories.first {
            result.append(Item(id: 2,
                               title: L10n.string("notifications.due.title", ["object": app.object(routine.objectID)?.name ?? routine.title]),
                               subtitle: L10n.string("notifications.due.sub", ["person": app.demonstratorName(for: routine)]),
                               when: DSFormat.shortDay(routine.createdAt)))
        }
        return result
    }

    private struct NotificationRow: View {
        var item: Item
        var body: some View {
            HStack(alignment: .top, spacing: DS.Space.s3) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title).dsText(.headline).foregroundStyle(DSColor.textPrimary).fixedSize(horizontal: false, vertical: true)
                    Text(item.subtitle).dsText(.subheadline).foregroundStyle(DSColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: DS.Space.s2)
                Text(item.when).dsText(.footnote).foregroundStyle(DSColor.textTertiary)
            }
            .padding(.vertical, DS.Space.s3)
            .accessibilityElement(children: .combine)
        }
    }
}
