import Foundation

/// Where the household's objects are kept.
public protocol ObjectRepository: Sendable {
    func allObjects() async throws -> [PhysicalObject]
    func object(id: UUID) async throws -> PhysicalObject?
    func objects(inSpace spaceID: UUID) async throws -> [PhysicalObject]
    func save(_ object: PhysicalObject) async throws
    func delete(id: UUID) async throws
}

public actor InMemoryObjectRepository: ObjectRepository {
    private var storage: [UUID: PhysicalObject]

    public init(initial: [PhysicalObject] = []) {
        storage = Dictionary(uniqueKeysWithValues: initial.map { ($0.id, $0) })
    }

    public func allObjects() async throws -> [PhysicalObject] {
        storage.values.sorted { $0.name < $1.name }
    }

    public func object(id: UUID) async throws -> PhysicalObject? {
        storage[id]
    }

    public func objects(inSpace spaceID: UUID) async throws -> [PhysicalObject] {
        try await allObjects().filter { $0.spaceID == spaceID }
    }

    public func save(_ object: PhysicalObject) async throws {
        storage[object.id] = object
    }

    public func delete(id: UUID) async throws {
        storage[id] = nil
    }
}
