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
    /// Resumable processing state, one job per recording still on its way to a memory.
    public var processingJobs: [ProcessingJob]
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
        processingJobs: [ProcessingJob] = [],
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
        self.processingJobs = processingJobs
        self.exportedAt = exportedAt
    }

    /// Decodes documents written before `processingJobs` existed: a missing key means no jobs.
    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        users = try container.decode([User].self, forKey: .users)
        households = try container.decode([Household].self, forKey: .households)
        spaces = try container.decode([Space].self, forKey: .spaces)
        objects = try container.decode([PhysicalObject].self, forKey: .objects)
        people = try container.decode([Person].self, forKey: .people)
        memories = try container.decode([Memory].self, forKey: .memories)
        recordings = try container.decode([Recording].self, forKey: .recordings)
        progress = try container.decode([MemoryProgress].self, forKey: .progress)
        processingJobs = try container.decodeIfPresent([ProcessingJob].self, forKey: .processingJobs) ?? []
        exportedAt = try container.decode(Date.self, forKey: .exportedAt)
    }

    /// True when nothing has been stored yet (`exportedAt` alone does not count).
    public var isEmpty: Bool {
        users.isEmpty && households.isEmpty && spaces.isEmpty && objects.isEmpty && people.isEmpty
            && memories.isEmpty && recordings.isEmpty && progress.isEmpty && processingJobs.isEmpty
    }

    public func object(id: UUID) -> PhysicalObject? { objects.first { $0.id == id } }
    public func person(id: UUID) -> Person? { people.first { $0.id == id } }
    public func space(id: UUID) -> Space? { spaces.first { $0.id == id } }
    public func memory(id: UUID) -> Memory? { memories.first { $0.id == id } }
    public func memories(forObject objectID: UUID) -> [Memory] { memories.filter { $0.objectID == objectID } }
}
