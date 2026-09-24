import Foundation
import Observation
import DoOnceCore

/// What a query found, grouped the way the results page shows it.
struct SearchResults: Equatable {
    /// The one line that answers the question, when the top hit lands on a step with a value.
    struct BestAnswer: Equatable {
        var memory: Memory
        var step: Step
        var value: MeasuredValue
    }

    var bestAnswer: BestAnswer?
    var memories: [Memory] = []
    var objects: [PhysicalObject] = []

    var isEmpty: Bool { bestAnswer == nil && memories.isEmpty && objects.isEmpty }
}

/// Ranks memories and objects for a natural-language query using DoOnceCore's `SearchIndex`.
/// Built once from the household snapshot; the view calls `results(for:)` as the text changes.
@MainActor
@Observable
final class SearchViewModel {
    var query: String

    private let index: SearchIndex
    private let memories: [Memory]
    private let objects: [PhysicalObject]
    private let spaces: [Space]

    init(query: String = "", memories: [Memory], objects: [PhysicalObject], people: [Person], spaces: [Space]) {
        self.query = query
        self.memories = memories
        self.objects = objects
        self.spaces = spaces
        self.index = SearchIndex(memories: memories, objects: objects, people: people, spaces: spaces)
    }

    var results: SearchResults { results(for: query) }

    func results(for text: String) -> SearchResults {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return SearchResults() }
        let hits = index.search(trimmed, limit: 20)
        let byID = Dictionary(uniqueKeysWithValues: memories.map { ($0.id, $0) })
        let ranked = hits.compactMap { byID[$0.memoryID] }
        return SearchResults(
            bestAnswer: bestAnswer(from: hits.first, in: byID),
            memories: ranked,
            objects: matchingObjects(for: trimmed, memories: ranked)
        )
    }

    /// The top hit's best step, but only when its instruction states a measurable value
    /// ("Stop when pressure reaches 1.5 bar."): a best answer must be an answer, not just the
    /// closest sentence, and the value must be in the words shown, never inferred from context.
    private func bestAnswer(from hit: SearchHit?, in byID: [UUID: Memory]) -> SearchResults.BestAnswer? {
        guard let hit, let stepHit = hit.bestStep, let memory = byID[hit.memoryID],
              let step = memory.steps.first(where: { $0.id == stepHit.stepID }),
              let value = NumericValueExtractor.first(in: step.instruction) else { return nil }
        return SearchResults.BestAnswer(memory: memory, step: step, value: value)
    }

    /// Objects named in the query, objects in a space named in the query, and objects of the top memories.
    private func matchingObjects(for text: String, memories ranked: [Memory]) -> [PhysicalObject] {
        let tokens = Set(TextTokenizer.searchTokens(text))
        let spaceIDs = Set(spaces.filter { !tokens.isDisjoint(with: TextTokenizer.searchTokens($0.name)) }.map(\.id))
        var seen = Set<UUID>()
        var result: [PhysicalObject] = []
        func add(_ object: PhysicalObject) { if seen.insert(object.id).inserted { result.append(object) } }
        for object in objects {
            let own = Set(TextTokenizer.searchTokens([object.name, object.category, object.brand ?? "", object.model ?? ""].joined(separator: " ")))
            if !tokens.isDisjoint(with: own) || (object.spaceID.map { spaceIDs.contains($0) } ?? false) { add(object) }
        }
        for memory in ranked.prefix(3) {
            if let id = memory.objectID, let object = objects.first(where: { $0.id == id }) { add(object) }
        }
        return result
    }
}
