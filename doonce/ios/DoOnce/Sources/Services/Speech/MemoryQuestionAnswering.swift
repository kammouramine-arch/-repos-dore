import Foundation
import DoOnceCore

/// An answer to a question about one memory. Always grounded: `sourceTime` points at the moment
/// in the original recording the answer came from, so the user can hear it in the person's words.
struct MemoryAnswer: Hashable, Sendable {
    var text: String
    /// Seconds into the source recording, or nil when nothing in the transcript answered.
    var sourceTime: TimeInterval?
    /// Who said it ("Julien"), or nil when no answer was found.
    var speaker: String?

    var isGrounded: Bool { sourceTime != nil }
}

/// Answers a question about a memory from what was actually said when it was taught.
///
/// This is not a chatbot: an answerer may only quote or paraphrase the transcript and must say so
/// when the transcript has nothing on the topic. Never invent a step, a value or a warning.
protocol MemoryQuestionAnswering: Sendable {
    func answer(_ question: String, memory: Memory, currentStep: Step?) async -> MemoryAnswer
}

/// The default, fully local answerer. Scores transcript segments by token overlap with the question,
/// weighting the current step's `sourceRange` so "which valve?" on step 3 prefers what was said then.
///
/// Returns the best segment verbatim ("Julien said: “…”") with its start time, or a calm
/// "Julien didn't say anything about that." when nothing scores. No network, no model.
struct TranscriptGroundedAnswerer: MemoryQuestionAnswering {
    /// Words spoken around the current step count this much more than the rest of the recording.
    var currentStepBoost = 1.6
    /// Minimum overlap score for a segment to count as an answer.
    var threshold = 1.0

    var transcript: Transcript?
    var speaker: String?

    /// - Parameters:
    ///   - transcript: the source recording's transcript. When nil, steps' `sourceTranscript` are used.
    ///   - speaker: the demonstrator's display name.
    init(transcript: Transcript? = nil, speaker: String? = nil) {
        self.transcript = transcript
        self.speaker = speaker
    }

    func answer(_ question: String, memory: Memory, currentStep: Step?) async -> MemoryAnswer {
        let name = speaker ?? L10n.string("ask.unknownPerson")
        let queryTokens = Set(TextTokenizer.searchTokens(question))
        let units = Set(NumericValueExtractor.extract(from: question).map(\.unit))
            .union(Self.unitHints(in: queryTokens))
        guard !queryTokens.isEmpty || !units.isEmpty else {
            return MemoryAnswer(text: L10n.string("ask.nothing", ["person": name]), sourceTime: nil, speaker: nil)
        }

        let targets = Self.targets(in: memory)
        var best: (segment: TranscriptSegment, score: Double)?
        for segment in segments(for: memory) {
            var score = Self.overlap(queryTokens, segment.text)
            // A question about a unit ("what pressure?") matches the segment that names a value in that unit,
            // and best of all the segment naming the value a step is waiting for (the 1.5 bar, not the 1 bar).
            let spoken = NumericValueExtractor.extract(from: segment.text)
            if spoken.contains(where: { units.contains($0.unit) }) { score += 2 }
            if spoken.contains(where: { v in units.contains(v.unit) && targets.contains { $0.value == v.value && $0.unit == v.unit } }) { score += 1.5 }
            if let range = currentStep?.sourceRange, segment.end > range.lowerBound, segment.start < range.upperBound {
                score *= currentStepBoost
            }
            guard score >= threshold else { continue }
            if best == nil || score > best!.score { best = (segment, score) }
        }

        guard let best else {
            return MemoryAnswer(text: L10n.string("ask.nothing", ["person": name]), sourceTime: nil, speaker: nil)
        }
        return MemoryAnswer(
            text: L10n.string("ask.said", ["person": name, "quote": best.segment.text]),
            sourceTime: best.segment.start,
            speaker: name
        )
    }

