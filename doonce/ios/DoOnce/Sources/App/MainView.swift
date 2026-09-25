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
        .accessibilityLabel(isOpen ? L10n.string("common.close") : "Look, Teach or Add")
    }
}

/// The centre menu: Look, Teach, Add bloom from the control in an arc, scale + blur, staggered 40 ms.
struct BloomOverlay: View {
    @Environment(Router.self) private var router
    @Environment(AppState.self) private var app
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    private struct Item: Identifiable { let id: Int; let title: String; let subtitle: String; let symbol: String; let offset: CGSize; let signal: Bool; let route: FullScreenRoute; let permission: PermissionKind }

    private var items: [Item] {[
        Item(id: 0, title: L10n.string("center.look"), subtitle: L10n.string("center.look.sub"), symbol: "viewfinder", offset: CGSize(width: -118, height: -118), signal: false, route: .look, permission: .camera),
        Item(id: 1, title: L10n.string("center.teach"), subtitle: L10n.string("center.teach.sub"), symbol: "record.circle", offset: CGSize(width: 0, height: -176), signal: true, route: .teach(objectID: nil), permission: .camera),
        Item(id: 2, title: L10n.string("center.add"), subtitle: L10n.string("center.add.sub"), symbol: "plus.square", offset: CGSize(width: 118, height: -118), signal: false, route: .addObject(existingObjectID: nil), permission: .camera),
    ]}

    var body: some View {
        ZStack(alignment: .bottom) {
            DSColor.scrimMedia.ignoresSafeArea()
                .background(.ultraThinMaterial.opacity(shown ? 1 : 0))
                .onTapGesture { withDSAnimation(DSMotion.snappy) { router.isBloomOpen = false } }
            ZStack {
                ForEach(items) { item in
                    Button {
                        app.haptics.play(.selection)
                        Task {
                            let granted = await PermissionsService.status(item.permission) == .granted
                            if granted { router.present(item.route) }
                            else { router.isBloomOpen = false; router.show(.permission(item.permission, then: item.route)) }
                        }
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: item.symbol).font(.system(size: 28, weight: .medium))
                                .foregroundStyle(item.signal ? DSColor.textOnSignal : DSColor.textPrimary)
                                .frame(width: 72, height: 72)
                                .background(item.signal ? DSColor.signal : DSColor.backgroundElevated, in: Circle())
                                .shadow(color: DSColor.shadow, radius: 16, y: 8)
                            Text(item.title).font(.system(size: 15, weight: .semibold)).foregroundStyle(DSColor.textOnMedia)
                            Text(item.subtitle).font(.system(size: 12)).foregroundStyle(DSColor.textOnMedia.opacity(0.7)).multilineTextAlignment(.center).frame(width: 110)
                        }
                    }
                    .buttonStyle(DSPressableStyle(scale: 0.94))
                    .accessibilityIdentifier(["center.look", "center.teach", "center.add"][item.id])
                    .offset(shown ? item.offset : .zero)
                    .scaleEffect(shown ? 1 : 0.5)
                    .opacity(shown ? 1 : 0)
                    .blur(radius: shown || reduceMotion ? 0 : 8)
                    .animation((reduceMotion ? DSMotion.crossfade : DSMotion.lively).delay(Double(item.id) * 0.04), value: shown)
                }
            }
            .padding(.bottom, DS.Size.navHeight + 40)
        }
        .onAppear { shown = true }
        .onDisappear { shown = false }
    }
}
