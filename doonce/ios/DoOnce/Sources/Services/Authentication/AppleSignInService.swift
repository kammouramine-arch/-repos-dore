import AuthenticationServices
import CryptoKit
import DoOnceCore
import Foundation

/// The values DoOnce keeps from an `ASAuthorizationAppleIDCredential`, as a plain value so the
/// SwiftUI button's result can cross into the actor.
struct AppleCredential: Sendable {
    var user: String
    var identityToken: String?
    var givenName: String?
    var familyName: String?
    var email: String?

    init(_ credential: ASAuthorizationAppleIDCredential) {
        user = credential.user
        identityToken = credential.identityToken.flatMap { String(data: $0, encoding: .utf8) }
        givenName = credential.fullName?.givenName
        familyName = credential.fullName?.familyName
        email = credential.email
    }

    init(user: String, identityToken: String?, givenName: String? = nil, familyName: String? = nil, email: String? = nil) {
        self.user = user
        self.identityToken = identityToken
        self.givenName = givenName
        self.familyName = familyName
        self.email = email
    }

    /// Apple only sends the name on the first authorisation; nil after that.
    var displayName: String? {
        let name = [givenName, familyName].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? nil : name
    }
}

/// Sign in with Apple, kept in the Keychain (`KeychainSessionStore`).
///
/// The credential comes from `SignInWithAppleButton` in `AuthContent`; this service turns it into
/// an `AuthSession` (provider "apple", the identity token as access token so the gateway can
/// verify it) and restores it at launch, asking Apple whether the user ID is still authorised:
/// revoked or unknown clears the session. Account deletion is a gateway call, so without a
/// gateway it refuses with `GatewayError.notConfigured` rather than pretending.
actor AppleSignInService: AuthService {
    enum Failure: LocalizedError {
        case missingToken
        case server(Int)
        var errorDescription: String? {
            switch self {
            case .missingToken: L10n.string("auth.error")
            case .server: L10n.string("settings.deleteAccount.failed")
            }
        }
    }

    private let sessions: any SessionStore
    private let gatewayURL: URL?
    private var session: AuthSession?

    init(sessions: any SessionStore, gatewayURL: URL?) {
        self.sessions = sessions
        self.gatewayURL = gatewayURL
    }

    // MARK: Session

    /// The stored session, if Apple still vouches for it. Offline, Apple's answer is unknown and
    /// the session is kept: a signed-in user must not be locked out by a flight.
    func restoreSession() async -> AuthSession? {
        guard let stored = try? await sessions.load() else { return nil }
        session = stored
        if stored.provider == "apple" {
            let state = try? await ASAuthorizationAppleIDProvider().credentialState(forUserID: stored.providerUserID)
            switch state {
            case .revoked?, .notFound?:
                try? await sessions.clear()
                session = nil
                return nil
            case .authorized?, .transferred?, nil:
                break
            @unknown default:
                break
            }
        }
        return session
    }

    /// A fresh authorisation from the button becomes the device session.
    func signIn(credential: AppleCredential) async throws -> AuthSession {
        guard let token = credential.identityToken, !token.isEmpty else { throw Failure.missingToken }
        let previous = try? await sessions.load()
        let displayName = credential.displayName
            ?? (previous?.providerUserID == credential.user ? previous?.displayName : nil)
            ?? "You"
        let email = credential.email ?? (previous?.providerUserID == credential.user ? previous?.email : nil)
        let new = AuthSession(
            userID: Self.stableUserID(for: credential.user),
            provider: "apple",
            providerUserID: credential.user,
            displayName: displayName,
            email: email,
            accessToken: token
        )
        try await sessions.save(new)
        session = new
        return new
    }

    // MARK: AuthService

    func currentUser() async -> User? {
        guard let session else { return nil }
        return User(id: session.userID, displayName: session.displayName, email: session.email, appleUserID: session.providerUserID)
    }

    /// Protocol path without the Apple user ID (tests, previews). `AuthContent` uses `signIn(credential:)`.
    func signInWithApple(identityToken: String, displayName: String?) async throws -> User {
        guard !identityToken.isEmpty else { throw AuthError.invalidToken }
        let providerUserID = session?.providerUserID ?? Self.subject(of: identityToken) ?? UUID().uuidString
        let new = try await signIn(credential: AppleCredential(user: providerUserID, identityToken: identityToken, givenName: displayName))
        return User(id: new.userID, displayName: new.displayName, email: new.email, appleUserID: new.providerUserID)
    }

    /// Email sign-in needs the gateway's magic-link flow, which this build does not have.
    func signIn(email: String) async throws -> User {
        guard email.contains("@") else { throw AuthError.invalidEmail }
        throw GatewayError.notConfigured
    }

    func signOut() async {
        try? await sessions.clear()
        session = nil
    }

    /// `DELETE /v1/account` on the gateway with the session's token, then the local session goes.
    func deleteAccount() async throws {
        guard let gatewayURL else { throw GatewayError.notConfigured }
        guard let header = try await SessionCredentials(store: sessions).authorizationHeader() else { throw AuthError.invalidToken }
        let request = HTTPRequest(url: gatewayURL.appending(path: "v1/account"), method: "DELETE", headers: ["Authorization": header])
        let response = try await URLSessionTransport(timeout: 30).send(request)
        switch response.status {
        case 200..<300, 404: break
        case 401, 403: throw AuthError.invalidToken
        default: throw Failure.server(status)
        }
        try? await sessions.clear()
        session = nil
    }

    // MARK: Helpers

    /// The same Apple user always maps to the same `User.id`, so a reinstall finds its household.
    static func stableUserID(for appleUserID: String) -> UUID {
        let digest = SHA256.hash(data: Data(appleUserID.utf8))
        var bytes = Array(digest.prefix(16))
        bytes[6] = (bytes[6] & 0x0F) | 0x50
        bytes[8] = (bytes[8] & 0x3F) | 0x80
        return UUID(uuid: (bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
                           bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]))
    }

    /// The `sub` claim of an identity token, read without verifying (the gateway verifies).
    static func subject(of identityToken: String) -> String? {
        let parts = identityToken.split(separator: ".")
        guard parts.count == 3 else { return nil }
        var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload += "=" }
        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json["sub"] as? String
    }
}
