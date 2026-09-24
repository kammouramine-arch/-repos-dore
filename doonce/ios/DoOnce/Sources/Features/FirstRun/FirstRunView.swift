import SwiftUI
import DoOnceCore

/// The first-use introduction: teach DoOnce one thing, right now. Example chips make the ask
/// concrete; "Look around first" lets people explore an empty Memory instead.
///
/// This phase sits outside `MainView`, so the view hosts its own sheet and full-screen presenters
/// for the permission education and the Teach surface it launches.
@MainActor
struct FirstRunView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var selected: String?

    var body: some View {
        @Bindable var router = router
        VStack(alignment: .leading, spacing: 0) {
            DSLoopMark(size: 40)
                .padding(.top, DS.Space.s8)
            Text(L10n.string("firstRun.title")).dsText(.largeTitle).fontWeight(.heavy).foregroundStyle(DSColor.textPrimary)
                .padding(.top, 60)
                .accessibilityAddTraits(.isHeader)
            Text(L10n.string("firstRun.sub")).dsText(.title3).fontWeight(.regular).foregroundStyle(DSColor.textSecondary)
                .padding(.top, 10)
            ExampleChips(items: L10n.list("firstRun.examples"), selected: $selected)
                .padding(.top, 28)
            Spacer(minLength: DS.Space.s6)
            Button {
                startTeaching()
            } label: {
                Label(L10n.string("firstRun.cta"), systemImage: "record.circle")
            }
            .buttonStyle(.dsSignal)
            Button(L10n.string("firstRun.later")) {
                withDSAnimation(DSMotion.gentle) { app.phase = .main }
            }
            .buttonStyle(.ds(.ghost, fullWidth: true))
            .padding(.top, 10)
        }
        .padding(.horizontal, 28)
        .padding(.bottom, DS.Space.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(DSColor.backgroundPrimary.ignoresSafeArea())
        .sheet(item: $router.sheet) { route in
            SheetRouteView(route: route).environment(app).environment(router)
        }
        .fullScreenCover(item: $router.fullScreen, onDismiss: enterMainIfRemembered) { route in
            FullScreenRouteView(route: route)
                .environment(app).environment(router)
                .sheet(item: $router.coverSheet) { sheet in
                    SheetRouteView(route: sheet).environment(app).environment(router)
                }
        }
    }

    /// The first memory was saved inside the Teach cover: the world now has something in it, so the
    /// shell takes over with the new object on the Memory home.
    private func enterMainIfRemembered() {
        guard app.hasSavedFirstMemory else { return }
        withDSAnimation(DSMotion.gentle) { app.phase = .main }
    }

    private func startTeaching() {
        Task {
            let status = await PermissionsService.status(.camera)
            if status == .granted {
                router.present(.teach(objectID: nil))
            } else {
                router.show(.permission(.camera, then: .teach(objectID: nil)))
            }
        }
    }
}

/// Wrapping row of selectable chips. Selection is a hint for Teach, so it plays the selection tick.
@MainActor
struct ExampleChips: View {
    var items: [String]
    @Binding var selected: String?

    var body: some View {
        WrapLayout(spacing: DS.Space.s2) {
            ForEach(items, id: \.self) { item in
                Button {
                    HapticsService.shared.play(.selection)
                    withDSAnimation(DSMotion.snappy) { selected = selected == item ? nil : item }
                } label: {
                    DSChip(text: item, tone: selected == item ? .selected : .neutral)
                }
                .buttonStyle(.dsPressable)
                .accessibilityAddTraits(selected == item ? .isSelected : [])
            }
        }
    }
}
