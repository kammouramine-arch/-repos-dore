import Foundation

/// A place in the user's world where objects live: "Kitchen", "Utility room", "Garage".
public struct Space: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var householdID: UUID
    public var name: String
    public var coverImage: MediaRef?
    public var createdAt: Date

    public init(
        id: UUID = UUID(),
        householdID: UUID,
        name: String,
        coverImage: MediaRef? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.householdID = householdID
        self.name = name
        self.coverImage = coverImage
        self.createdAt = createdAt
    }
}
