import SwiftUI
import AuthenticationServices
import DoOnceCore

/// The last onboarding page and the standalone sign-in screen: the mark, one promise, and Sign in
/// with Apple. Email is the quiet alternative.
///
/// Live mode: the button's credential goes to `AppleSignInService`, the session lands in the
/// Keychain and `onFinished` runs only after that. A cancel is silent; any other failure is a
/// calm line under the button and the button stays. Demo mode: the mock accepts anything, so
/// the simulator (where the Apple sheet always fails) still gets through.
@MainActor
struct AuthContent: View {
    var onFinished: () -> Void

    @Environment(AppState.self) private var app
    @Environment(\.colorScheme) private var colorScheme
    @State private var isSigningIn = false
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSLoopMark(size: 40)
                .padding(.top, 70)
            Spacer(minLength: DS.Space.s6)
            Text(L10n.string("onboarding.end.headline")).dsText(.display).foregroundStyle(DSColor.textPrimary)
                .accessibilityAddTraits(.isHeader)
                .padding(.bottom, 28)
            ZStack {
                SignInWithAppleButton(.continue) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    handle(result)
                }
                .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                .frame(height: DS.Size.touchComfort)
                .clipShape(Capsule())
                .opacity(isSigningIn ? 0.4 : 1)
                .disabled(isSigningIn)
                .accessibilityLabel(L10n.string("auth.apple"))
                if isSigningIn {
                    DSStatusPill(text: L10n.string("auth.signingIn"))
                        .transition(.opacity)
                }
            }
            .dsAnimation(DSMotion.standard(0.2), value: isSigningIn)
            if let error {
                Text(error).dsText(.footnote).foregroundStyle(DSColor.danger)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, DS.Space.s2)
                    .transition(.opacity)
                    .accessibilityAddTraits(.updatesFrequently)
            }
            Button(L10n.string("auth.email")) { emailTapped() }
                .buttonStyle(.ds(.ghost, fullWidth: true))
                .disabled(isSigningIn)
                .padding(.top, 10)
            Text(L10n.string("auth.legal")).dsText(.caption).foregroundStyle(DSColor.textTertiary)
                .multilineTextAlignment(.center).frame(maxWidth: .infinity)
                .padding(.top, DS.Space.s4)
        }
        .padding(.horizontal, 28)
        .padding(.bottom, DS.Space.s5)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        .background(DSColor.backgroundPrimary.ignoresSafeArea())
        .dsAnimation(DSMotion.standard(0.2), value: error)
    }

    // MARK: Results

    private func handle(_ result: Result<ASAuthorization, any Error>) {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                error = L10n.string("auth.error")
                return
            }
            let value = AppleCredential(credential)
            run {
                if let apple = app.services.auth as? AppleSignInService {
                    let session = try await apple.signIn(credential: value)
                    await app.didSignIn(session)
                } else {
                    try await app.signInDemo(displayName: value.displayName)
                }
            }
        case .failure(let failure):
            if (failure as? ASAuthorizationError)?.code == .canceled { return }
            if app.configuration.isLive {
                error = L10n.string("auth.error")
            } else {
                // Demo: the Apple sheet cannot succeed on a simulator; the mock signs in anyway.
                run { try await app.signInDemo(displayName: nil) }
            }
        }
    }

    private func emailTapped() {
        if app.configuration.isLive {
            withDSAnimation(DSMotion.standard(0.2)) { error = L10n.string("auth.emailUnavailable") }
        } else {
            run { try await app.signInDemo(displayName: nil) }
        }
    }

    private func run(_ work: @escaping () async throws -> Void) {
        guard !isSigningIn else { return }
        error = nil
        isSigningIn = true
        Task {
            do {
                try await work()
                isSigningIn = false
                HapticsService.shared.play(.light)
                onFinished()
            } catch {
                isSigningIn = false
                HapticsService.shared.play(.error)
                self.error = L10n.string("auth.error")
            }
        }
    }
}

/// Standalone jump target (a signed-out live build, sign out → sign in again). Same content as
/// the last onboarding page.
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
