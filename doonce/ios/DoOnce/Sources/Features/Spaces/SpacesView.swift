import SwiftUI
import DoOnceCore

/// Where things live: every space as a photograph in a two-column grid, and a way to add one.
@MainActor
struct SpacesView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var creating = false
    @State private var newName = ""

    private let columns = [GridItem(.flexible(), spacing: DS.Space.s3), GridItem(.flexible(), spacing: DS.Space.s3)]

    var body: some View {
        PushedScreen {
            VStack(alignment: .leading, spacing: 0) {
                PageTitle(text: L10n.string("spaces.title")).padding(.top, DS.Space.s2)
                LazyVGrid(columns: columns, spacing: DS.Space.s3) {
                    ForEach(app.spaces) { space in
                        Button { router.push(.space(space.id)) } label: {
                            DSPhotoCard(title: space.name, subtitle: L10n.plural("space.objects", n: app.objects(in: space).count), titleSize: 19) {
                                MediaView(ref: app.coverMedia(for: space))
                            }
                            .frame(height: 170)
                        }
                        .buttonStyle(.dsPressable)
                        .accessibilityLabel(space.name)
                        .accessibilityValue(L10n.plural("space.objects", n: app.objects(in: space).count))
                    }
                }
                .padding(.top, DS.Space.s5)
                Button { newName = ""; creating = true } label: {
                    Label(L10n.string("spaces.new"), systemImage: "plus.square")
                }
                .buttonStyle(.ds(.secondary, fullWidth: true))
                .padding(.top, DS.Space.s4)
            }
            .padding(.horizontal, DS.Space.gutter)
        }
        .alert(L10n.string("spaces.new"), isPresented: $creating) {
            TextField(L10n.string("spaces.title"), text: $newName)
            Button(L10n.string("common.save")) { create(newName) }
            Button(L10n.string("common.cancel"), role: .cancel) {}
        }
    }

    private func create(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        Task {
            try? await app.services.spaces.save(Space(householdID: app.household.id, name: trimmed))
            await app.refresh()
        }
    }
}
