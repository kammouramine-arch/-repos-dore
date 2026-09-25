import Foundation

/// A memory that matched a search, with the step that matched best if any.
public struct SearchHit: Hashable, Sendable {
    public var memoryID: UUID
    public var score: Double
    public var matchedTokens: [String]
    public var bestStep: StepHit?

    public init(memoryID: UUID, score: Double, matchedTokens: [String], bestStep: StepHit? = nil) {
        self.memoryID = memoryID
        self.score = score
        self.matchedTokens = matchedTokens
        self.bestStep = bestStep
    }
}

/// A step inside a matched memory.
public struct StepHit: Hashable, Sendable {
    public var stepID: UUID
    public var order: Int
    public var instruction: String
    public var score: Double

    public init(stepID: UUID, order: Int, instruction: String, score: Double) {
        self.stepID = stepID
        self.order = order
        self.instruction = instruction
        self.score = score
    }
}

/// Token-overlap search across memories and everything attached to them.
///
/// Built once from a snapshot of memories, objects, people and spaces. Each memory becomes a bag of
/// weighted tokens; a query scores by the sum of the best weight each query token hits. Ties break
/// on recency so "the thing dad showed me" prefers what Dad showed most recently.
public struct SearchIndex: Sendable {
    /// How much a match in each field is worth.
    public struct Weights: Sendable {
        public var title = 3.0
        public var objectName = 2.5
        public var person = 2.5
        public var tags = 2.0
        public var space = 1.5
        public var summary = 1.5
        public var stepInstruction = 1.5
        public var transcript = 1.0
        public var tools = 1.0

        public init() {}
    }

    struct Document: Sendable {
        var memoryID: UUID
        var createdAt: Date
        /// token → best field weight
        var tokenWeights: [String: Double]
        var steps: [IndexedStep]
    }

    struct IndexedStep: Sendable {
        var stepID: UUID
        var order: Int
        var instruction: String
        var tokenWeights: [String: Double]
    }

    private let documents: [Document]
    public let weights: Weights

    public init(
        memories: [Memory],
        objects: [PhysicalObject] = [],
        people: [Person] = [],
        spaces: [Space] = [],
        weights: Weights = Weights()
    ) {
        self.weights = weights
        let objectsByID = Dictionary(uniqueKeysWithValues: objects.map { ($0.id, $0) })
        let peopleByID = Dictionary(uniqueKeysWithValues: people.map { ($0.id, $0) })
        let spacesByID = Dictionary(uniqueKeysWithValues: spaces.map { ($0.id, $0) })

        documents = memories.map { memory in
            var tokenWeights: [String: Double] = [:]
            func add(_ text: String?, _ weight: Double) {
                guard let text else { return }
                for token in TextTokenizer.searchTokens(text) {
                    tokenWeights[token] = max(tokenWeights[token] ?? 0, weight)
                }
            }

            add(memory.title, weights.title)
            add(memory.summary, weights.summary)
            memory.tags.forEach { add($0, weights.tags) }
            memory.tools.forEach { add($0, weights.tools) }
            if let object = memory.objectID.flatMap({ objectsByID[$0] }) {
                add(object.name, weights.objectName)
                add(object.category, weights.objectName)
                add(object.brand, weights.objectName)
                add(object.model, weights.objectName)
            }
            if let person = memory.demonstratorID.flatMap({ peopleByID[$0] }) {
                add(person.displayName, weights.person)
                add(person.relationship, weights.person)
            }
            if let space = memory.spaceID.flatMap({ spacesByID[$0] }) {
                add(space.name, weights.space)
            }

            let steps = memory.orderedSteps.map { step -> IndexedStep in
                var stepWeights: [String: Double] = [:]
                func addStep(_ text: String?, _ weight: Double) {
                    guard let text else { return }
                    for token in TextTokenizer.searchTokens(text) {
                        stepWeights[token] = max(stepWeights[token] ?? 0, weight)
                    }
                }
                addStep(step.instruction, weights.stepInstruction)
                addStep(step.details, weights.transcript)
                addStep(step.sourceTranscript, weights.transcript)
                addStep(step.warning?.text, weights.transcript)
                for (token, weight) in stepWeights {
                    tokenWeights[token] = max(tokenWeights[token] ?? 0, weight)
                }
                return IndexedStep(stepID: step.id, order: step.order, instruction: step.instruction, tokenWeights: stepWeights)
            }

            return Document(memoryID: memory.id, createdAt: memory.createdAt, tokenWeights: tokenWeights, steps: steps)
        }
    }

    /// Memories ranked for a natural-language query. Empty when nothing matches.
    public func search(_ query: String, limit: Int = 10) -> [SearchHit] {
        let queryTokens = Array(Set(TextTokenizer.searchTokens(query)))
        guard !queryTokens.isEmpty else { return [] }

        var hits: [(SearchHit, Date)] = []
        for document in documents {
            var score = 0.0
            var matched: [String] = []
            for token in queryTokens {
                if let weight = document.tokenWeights[token] {
                    score += weight
                    matched.append(token)
                } else if let (_, weight) = document.tokenWeights.first(where: { Self.prefixMatch($0.key, token) }) {
                    score += weight * 0.6
                    matched.append(token)
                }
            }
            guard score > 0 else { continue }

            let bestStep = Self.bestStep(in: document, for: queryTokens)

            hits.append((SearchHit(memoryID: document.memoryID, score: score, matchedTokens: matched.sorted(), bestStep: bestStep), document.createdAt))
        }

        return hits
            .sorted { lhs, rhs in
                if lhs.0.score != rhs.0.score { return lhs.0.score > rhs.0.score }
                return lhs.1 > rhs.1
            }
            .prefix(limit)
            .map(\.0)
    }

    /// The step whose text overlaps the query most; earlier steps win ties.
    static func bestStep(in document: Document, for queryTokens: [String]) -> StepHit? {
        var best: StepHit?
        for step in document.steps {
            var stepScore = 0.0
            for token in queryTokens {
                stepScore += step.tokenWeights[token] ?? 0
            }
            guard stepScore > 0 else { continue }
            if let current = best, current.score >= stepScore { continue }
            best = StepHit(stepID: step.stepID, order: step.order, instruction: step.instruction, score: stepScore)
        }
        return best
    }

    /// "plumb" matches "plumber"; requires at least four shared leading characters.
    static func prefixMatch(_ indexed: String, _ query: String) -> Bool {
        let shorter = min(indexed.count, query.count)
        guard shorter >= 4 else { return false }
        return indexed.hasPrefix(query) || query.hasPrefix(indexed)
    }
}
