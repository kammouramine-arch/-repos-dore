import SwiftUI
import DoOnceCore

/// "Continue": the memory you were in the middle of, as a photo card with progress.
@MainActor
struct ContinueSection: View {
    var memory: Memory
    var progress: MemoryProgress

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: L10n.string("memory.continue"))
            Button {
                router.present(.doMode(memoryID: memory.id, startStep: progress.nextStepOrder))
            } label: {
                DSPhotoCard(title: memory.title, subtitle: progressLine, progress: fraction) {
                    MediaView(ref: app.thumbnail(for: memory))
                }
                .frame(height: 210)
            }
            .buttonStyle(.dsPressable)
            .accessibilityIdentifier("memory.continue")
            .accessibilityLabel(memory.title)
            .accessibilityValue(progressLine)
        }
        .padding(.horizontal, DS.Space.gutter)
    }

    private var progressLine: String {
        L10n.fill("memory.continue.progress", ["done": String(progress.completedCount), "total": String(progress.totalSteps)])
    }
    private var fraction: Double { Double(progress.completedCount) / Double(max(progress.totalSteps, 1)) }
}

/// "Recently around you": the objects used last, as tall photo cards.
@MainActor
struct RecentObjectsSection: View {
    var objects: [PhysicalObject]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: L10n.string("memory.recent")).padding(.horizontal, DS.Space.gutter)
            HScroll {
                ForEach(objects) { object in ObjectCardView(object: object) }
            }
        }
    }
}

/// Spaces as photo chips, with a link to the full grid.
@MainActor
struct SpacesChipsSection: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: L10n.string("memory.spaces"), actionTitle: L10n.string("common.seeAll")) { router.push(.spaces) }
                .padding(.horizontal, DS.Space.gutter)
            HScroll {
                ForEach(app.spaces) { space in
                    Button { router.push(.space(space.id)) } label: {
                        PhotoChip(text: space.name, media: app.coverMedia(for: space))
                    }
                    .buttonStyle(.dsPressable)
                }
            }
        }
    }
}

/// People who taught you something, with how many memories each.
@MainActor
struct PeopleChipsSection: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        let people = app.people.filter { !$0.isSelf }
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: L10n.string("memory.people"), actionTitle: L10n.string("common.seeAll")) { router.push(.people) }
                .padding(.horizontal, DS.Space.gutter)
            HScroll {
                ForEach(people) { person in
                    Button { router.push(.person(person.id)) } label: {
                        PersonChip(person: person, count: app.memories(taughtBy: person).count)
                    }
                    .buttonStyle(.dsPressable)
                }
            }
        }
    }
}
