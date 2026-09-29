import SwiftUI
import DoOnceCore

/// The shell: two stacks (Memory, You), a floating glass bar with the centre action, and the
/// full-screen / sheet presenters. The centre control blooms into Look / Teach / Add.
struct MainView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        @Bindable var router = router
        ZStack(alignment: .bottom) {
            Group {
                switch router.tab {
                case .memory:
                    NavigationStack(path: $router.memoryPath) { MemoryHomeView().navigationDestination(for: Route.self) { RouteView(route: $0) } }
                case .you:
                    NavigationStack(path: $router.youPath) { ProfileView().navigationDestination(for: Route.self) { RouteView(route: $0) } }
                }
            }
            .toolbar(.hidden, for: .navigationBar)

            if router.isBloomOpen {
                BloomOverlay().transition(.opacity).zIndex(1)
            }
            if router.isAtRoot {
                FloatingTabBar()
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(2)
            }
        }
        .animation(DSMotion.gentle, value: router.isAtRoot)
        .ignoresSafeArea(.keyboard)
        .fullScreenCover(item: $router.fullScreen) { route in
            FullScreenRouteView(route: route)
                .environment(app).environment(router)
                .sheet(item: $router.coverSheet) { sheet in
                    SheetRouteView(route: sheet).environment(app).environment(router)
                }
        }
        .sheet(item: $router.sheet) { route in
            SheetRouteView(route: route).environment(app).environment(router)
        }
    }
}

/// Memory — ◉ — You. Liquid Glass capsule; the centre action is the heart of the product.
struct FloatingTabBar: View {
    @Environment(Router.self) private var router
    @Environment(AppState.self) private var app

    var body: some View {
        HStack(spacing: 6) {
            tab(.memory, label: L10n.string("nav.memory")) { DSLoopMark(size: 26, color: router.tab == .memory ? DSColor.textPrimary : DSColor.textTertiary) }
            CenterActionButton(isOpen: router.isBloomOpen) {
                app.haptics.play(.light)
                withDSAnimation(DSMotion.lively) { router.isBloomOpen.toggle() }
            }
            .accessibilityIdentifier("center.action")
            .padding(.horizontal, 8)
            tab(.you, label: L10n.string("nav.you")) { Image(systemName: "person").font(.system(size: 24, weight: .regular)) }
        }
        .padding(.horizontal, 12)
        .frame(height: DS.Size.navHeight)
        .dsGlassCapsule(.navigation)
        .padding(.bottom, DS.Space.s2)
        .accessibilityElement(children: .contain)
    }

    private func tab<Icon: View>(_ t: Tab, label: String, @ViewBuilder icon: () -> Icon) -> some View {
        Button {
            guard router.tab != t else { router.popToRoot(); return }
            app.haptics.play(.selection)
            withDSAnimation(DSMotion.crossfade) { router.tab = t }
        } label: {
            VStack(spacing: 3) {
                icon().frame(height: 26)
                Text(label).font(.system(size: 11, weight: .semibold))
            }
            .foregroundStyle(router.tab == t ? DSColor.textPrimary : DSColor.textTertiary)
            .frame(width: 88, height: 60)
            .contentShape(Rectangle())
        }
        .buttonStyle(DSPressableStyle(scale: 0.94))
        .accessibilityIdentifier(t == .memory ? "tab.memory" : "tab.you")
    }
}

/// ◉ — an aperture: ink disc, thin ring, signal dot. Morphs into × when the bloom is open.
struct CenterActionButton: View {
    var isOpen: Bool
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            ZStack {
                Circle().fill(DSColor.backgroundInverse)
                Circle().strokeBorder(DSColor.textOnInverse.opacity(0.5), lineWidth: 1.5).padding(5)
                    .scaleEffect(isOpen ? 1.5 : 1).opacity(isOpen ? 0 : 1)
                Circle().fill(DSColor.signal).frame(width: 12, height: 12).scaleEffect(isOpen ? 0 : 1)
                Image(systemName: "xmark").font(.system(size: 20, weight: .semibold)).foregroundStyle(DSColor.textOnInverse)
                    .opacity(isOpen ? 1 : 0).rotationEffect(.degrees(isOpen ? 0 : -45))
            }
            .frame(width: DS.Size.centerAction, height: DS.Size.centerAction)
            .shadow(color: DSColor.shadow, radius: 8, y: 6)
            .animation(DSMotion.gentle, value: isOpen)
        }
        .buttonStyle(DSPressableStyle(scale: 0.92))
        .accessibilityLabel(isOpen ? L10n.string("common.close") : L10n.string("center.action"))
    }
}

