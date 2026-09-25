import Foundation

/// Where spaces are kept.
public protocol SpaceRepository: Sendable {
    func allSpaces() async throws -> [Space]
    func space(id: UUID) async throws -> Space?
    func save(_ space: Space) async throws
    func delete(id: UUID) async throws
}

public actor InMemorySpaceRepository: SpaceRepository {
    private var storage: [UUID: Space]

    public init(initial: [Space] = []) {
        storage = Dictionary(uniqueKeysWithValues: initial.map { ($0.id, $0) })
    }

    public func allSpaces() async throws -> [Space] {
        storage.values.sorted { $0.name < $1.name }
    }

    public func space(id: UUID) async throws -> Space? {
        storage[id]
    }

    public func save(_ space: Space) async throws {
        storage[space.id] = space
    }

    public func delete(id: UUID) async throws {
        storage[id] = nil
    }
}
