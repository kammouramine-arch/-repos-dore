import SwiftUI
import DoOnceCore

/// One person: who they are, how to reach them, and everything they showed you.
@MainActor
struct PersonDetailView: View {
    var personID: UUID

    @Environment(AppState.self) private var app
    @Environment(\.openURL) private var openURL

    var body: some View {
        if let person = app.person(personID) {
            let memories = app.memories(taughtBy: person).sorted { $0.createdAt > $1.createdAt }
            PushedScreen {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: DS.Space.s4) {
                        DSAvatar(initials: person.initials, size: 64)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(person.displayName).dsText(.title1).foregroundStyle(DSColor.textPrimary)
                                .accessibilityAddTraits(.isHeader)
                            Text(subtitle(person, count: memories.count)).dsText(.callout).foregroundStyle(DSColor.textSecondary)
                        }
                    }
                    .padding(.top, DS.Space.s5)
                    if let phone = person.contact?.phone {
                        HStack(spacing: DS.Space.s2) {
                            contactButton(L10n.string("object.call"), "phone", url: URL(string: "tel:" + phone.filter { !$0.isWhitespace }))
                            contactButton(L10n.string("object.message"), "message", url: URL(string: "sms:" + phone.filter { !$0.isWhitespace }))
                        }
                        .padding(.top, 18)
                    }
                    DSSectionHeader(title: L10n.string("people.showedYou", ["name": person.displayName])).padding(.top, 28)
                    MemoryRowList(memories: memories, showObject: true)
                }
                .padding(.horizontal, DS.Space.gutter)
            }
        } else {
            EmptyState(symbol: "person", subtitle: L10n.string("people.empty")).padding(.top, DS.Space.s16)
        }
    }

    private func subtitle(_ person: Person, count: Int) -> String {
        [person.contact?.company, person.relationship, L10n.plural("object.procedures", n: count)].compactMap { $0 }.joined(separator: " · ")
    }

    private func contactButton(_ title: String, _ symbol: String, url: URL?) -> some View {
        Button { if let url { openURL(url) } } label: {
            Label(title, systemImage: symbol).frame(maxWidth: .infinity)
        }
        .buttonStyle(.ds(.secondary, size: .small, fullWidth: true))
        .disabled(url == nil)
    }
}