/// The centre menu: Look, Teach, Add bloom from the control in an arc, scale + blur, staggered 40 ms.
struct BloomOverlay: View {
    @Environment(Router.self) private var router
    @Environment(AppState.self) private var app
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    /// The two things DoOnce is for, as equals: show it how something is done, or look at something
    /// to get that back. Saving an object without instructions is a quieter, secondary action.
    private struct Primary: Identifiable { let id: Int; let identifier: String; let title: String; let subtitle: String; let symbol: String; let offset: CGSize; let signal: Bool; let route: FullScreenRoute }

    private var primaries: [Primary] {[
        Primary(id: 0, identifier: "center.teach", title: L10n.string("center.teach"), subtitle: L10n.string("center.teach.sub"), symbol: "record.circle", offset: CGSize(width: -86, height: -150), signal: true, route: .teach(objectID: nil)),
        Primary(id: 1, identifier: "center.look", title: L10n.string("center.look"), subtitle: L10n.string("center.look.sub"), symbol: "viewfinder", offset: CGSize(width: 86, height: -150), signal: false, route: .look),
    ]}

    var body: some View {
        ZStack(alignment: .bottom) {
            DSColor.scrimMedia.ignoresSafeArea()
                .background(.ultraThinMaterial.opacity(shown ? 1 : 0))
                .onTapGesture { withDSAnimation(DSMotion.snappy) { router.isBloomOpen = false } }
            ZStack {
                ForEach(primaries) { item in
                    Button { open(item.route) } label: {
                        VStack(spacing: 8) {
                            Image(systemName: item.symbol).font(.system(size: 32, weight: .medium))
                                .foregroundStyle(item.signal ? DSColor.textOnSignal : DSColor.textPrimary)
                                .frame(width: 84, height: 84)
                                .background(item.signal ? DSColor.signal : DSColor.backgroundElevated, in: Circle())
                                .shadow(color: DSColor.shadow, radius: 16, y: 8)
                            Text(item.title).font(.system(size: 17, weight: .semibold)).foregroundStyle(DSColor.textOnMedia)
                            Text(item.subtitle).font(.system(size: 13)).foregroundStyle(DSColor.textOnMedia.opacity(0.75))
                                .multilineTextAlignment(.center).frame(width: 140)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .buttonStyle(DSPressableStyle(scale: 0.94))
                    .accessibilityIdentifier(item.identifier)
                    .accessibilityHint(item.subtitle)
                    .modifier(BloomEntrance(shown: shown, offset: item.offset, delay: Double(item.id) * 0.04, reduceMotion: reduceMotion))
                }
                saveObjectOnly
                    .modifier(BloomEntrance(shown: shown, offset: CGSize(width: 0, height: -24), delay: 0.1, reduceMotion: reduceMotion))
            }
            .padding(.bottom, DS.Size.navHeight + 40)
        }
        .onAppear { shown = true }
        .onDisappear { shown = false }
    }

    /// Secondary: "Save object only — save something now, add instructions later."
    private var saveObjectOnly: some View {
        Button { open(.addObject(existingObjectID: nil)) } label: {
            HStack(spacing: 10) {
                Image(systemName: "plus.square").font(.system(size: 17, weight: .medium))
                VStack(alignment: .leading, spacing: 1) {
                    Text(L10n.string("center.add")).font(.system(size: 15, weight: .semibold))
                    Text(L10n.string("center.add.sub")).font(.system(size: 12)).opacity(0.75)
                }
            }
            .foregroundStyle(DSColor.textOnMedia)
            .padding(.leading, 14).padding(.trailing, 18).padding(.vertical, 10)
            .background { DSGlass(style: .onMedia).clipShape(Capsule()) }
        }
        .buttonStyle(DSPressableStyle(scale: 0.96))
        .accessibilityIdentifier("center.add")
        .accessibilityHint(L10n.string("center.add.sub"))
    }

    private func open(_ route: FullScreenRoute) {
        app.haptics.play(.selection)
        Task {
            let granted = await PermissionsService.status(.camera) == .granted
            if granted { router.present(route) }
            else { router.isBloomOpen = false; router.show(.permission(.camera, then: route)) }
        }
    }
}

/// Items leave the centre button and settle into place; a crossfade under Reduce Motion.
private struct BloomEntrance: ViewModifier {
    var shown: Bool
    var offset: CGSize
    var delay: Double
    var reduceMotion: Bool

    func body(content: Content) -> some View {
        content
            .offset(shown ? offset : .zero)
            .scaleEffect(shown ? 1 : 0.5)
            .opacity(shown ? 1 : 0)
            .blur(radius: shown || reduceMotion ? 0 : 8)
            .animation((reduceMotion ? DSMotion.crossfade : DSMotion.lively).delay(delay), value: shown)
    }
}
