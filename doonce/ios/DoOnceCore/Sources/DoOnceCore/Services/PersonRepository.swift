import Foundation

/// Where the people who taught memories are kept.
public protocol PersonRepository: Sendable {
    func allPeople() async throws -> [Person]
    func person(id: UUID) async throws -> Person?
    /// The record representing the current user, if one exists.
    func selfPerson() async throws -> Person?
    func save(_ person: Person) async throws
    func delete(id: UUID) async throws
}

public actor InMemoryPersonRepository: PersonRepository {
    private var storage: [UUID: Person]

    public init(initial: [Person] = []) {
        storage = Dictionary(uniqueKeysWithValues: initial.map { ($0.id, $0) })
    }

    public func allPeople() async throws -> [Person] {
        storage.values.sorted { $0.displayName < $1.displayName }
    }

    public func person(id: UUID) async throws -> Person? {
        storage[id]
    }

    public func selfPerson() async throws -> Person? {
        storage.values.first { $0.isSelf }
    }

    public func save(_ person: Person) async throws {
        storage[person.id] = person
    }

    public func delete(id: UUID) async throws {
        storage[id] = nil
    }
}
