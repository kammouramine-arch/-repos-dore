import Foundation

/// Compares a camera embedding against the household's objects.
///
/// Two thresholds separate three answers: above `exactThreshold` it is *your* object; between the
/// thresholds it only looks like that kind of thing; below `categoryThreshold` we say we don't know.
public struct RecognitionMatcher: Sendable {
    public var exactThreshold: Double
    public var categoryThreshold: Double
    /// How many candidates to return at most.
    public var maxCandidates: Int

    public init(exactThreshold: Double = 0.85, categoryThreshold: Double = 0.6, maxCandidates: Int = 3) {
        precondition(exactThreshold > categoryThreshold, "exact threshold must be above category threshold")
        self.exactThreshold = exactThreshold
        self.categoryThreshold = categoryThreshold
        self.maxCandidates = maxCandidates
    }

    /// The best interpretation of what the camera sees.
    public func match(_ query: Embedding, against objects: [PhysicalObject]) -> RecognitionResult {
        let scored = objects.compactMap { object -> RecognitionResult.Candidate? in
            let best = object.visualEmbeddings.map { $0.cosineSimilarity(to: query) }.max() ?? -1
            guard best >= categoryThreshold else { return nil }
            return RecognitionResult.Candidate(objectID: object.id, name: object.name, category: object.category, confidence: best)
        }
        .sorted { $0.confidence > $1.confidence }

        guard let top = scored.first else { return .unknown }
        let candidates = Array(scored.prefix(maxCandidates))
        if top.confidence >= exactThreshold {
            return RecognitionResult(level: .exact, candidates: candidates, suggestedCategory: top.category)
        }
        return RecognitionResult(level: .category, candidates: candidates, suggestedCategory: top.category)
    }
}
