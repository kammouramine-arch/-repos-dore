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
        }
    }
}

/// Launch → onboarding → first run → main. The launch screen storyboard already paints
/// `backgroundPrimary`, so there is never a white flash.
struct RootView: View {
    @Environment(AppState.self) private var app
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            DSColor.backgroundPrimary.ignoresSafeArea()
            switch app.phase {
            case .launching:
                LaunchView(full: app.launchCount == 0 || app.launchCount % 5 == 0) {
                    app.launchCount += 1
                    withDSAnimation(DSMotion.gentle) { app.phase = app.isOnboarded ? (app.hasSavedFirstMemory ? .main : .firstRun) : .onboarding }
                }
                .transition(.opacity)
            case .onboarding:
                OnboardingView { withDSAnimation(DSMotion.gentle) { app.isOnboarded = true; app.phase = .firstRun } }
                    .transition(.opacity)
            case .firstRun:
                FirstRunView().transition(.opacity)
            case .main:
                MainView().transition(.opacity)
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { app.haptics.prepare() }
        }
    }
}
