import Foundation

/// A group of users who share objects, spaces and memories.
public struct Household: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var name: String
    public var members: [HouseholdMember]
    public var createdAt: Date

    public init(id: UUID = UUID(), name: String, members: [HouseholdMember] = [], createdAt: Date = Date()) {
        self.id = id
        self.name = name
        self.members = members
        self.createdAt = createdAt
    }

    /// The role a user holds in this household, if they are a member.
    public func role(of userID: UUID) -> HouseholdMember.Role? {
        members.first { $0.userID == userID }?.role
    }
}

/// Membership of a user in a household.
public struct HouseholdMember: Codable, Hashable, Sendable {
    public enum Role: String, Codable, Hashable, Sendable {
        /// Can manage members, billing and delete the household.
        case owner
        /// Can add and edit memories, objects and spaces.
        case member
        /// Can view and run memories, but not edit them.
        case viewer
    }

    public var userID: UUID
    public var role: Role
    public var joinedAt: Date

    public init(userID: UUID, role: Role, joinedAt: Date = Date()) {
        self.userID = userID
        self.role = role
        self.joinedAt = joinedAt
    }
}
