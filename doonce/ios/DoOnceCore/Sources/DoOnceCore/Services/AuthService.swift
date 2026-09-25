import Foundation

/// Signs users in and out.
public protocol AuthService: Sendable {
    func currentUser() async -> User?
    func signInWithApple(identityToken: String, displayName: String?) async throws -> User
    func signIn(email: String) async throws -> User
    func signOut() async
    /// Permanently deletes the account and its server-side data (an App Store requirement for
    /// apps with sign-in). Implementations that cannot do this throw `AuthError.unsupported`.
    func deleteAccount() async throws
}

extension AuthService {
    /// Providers without account deletion refuse rather than pretend.
    public func deleteAccount() async throws {
        throw AuthError.unsupported
    }
}

public enum AuthError: Swift.Error, Equatable {
    case invalidToken
    case invalidEmail
    /// The provider cannot perform the operation (for example, deleting a demo account).
    case unsupported
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

    /// Forgets the user, which is all a mock account has.
    public func deleteAccount() async throws {
        user = nil
    }
}
