import Foundation

/// Where memories are kept. Implementations must be safe to call from any task.
public protocol MemoryRepository: Sendable {
    func allMemories() async throws -> [Memory]
    func memory(id: UUID) async throws -> Memory?
    func memories(forObject objectID: UUID) async throws -> [Memory]
    func memories(taughtBy personID: UUID) async throws -> [Memory]
    /// Inserts or replaces.
    func save(_ memory: Memory) async throws
    func delete(id: UUID) async throws
}

/// A memory repository that lives in memory. Good for previews, tests and offline first runs.
public actor InMemoryMemoryRepository: MemoryRepository {
    private var storage: [UUID: Memory]

    public init(initial: [Memory] = []) {
        storage = Dictionary(uniqueKeysWithValues: initial.map { ($0.id, $0) })
    }

    public func allMemories() async throws -> [Memory] {
        storage.values.sorted { $0.createdAt > $1.createdAt }
    }

    public func memory(id: UUID) async throws -> Memory? {
        storage[id]
    }

    public func memories(forObject objectID: UUID) async throws -> [Memory] {
        try await allMemories().filter { $0.objectID == objectID }
    }

    public func memories(taughtBy personID: UUID) async throws -> [Memory] {
        try await allMemories().filter { $0.demonstratorID == personID }
    }

    public func save(_ memory: Memory) async throws {
        storage[memory.id] = memory
    }

    public func delete(id: UUID) async throws {
        storage[id] = nil
    }

    public var count: Int { storage.count }
}
