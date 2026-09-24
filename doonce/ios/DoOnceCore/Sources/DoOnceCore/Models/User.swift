import Foundation

/// An account holder. Other people who appear in memories are `Person`, not `User`.
public struct User: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var displayName: String
    public var email: String?
    /// Opaque identifier from Sign in with Apple, when that was the sign-in method.
    public var appleUserID: String?
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        displayName: String,
        email: String? = nil,
        appleUserID: String? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.displayName = displayName
        self.email = email
        self.appleUserID = appleUserID
        self.createdAt = createdAt
    }
}
