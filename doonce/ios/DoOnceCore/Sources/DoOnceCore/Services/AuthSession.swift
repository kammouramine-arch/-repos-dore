import Foundation

/// Who is signed in on this device and the tokens that prove it to the gateway.
///
/// Kept separate from `User` because a user is household data (shared, exported, seeded) while
/// a session is device secrets: it is stored in its own file, never in `store.json`, and is the
/// only thing `SessionCredentials` reads.
public struct AuthSession: Codable, Sendable, Hashable {
    public var userID: UUID
    /// "apple", "email" or "demo".
    public var provider: String
    /// The identifier the provider knows the user by (Apple's opaque user ID, the email...).
    public var providerUserID: String
    public var displayName: String
    public var email: String?
    public var issuedAt: Date
    public var accessToken: String?
    public var refreshToken: String?
    public var expiresAt: Date?

    public init(
        userID: UUID,
        provider: String,
        providerUserID: String,
        displayName: String,
        email: String? = nil,
        issuedAt: Date = Date(),
        accessToken: String? = nil,
        refreshToken: String? = nil,
        expiresAt: Date? = nil
    ) {
        self.userID = userID
        self.provider = provider
        self.providerUserID = providerUserID
        self.displayName = displayName
        self.email = email
        self.issuedAt = issuedAt
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
    }

    /// True once `expiresAt` has passed. A session without an expiry never expires.
    public var isExpired: Bool { isExpired(at: Date()) }

    public func isExpired(at date: Date) -> Bool {
        guard let expiresAt else { return false }
        return expiresAt <= date
    }
}

/// Where the device keeps its one session. Implementations must tolerate a missing session.
public protocol SessionStore: Sendable {
    func load() async throws -> AuthSession?
    func save(_ session: AuthSession) async throws
    func clear() async throws
}

/// Keeps nothing on disk. For tests, previews and demo mode.
public actor InMemorySessionStore: SessionStore {
    private var session: AuthSession?

    public init(session: AuthSession? = nil) {
        self.session = session
    }

    public func load() async throws -> AuthSession? { session }
    public func save(_ session: AuthSession) async throws { self.session = session }
    public func clear() async throws { session = nil }
}

/// Turns the stored session into an `Authorization` header for the gateway.
///
/// Returns nil (anonymous) when there is no session, no access token, or the token has expired,
/// so an expired token is never sent and the gateway answers with `unauthorized` only for tokens
/// it actually rejected.
public struct SessionCredentials: GatewayCredentials {
    public var store: any SessionStore

    public init(store: any SessionStore) {
        self.store = store
    }

    public func authorizationHeader() async throws -> String? {
        guard let session = try await store.load(), let token = session.accessToken, !token.isEmpty, !session.isExpired else {
            return nil
        }
        return "Bearer \(token)"
    }
}
