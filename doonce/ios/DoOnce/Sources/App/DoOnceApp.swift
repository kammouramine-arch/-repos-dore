import SwiftUI
import DoOnceCore

@main
struct DoOnceApp: App {
    @State private var appState = AppState()
    @State private var router = Router()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .environment(router)
                .tint(DSColor.signalText)
                .background(DSColor.backgroundPrimary)
                .onOpenURL { url in
                    guard appState.phase == .main else { return }
                    router.open(url: url, app: appState)
                }
        }
    }
}

/// Launch → onboarding (ends on the auth page) → first run → main; a signed-out live build lands
/// on the auth page instead. The launch screen storyboard already paints `backgroundPrimary`, so
/// there is never a white flash. The store loads under the launch animation (`bootstrap`), and
/// the app enters only when both are done.
struct RootView: View {
    @Environment(AppState.self) private var app
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            DSColor.backgroundPrimary.ignoresSafeArea()
            switch app.phase {
            case .launching:
                LaunchView(full: app.launchCount == 0 || app.launchCount % 5 == 0) { app.finishLaunch() }
                    .transition(.opacity)
            case .onboarding:
                OnboardingView {
                    withDSAnimation(DSMotion.gentle) { app.isOnboarded = true; app.phase = app.hasSavedFirstMemory ? .main : .firstRun }
                }
                .transition(.opacity)
            case .auth:
                AuthView().transition(.opacity)
            case .firstRun:
                FirstRunView().transition(.opacity)
            case .main:
                MainView().transition(.opacity)
            }
        }
        .task { await app.bootstrap() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { app.haptics.prepare() }
        }
    }
}