    /// The real transcript when we have it, else each step's remembered words placed at its source range.
    private func segments(for memory: Memory) -> [TranscriptSegment] {
        if let transcript, !transcript.segments.isEmpty { return transcript.segments }
        return memory.orderedSteps.compactMap { step in
            guard let text = step.sourceTranscript, let range = step.sourceRange else { return nil }
            return TranscriptSegment(start: range.lowerBound, end: range.upperBound, text: text)
        }
    }

    /// The values steps are waiting for (`.gaugeReaches`), which are the numbers people most often ask about.
    static func targets(in memory: Memory) -> Set<MeasuredValue> {
        Set(memory.steps.compactMap { step in
            guard case let .gaugeReaches(value, unit) = step.completionRule else { return nil }
            return MeasuredValue(value: value, unit: unit, raw: "")
        })
    }

    /// Sum of shared tokens; a shared number ("1.5") counts double because it is what people ask for.
    static func overlap(_ query: Set<String>, _ text: String) -> Double {
        let tokens = Set(TextTokenizer.searchTokens(text))
        return query.reduce(0) { score, token in
            guard tokens.contains(token) else { return score }
            return score + (token.first?.isNumber == true ? 2 : 1)
        }
    }

    /// "pressure" → bar/psi, "temperature" → °C, "long"/"time" → min/s, so a unitless question still lands.
    static func unitHints(in tokens: Set<String>) -> Set<String> {
        var units: Set<String> = []
        if tokens.contains("pressure") { units.formUnion(["bar", "psi"]) }
        if tokens.contains("temperature") || tokens.contains("hot") || tokens.contains("warm") { units.insert("°C") }
        if tokens.contains("long") || tokens.contains("time") || tokens.contains("minute") || tokens.contains("second") {
            units.formUnion(["min", "s", "h"])
        }
        for token in tokens { if let unit = VoiceCommandParser.knownUnits[token] { units.insert(unit) } }
        return units
    }
}

/// Placeholder for a model-backed answerer. Not wired up.
///
/// Any implementation MUST be grounded on the same transcript `TranscriptGroundedAnswerer` uses
/// (the recording's words, nothing else), MUST always cite a `sourceTime` for a non-empty answer, and
/// MUST return the calm "didn't say anything about that" answer rather than guess. A model may
/// paraphrase a quoted segment; it may not add facts, steps, values or warnings that were not said.
struct LLMQuestionAnswerer: MemoryQuestionAnswering {
    var fallback = TranscriptGroundedAnswerer()

    func answer(_ question: String, memory: Memory, currentStep: Step?) async -> MemoryAnswer {
        // TODO: call the grounding model with the transcript and the candidate segments; until then,
        // the local answerer is the behaviour.
        await fallback.answer(question, memory: memory, currentStep: currentStep)
    }
}

/// Suggestion chips for the Ask sheet, derived from what the transcript actually contains, so a chip
/// never asks something the memory cannot answer. Falls back to generic chips when the transcript is thin.
enum AskSuggestions {
    static let objectNouns = ["valve", "button", "switch", "lever", "dial", "knob", "filter", "handle", "panel", "hose", "cable", "port", "tap", "screw", "fuse", "gauge"]

    static func chips(for memory: Memory, transcript: Transcript?, limit: Int = 3) -> [String] {
        let text = transcript?.fullText ?? memory.orderedSteps.compactMap(\.sourceTranscript).joined(separator: " ")
        let units = Set(NumericValueExtractor.extract(from: text).map(\.unit))
        let words = Set(TextTokenizer.words(text))
        var chips: [String] = []
        if !units.isDisjoint(with: ["bar", "psi"]) { chips.append(L10n.string("ask.suggest.pressure")) }
        if units.contains("°C") { chips.append(L10n.string("ask.suggest.temperature")) }
        if let noun = objectNouns.first(where: { words.contains($0) || words.contains($0 + "s") }) {
            chips.append(L10n.string("ask.suggest.which", ["object": noun]))
        }
        if let unit = units.first(where: { !["bar", "psi", "°C", "min", "s", "h"].contains($0) }) {
            chips.append(L10n.string("ask.suggest.value", ["unit": unit]))
        }
        chips.append(L10n.string("ask.suggest.howLong"))
        return Array(chips.prefix(limit))
    }
}
