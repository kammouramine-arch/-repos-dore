import Foundation

/// Signs users in and out.
public protocol AuthService: Sendable {
    func currentUser() async -> User?
    func signInWithApple(identityToken: String, displayName: String?) async throws -> User
    func signIn(email: String) async throws -> User
    func signOut() async
}

public enum AuthError: Swift.Error, Equatable {
    case invalidToken
    case invalidEmail
}

/// An auth service that accepts any well-formed credential. For tests and previews.
public actor MockAuthService: AuthService {
    private var user: User?

    public init(signedInAs user: User? = nil) {
        self.user = user
    }

    public func currentUser() async -> User? { user }

    public func signInWithApple(identityToken: String, displayName: String?) async throws -> User {
        guard !identityToken.isEmpty else { throw AuthError.invalidToken }
        let signedIn = User(displayName: displayName ?? "You", appleUserID: identityToken)
        user = signedIn
        return signedIn
    }

    public func signIn(email: String) async throws -> User {
        guard email.contains("@") else { throw AuthError.invalidEmail }
        let signedIn = User(displayName: String(email.split(separator: "@").first ?? "You"), email: email)
        user = signedIn
        return signedIn
    }

    public func signOut() async {
        user = nil
    }
}
