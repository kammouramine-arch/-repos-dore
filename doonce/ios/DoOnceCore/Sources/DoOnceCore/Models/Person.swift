import Foundation

/// Someone who taught a memory: Dad, the plumber, or the user themself.
public struct Person: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var householdID: UUID
    public var displayName: String
    /// A short tag such as "Father", "Plumber", "Partner".
    public var relationship: String?
    public var contact: ContactDetails?
    /// True for the person record that represents the current user.
    public var isSelf: Bool
    /// Set when the person is also a household user.
    public var userID: UUID?
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        householdID: UUID,
        displayName: String,
        relationship: String? = nil,
        contact: ContactDetails? = nil,
        isSelf: Bool = false,
        userID: UUID? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.householdID = householdID
        self.displayName = displayName
        self.relationship = relationship
        self.contact = contact
        self.isSelf = isSelf
        self.userID = userID
        self.createdAt = createdAt
    }
}

/// How to reach a person again.
public struct ContactDetails: Codable, Hashable, Sendable {
    public var phone: String?
    public var email: String?
    public var company: String?

    public init(phone: String? = nil, email: String? = nil, company: String? = nil) {
        self.phone = phone
        self.email = email
        self.company = company
    }
}
