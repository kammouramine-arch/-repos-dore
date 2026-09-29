import Foundation

/// The sample household exists only to show what DoOnce does (demo builds, the simulator, the
/// screenshot walk). It must never pass for the user's own data: the app labels these items
/// "Example" and stops showing them once the user has remembered something real.
extension SampleData {
    public static let exampleMemoryIDs: Set<UUID> = Set(memories.map(\.id))
    public static let exampleObjectIDs: Set<UUID> = Set(objects.map(\.id))
    public static let examplePersonIDs: Set<UUID> = Set(people.filter { !$0.isSelf }.map(\.id))
    public static let exampleSpaceIDs: Set<UUID> = Set(spaces.map(\.id))

    public static func isExample(_ memory: Memory) -> Bool { exampleMemoryIDs.contains(memory.id) }
    public static func isExample(_ object: PhysicalObject) -> Bool { exampleObjectIDs.contains(object.id) }
}

extension MemoryStoreSnapshot {
    /// True once any memory that is not an example (and not an unreviewed draft) exists.
    public func hasRealMemories(draftTag: String = "draft") -> Bool {
        memories.contains { !SampleData.isExample($0) && !$0.tags.contains(draftTag) }
    }

    /// The snapshot as the user should see it: everything while the household holds only examples
    /// (they are the demonstration), and once something real exists, the examples and anything
    /// that only existed for them (their objects, people, empty spaces, progress) drop away. An
    /// example object or person the user has attached a real memory to stays.
    public func hidingExamplesOnceReal(draftTag: String = "draft") -> MemoryStoreSnapshot {
        guard hasRealMemories(draftTag: draftTag) else { return self }
        var copy = self
        copy.memories = memories.filter { !SampleData.isExample($0) }
        let usedObjects = Set(copy.memories.compactMap(\.objectID))
        copy.objects = objects.filter { !SampleData.isExample($0) || usedObjects.contains($0.id) }
        let usedPeople = Set(copy.memories.compactMap(\.demonstratorID))
        copy.people = people.filter { !SampleData.examplePersonIDs.contains($0.id) || usedPeople.contains($0.id) }
        let usedSpaces = Set(copy.objects.compactMap(\.spaceID))
        copy.spaces = spaces.filter { !SampleData.exampleSpaceIDs.contains($0.id) || usedSpaces.contains($0.id) }
        let visible = Set(copy.memories.map(\.id))
        copy.progress = progress.filter { visible.contains($0.memoryID) }
        return copy
    }
}
