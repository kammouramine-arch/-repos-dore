import Foundation

/// Compares camera embeddings against the household's objects.
///
/// Each object is scored from all of its reference images: `0.6 × best similarity + 0.4 × mean of
/// the top-k similarities`. The best view says "this could be it"; the agreement of the other views
/// says "and it is not a coincidence", so an object taught from several angles beats one taught
/// from a single photo when the camera looks from a new angle.
///
/// Three answers: `.exact` needs the score above `exactThreshold` *and* a clear lead of
/// `minMargin` over the runner-up (two look-alike objects get "Is this your…?" rather than a
/// confident wrong name); `.category` when the score clears `categoryThreshold`; `.unknown` otherwise.
public struct RecognitionMatcher: Sendable {
    public var exactThreshold: Double
    public var categoryThreshold: Double
    /// How many candidates to return at most.
    public var maxCandidates: Int
    /// The lead the best object needs over the second best to be called `.exact`.
    public var minMargin: Double
    /// How many reference similarities per object feed the mean.
    public var topK: Int

    public init(exactThreshold: Double = 0.85, categoryThreshold: Double = 0.6, maxCandidates: Int = 3, minMargin: Double = 0.05, topK: Int = 3) {
        precondition(exactThreshold > categoryThreshold, "exact threshold must be above category threshold")
        self.exactThreshold = exactThreshold
        self.categoryThreshold = categoryThreshold
        self.maxCandidates = maxCandidates
        self.minMargin = minMargin
        self.topK = max(1, topK)
    }

    /// The best interpretation of one camera frame.
    public func match(_ query: Embedding, against objects: [PhysicalObject]) -> RecognitionResult {
        decide(objects.map { ($0, score($0, query: query)) })
    }

    /// The best interpretation of several frames of the same scene: each object's score is averaged
    /// across frames, so one frame with a misleading reflection cannot flip the answer.
    public func match(_ embeddings: [Embedding], against objects: [PhysicalObject]) -> RecognitionResult {
        guard !embeddings.isEmpty else { return .unknown }
        let scored = objects.map { object -> (PhysicalObject, Double) in
            let total = embeddings.reduce(0.0) { $0 + score(object, query: $1) }
            return (object, total / Double(embeddings.count))
        }
        return decide(scored)
    }

    /// `0.6 × max + 0.4 × mean(top-k)`; -1 for an object with no reference images.
    public func score(_ object: PhysicalObject, query: Embedding) -> Double {
        let similarities = object.visualEmbeddings.map { $0.cosineSimilarity(to: query) }.sorted(by: >)
        guard let best = similarities.first else { return -1 }
        let top = similarities.prefix(topK)
        let mean = top.reduce(0, +) / Double(top.count)
        return 0.6 * best + 0.4 * mean
    }

    private func decide(_ scored: [(object: PhysicalObject, score: Double)]) -> RecognitionResult {
        let ranked = scored.sorted { $0.score > $1.score }
        let candidates = ranked
            .filter { $0.score >= categoryThreshold }
            .prefix(maxCandidates)
            .map { RecognitionResult.Candidate(objectID: $0.object.id, name: $0.object.name, category: $0.object.category, confidence: $0.score) }

        guard let top = candidates.first else { return .unknown }
        let runnerUp = ranked.count > 1 ? ranked[1].score : -1
        if top.confidence >= exactThreshold, top.confidence - runnerUp >= minMargin {
            return RecognitionResult(level: .exact, candidates: Array(candidates), suggestedCategory: top.category)
        }
        return RecognitionResult(level: .category, candidates: Array(candidates), suggestedCategory: top.category)
    }
}
