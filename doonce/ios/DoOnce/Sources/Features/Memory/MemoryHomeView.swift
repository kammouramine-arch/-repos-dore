import SwiftUI
import DoOnceCore

/// The Memory root: an editorial greeting, one search field, and the household's world in photos:
/// what you were doing, what's around you, where things are, who showed you, and the timeline.
/// Empty until the first memory; a quiet banner when offline.
@MainActor
struct MemoryHomeView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @Namespace private var zoom

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                if app.isOffline {
                    OfflineBanner().padding(.horizontal, DS.Space.gutter).padding(.bottom, DS.Space.s4)
                }
                header.padding(.horizontal, DS.Space.gutter)
                DSSearchField(
                    placeholder: L10n.string("memory.search.placeholder"),
                    onTap: { router.push(.search(initialQuery: "")) },
                    onVoice: { router.push(.search(initialQuery: L10n.list("search.suggestions").dropFirst(2).first ?? "")) },
                    onCamera: { router.present(.look) }
                )
                .padding(.horizontal, DS.Space.gutter)
                .padding(.top, DS.Space.s5)

                if app.objects.isEmpty {
                    emptyState.padding(.top, 80)
                } else {
                    sections
                }
            }
            .padding(.top, DS.Space.s2)
            .padding(.bottom, DS.Size.tabBarClearance)
        }
        .background(DSColor.backgroundPrimary.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .onAppear { ZoomTransition.namespace = zoom }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(L10n.string("memory.greeting")).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary)
                .accessibilityAddTraits(.isHeader)
            Text(subtitle).dsText(.body).foregroundStyle(DSColor.textSecondary)
        }
    }

    private var subtitle: String {
        let things = L10n.plural("memory.count", n: app.objects.count)
        guard !app.objects.isEmpty else { return things }
        return [things, L10n.plural("memory.spacesCount", n: app.spaces.count), L10n.plural("memory.memoriesCount", n: app.memories.count)]
            .joined(separator: " · ")
    }

    private var sections: some View {
        VStack(alignment: .leading, spacing: 28) {
            if let current = app.inProgress {
                ContinueSection(memory: current.memory, progress: current.progress)
            }
            RecentObjectsSection(objects: recentObjects)
            SpacesChipsSection()
            if app.people.contains(where: { !$0.isSelf }) { PeopleChipsSection() }
            TimelineSection(memories: app.memories)
        }
        .padding(.top, 28)
    }

    private var recentObjects: [PhysicalObject] {
        Array(app.objects.sorted { ($0.lastUsedAt ?? $0.createdAt) > ($1.lastUsedAt ?? $1.createdAt) }.prefix(5))
    }

    private var emptyState: some View {
        EmptyState(title: L10n.string("memory.empty.title"), subtitle: L10n.string("memory.empty.sub")) {
            Button(L10n.string("memory.empty.cta")) {
                Task {
                    if await PermissionsService.status(.camera) == .granted { router.present(.teach(objectID: nil)) }
                    else { router.show(.permission(.camera, then: .teach(objectID: nil))) }
                }
            }
            .buttonStyle(.ds(.signal))
        }
    }
}
