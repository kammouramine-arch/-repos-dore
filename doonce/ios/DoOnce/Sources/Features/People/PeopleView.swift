import SwiftUI
import DoOnceCore

/// Who taught you: one row per person with what they are to you and how much they showed you.
/// People appear only when a memory names them, so the empty state explains that.
@MainActor
struct PeopleView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        let people = app.people.filter { !$0.isSelf }
        PushedScreen {
            VStack(alignment: .leading, spacing: 0) {
                PageTitle(text: L10n.string("memory.people")).padding(.top, DS.Space.s2)
                if people.isEmpty {
                    EmptyState(symbol: "person", subtitle: L10n.string("people.empty")).padding(.top, 80)
                } else {
                    DSList {
                        ForEach(Array(people.enumerated()), id: \.element.id) { index, person in
                            if index > 0 { DSSeparator() }
                            Button { router.push(.person(person.id)) } label: {
                                DSRow(title: person.displayName, subtitle: subtitle(person)) {
                                    DSAvatar(initials: person.initials)
                                }
                                .foregroundStyle(DSColor.textPrimary)
                            }
                            .buttonStyle(.dsRowPressable)
                        }
                    }
                    .padding(.top, DS.Space.s5)
                }
            }
            .padding(.horizontal, DS.Space.gutter)
        }
    }

    private func subtitle(_ person: Person) -> String {
        [person.relationship, L10n.plural("object.procedures", n: app.memories(taughtBy: person).count)].compactMap { $0 }.joined(separator: " · ")
    }
}
