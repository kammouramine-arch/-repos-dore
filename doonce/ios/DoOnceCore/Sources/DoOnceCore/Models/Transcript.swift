import Foundation

/// What was said during a recording, with timing.
public struct Transcript: Codable, Hashable, Sendable {
    public var segments: [TranscriptSegment]
    /// Short phrases the transcription service thought were salient.
    public var keyPhrases: [String]
    public var language: String

    public init(segments: [TranscriptSegment], keyPhrases: [String] = [], language: String = "en") {
        self.segments = segments
        self.keyPhrases = keyPhrases
        self.language = language
    }

    public var fullText: String {
        segments.map(\.text).joined(separator: " ")
    }

    public var duration: TimeInterval {
        segments.map(\.end).max() ?? 0
    }

    /// Segments that overlap the given time range.
    public func segments(in range: ClosedRange<TimeInterval>) -> [TranscriptSegment] {
        segments.filter { $0.end > range.lowerBound && $0.start < range.upperBound }
    }

    /// The text spoken inside a time range.
    public func text(in range: ClosedRange<TimeInterval>) -> String {
        segments(in: range).map(\.text).joined(separator: " ")
    }
}

/// A sentence-sized chunk of speech.
public struct TranscriptSegment: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var start: TimeInterval
    public var end: TimeInterval
    public var text: String
    /// Word-level timing when the transcription service provides it.
    public var words: [TranscriptWord]

    public init(id: UUID = UUID(), start: TimeInterval, end: TimeInterval, text: String, words: [TranscriptWord] = []) {
        self.id = id
        self.start = start
        self.end = end
        self.text = text
        self.words = words
    }

    public var range: ClosedRange<TimeInterval> { start...max(start, end) }
}

/// One spoken word and when it was said.
public struct TranscriptWord: Codable, Hashable, Sendable {
    public var text: String
    public var start: TimeInterval
    public var end: TimeInterval

    public init(text: String, start: TimeInterval, end: TimeInterval) {
        self.text = text
        self.start = start
        self.end = end
    }
}
