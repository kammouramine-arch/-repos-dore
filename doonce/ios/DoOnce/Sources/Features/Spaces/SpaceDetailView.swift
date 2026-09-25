import SwiftUI
import DoOnceCore

/// One space: its photograph as the hero, then the objects that live there as cards.
@MainActor
struct SpaceDetailView: View {
    var spaceID: UUID

    @Environment(AppState.self) private var app

    private let columns = [GridItem(.flexible(), spacing: DS.Space.s3), GridItem(.flexible(), spacing: DS.Space.s3)]

    var body: some View {
        if let space = app.space(spaceID) {
            let objects = app.objects(in: space)
            PushedScreen(onMedia: true) {
                VStack(alignment: .leading, spacing: 0) {
                    PhotoHero(media: app.coverMedia(for: space), title: space.name, subtitle: subtitle(objects), height: 360)
                    LazyVGrid(columns: columns, spacing: DS.Space.s3) {
                        ForEach(objects) { object in
                            ObjectCardView(object: object, width: nil, height: 220)
                        }
                    }
                    .padding(.horizontal, DS.Space.gutter)
                    .padding(.top, DS.Space.s2)
                    if objects.isEmpty {
                        EmptyState(symbol: "shippingbox", title: L10n.plural("space.objects", n: 0)).padding(.top, DS.Space.s10)
                    }
                }
            }
        } else {
            EmptyState(symbol: "questionmark.circle", title: L10n.string("look.unknown.title")).padding(.top, DS.Space.s16)
        }
    }

    private func subtitle(_ objects: [PhysicalObject]) -> String {
        let memories = objects.reduce(0) { $0 + app.memories(for: $1).count }
        return [L10n.plural("space.objects", n: objects.count), L10n.plural("memory.memoriesCount", n: memories)].joined(separator: " · ")
    }
}
