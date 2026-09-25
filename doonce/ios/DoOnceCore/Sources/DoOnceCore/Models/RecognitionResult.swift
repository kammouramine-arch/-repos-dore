import Foundation

/// The outcome of pointing the camera at something.
public struct RecognitionResult: Codable, Hashable, Sendable {
    /// How confident we are, which drives the copy: "Found your boiler." / "Is this your boiler?" / "I don't know this yet."
    public enum Level: String, Codable, Hashable, Sendable {
        /// A specific object the user owns was recognised.
        case exact
        /// No specific object, but the category looks familiar.
        case category
        case unknown
    }

    /// One object that might be what the camera sees.
    public struct Candidate: Codable, Hashable, Sendable {
        public var objectID: UUID
        public var name: String
        public var category: String
        /// Cosine similarity in `0...1`.
        public var confidence: Double

        public init(objectID: UUID, name: String, category: String, confidence: Double) {
            self.objectID = objectID
            self.name = name
            self.category = category
            self.confidence = confidence
        }
    }

    public var level: Level
    /// Candidates sorted by descending confidence. Empty when `level == .unknown`.
    public var candidates: [Candidate]
    /// The category to suggest when creating a new object ("Looks like a boiler.").
    public var suggestedCategory: String?

    public init(level: Level, candidates: [Candidate] = [], suggestedCategory: String? = nil) {
        self.level = level
        self.candidates = candidates
        self.suggestedCategory = suggestedCategory
    }

    public static let unknown = RecognitionResult(level: .unknown)

    public var best: Candidate? { candidates.first }
}
