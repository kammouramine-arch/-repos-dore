import Foundation

/// Everything a household knows, as one value. Used for seeding, export and tests.
public struct MemoryStoreSnapshot: Codable, Hashable, Sendable {
    public var users: [User]
    public var households: [Household]
    public var spaces: [Space]
    public var objects: [PhysicalObject]
    public var people: [Person]
    public var memories: [Memory]
    public var recordings: [Recording]
    public var progress: [MemoryProgress]
    public var exportedAt: Date

    public init(
        users: [User] = [],
        households: [Household] = [],
        spaces: [Space] = [],
        objects: [PhysicalObject] = [],
        people: [Person] = [],
        memories: [Memory] = [],
        recordings: [Recording] = [],
        progress: [MemoryProgress] = [],
        exportedAt: Date = Date()
    ) {
        self.users = users
        self.households = households
        self.spaces = spaces
        self.objects = objects
        self.people = people
        self.memories = memories
        self.recordings = recordings
        self.progress = progress
        self.exportedAt = exportedAt
    }

    public func object(id: UUID) -> PhysicalObject? { objects.first { $0.id == id } }
    public func person(id: UUID) -> Person? { people.first { $0.id == id } }
    public func space(id: UUID) -> Space? { spaces.first { $0.id == id } }
    public func memory(id: UUID) -> Memory? { memories.first { $0.id == id } }
    public func memories(forObject objectID: UUID) -> [Memory] { memories.filter { $0.objectID == objectID } }
}
