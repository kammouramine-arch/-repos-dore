import SwiftUI
import AuthenticationServices
import DoOnceCore

/// The last onboarding page and the standalone sign-in screen: the mark, one promise, and Sign in
/// with Apple. Email is the quiet alternative.
///
/// Authentication is MOCKED: there is no `AuthService` wired into `AppState` yet, so both paths
/// finish onboarding whether the Apple sheet succeeds or fails (it always fails on the simulator).
@MainActor
struct AuthContent: View {
    var onFinished: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSLoopMark(size: 40)
                .padding(.top, 70)
            Spacer(minLength: DS.Space.s6)
            Text(L10n.string("onboarding.end.headline")).dsText(.display).foregroundStyle(DSColor.textPrimary)
                .accessibilityAddTraits(.isHeader)
                .padding(.bottom, 28)
            SignInWithAppleButton(.continue) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { _ in
                // MOCK: success and failure both complete onboarding until a real AuthService exists.
                HapticsService.shared.play(.light)
                onFinished()
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: DS.Size.touchComfort)
            .clipShape(Capsule())
            .accessibilityLabel(L10n.string("auth.apple"))
            Button(L10n.string("auth.email")) { onFinished() }
                .buttonStyle(.ds(.ghost, fullWidth: true))
                .padding(.top, 10)
            Text(L10n.string("auth.legal")).dsText(.caption).foregroundStyle(DSColor.textTertiary)
                .multilineTextAlignment(.center).frame(maxWidth: .infinity)
                .padding(.top, DS.Space.s4)
        }
        .padding(.horizontal, 28)
        .padding(.bottom, DS.Space.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        .background(DSColor.backgroundPrimary.ignoresSafeArea())
    }
}

/// Standalone jump target (sign out → sign in again). Same content as the last onboarding page.
@MainActor
struct AuthView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        AuthContent {
            withDSAnimation(DSMotion.gentle) {
                app.isOnboarded = true
                app.phase = app.hasSavedFirstMemory ? .main : .firstRun
            }
        }
    }
}
