import Foundation

/// The safety net between any provider and the user.
///
/// A model may be fluent and wrong; the recording is the only ground truth. Whatever the provider
/// says, the validator makes sure every step points inside the recording, that anything not
/// backed by speech or a detected moment is marked as such, that words shown as the demonstrator's
/// are words the demonstrator actually said, that numbers nobody said are never
/// presented as fact, that the risk level is never lower than the words warrant, and that there
/// are never more steps than the recording can support. It corrects rather than rejects, and
/// reports every correction so tests and logs can see what a provider tried to do.
public enum AnalysisValidator {
    /// The copy shown for a step nothing captured clearly. Same words as `ProcedureAssembler`.
    public static let unclearInstruction = "This part wasn't clearly captured."
    /// Below this the provider is guessing; the step is shown as unclear rather than as an instruction.
    public static let unclearConfidence = 0.35
    /// The most confidence a step without speech behind it can carry.
    public static let inferredConfidenceCap = 0.5
    public static let defaultUntitled = "Untitled memory"

    /// One correction the validator applied.
    public struct Adjustment: Hashable, Sendable {
        public enum Rule: String, Hashable, Sendable {
            case clampedSourceRange
            case markedInferred
            /// `sourceTranscript` was not a verbatim run of the transcript; replaced by the words
            /// spoken in the step's range, or removed. Same rule as the gateway's `sourceTranscriptNotVerbatim`.
            case sourceTranscriptNotVerbatim
            case markedUnclear
            case unheardValue
            case droppedExtraStep
            case renumbered
            case raisedRiskLevel
            case droppedDuplicateWarning
            case droppedUnknownKeyFrame
            case titleFallback
        }

        public var rule: Rule
        /// The provider's step order the adjustment applied to, when it concerns one step.
        public var stepOrder: Int?
        public var detail: String

        public init(rule: Rule, stepOrder: Int? = nil, detail: String) {
            self.rule = rule
            self.stepOrder = stepOrder
            self.detail = detail
        }
    }

    /// Enforces the rules on any provider's output. Returns a corrected copy plus the corrections.
    public static func validate(
        _ response: ProcedureAnalysisResponse,
        request: ProcedureAnalysisRequest,
        untitledFallback: String = defaultUntitled
    ) -> (response: ProcedureAnalysisResponse, adjustments: [Adjustment]) {
        var output = response
        var adjustments: [Adjustment] = []
        let heardValues = Set(NumericValueExtractor.extract(from: request.transcript.fullText).map { "\($0.value) \($0.unit)" })
        let knownKeyFrames = Set(request.keyFrames.map(\.id))
        let quotableTranscript = normalisedForQuoting(request.transcript.fullText)

        for index in output.steps.indices {
            validateSourceRange(&output.steps[index], duration: request.duration, adjustments: &adjustments)
            validateQuote(&output.steps[index], transcript: request.transcript, quotable: quotableTranscript, adjustments: &adjustments)
            validateSpeechSupport(&output.steps[index], transcript: request.transcript, adjustments: &adjustments)
            validateClarity(&output.steps[index], adjustments: &adjustments)
            validateValues(&output.steps[index], heard: heardValues, uncertainties: &output.uncertainties, adjustments: &adjustments)
            if let reference = output.steps[index].keyFrameReference, !knownKeyFrames.contains(reference) {
                output.steps[index].keyFrameReference = nil
                adjustments.append(Adjustment(rule: .droppedUnknownKeyFrame, stepOrder: output.steps[index].order, detail: reference))
            }
        }

        capStepCount(&output.steps, limit: request.moments.count + request.transcript.segments.count, adjustments: &adjustments)
        renumber(&output.steps, adjustments: &adjustments)

        let floor = RiskClassifier.classify([request.transcript.fullText] + output.steps.map(\.instruction))
        if floor > output.riskLevel {
            adjustments.append(Adjustment(rule: .raisedRiskLevel, detail: "\(output.riskLevel.rawValue) → \(floor.rawValue)"))
            output.riskLevel = floor
        }

        output.warnings = deduplicated(output.warnings, adjustments: &adjustments)

        if output.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            output.title = untitledFallback
            adjustments.append(Adjustment(rule: .titleFallback, detail: untitledFallback))
        }
        return (output, adjustments)
    }

    // MARK: - Per-step rules

    /// Both ends inside `0...duration`, start no later than end. A step with only one end becomes a point.
    private static func validateSourceRange(_ step: inout AnalyzedStep, duration: TimeInterval, adjustments: inout [Adjustment]) {
        guard step.sourceStart != nil || step.sourceEnd != nil else { return }
        let clamp = { (value: TimeInterval) in min(max(0, value), max(0, duration)) }
        let start = clamp(step.sourceStart ?? step.sourceEnd ?? 0)
        let end = clamp(step.sourceEnd ?? step.sourceStart ?? 0)
        let corrected = (min(start, end), max(start, end))
        if corrected.0 != step.sourceStart || corrected.1 != step.sourceEnd {
            adjustments.append(Adjustment(rule: .clampedSourceRange, stepOrder: step.order, detail: "\(String(describing: step.sourceStart))–\(String(describing: step.sourceEnd)) → \(corrected.0)–\(corrected.1)"))
            step.sourceStart = corrected.0
            step.sourceEnd = corrected.1
        }
    }

    /// `sourceTranscript` is shown under "What <name> said" as the demonstrator's own words, so it
    /// must be a contiguous run of whole words of the transcript (after `normalisedForQuoting`).
    /// A paraphrase is replaced by the segments spoken in the step's range, verbatim, or removed
    /// when the range holds no speech. A blank quote becomes nil.
    private static func validateQuote(_ step: inout AnalyzedStep, transcript: Transcript, quotable: String, adjustments: inout [Adjustment]) {
        guard let quote = step.sourceTranscript else { return }
        if quote.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            step.sourceTranscript = nil
            return
        }
        guard !isVerbatimQuote(quote, in: quotable) else { return }
        let spoken = step.sourceRange.map { range in
            transcript.segments(in: range)
                .map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
                .joined(separator: " ")
        }
        let replacement = (spoken?.isEmpty ?? true) ? nil : spoken
        adjustments.append(Adjustment(rule: .sourceTranscriptNotVerbatim, stepOrder: step.order, detail: replacement == nil ? "removed; no range to quote from" : "replaced with the words spoken in the step's range"))
        step.sourceTranscript = replacement
    }

    /// Apostrophes and single quotes in every form: straight, curly, reversed, modifier letter, grave, acute, prime.
    private static let apostrophes: Set<Unicode.Scalar> = ["\u{27}", "\u{2018}", "\u{2019}", "\u{201B}", "\u{2BC}", "\u{60}", "\u{B4}", "\u{2032}"]

    /// The form in which a quote is compared with the transcript: canonical composition, lower case
    /// (final sigma folded), apostrophes removed, every run of anything that is not a letter, mark or
    /// digit (punctuation, double quotes, symbols, whitespace) collapsed to one space, trimmed.
    /// The gateway's `normaliseForQuoting` (validate.ts) is the same function; change both together.
    static func normalisedForQuoting(_ text: String) -> String {
        var output = String.UnicodeScalarView()
        var pendingSpace = false
        for scalar in text.precomposedStringWithCanonicalMapping.lowercased().unicodeScalars {
            if apostrophes.contains(scalar) { continue }
            guard isWordScalar(scalar) else {
                pendingSpace = true
                continue
            }
            if pendingSpace, !output.isEmpty { output.append(" ") }
            pendingSpace = false
            output.append(scalar == "\u{3C2}" ? "\u{3C3}" : scalar)
        }
        return String(output)
    }

    /// True when `quote` is a run of whole words that appears, in order and unbroken, in `quotable`
    /// (a transcript already passed through `normalisedForQuoting`).
    static func isVerbatimQuote(_ quote: String, in quotable: String) -> Bool {
        let normalised = normalisedForQuoting(quote)
        guard !normalised.isEmpty else { return false }
        return (" " + quotable + " ").range(of: " " + normalised + " ", options: .literal) != nil
    }

    /// Letters, marks and numbers: Unicode general categories L*, M* and N*, as `\p{L}\p{M}\p{N}` in JavaScript.
    private static func isWordScalar(_ scalar: Unicode.Scalar) -> Bool {
        switch scalar.properties.generalCategory {
        case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter,
             .nonspacingMark, .spacingMark, .enclosingMark,
             .decimalNumber, .letterNumber, .otherNumber:
            true
        default:
            false
        }
    }

    /// No transcript and no speech in the window means the provider inferred the step.
    private static func validateSpeechSupport(_ step: inout AnalyzedStep, transcript: Transcript, adjustments: inout [Adjustment]) {
        guard step.provenance != .unclear else { return }
        let hasTranscript = !(step.sourceTranscript ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let overlapsSpeech = step.sourceRange.map { !transcript.segments(in: $0).isEmpty } ?? false
        guard !hasTranscript, !overlapsSpeech else { return }
        if step.provenance != .inferred || step.confidence > inferredConfidenceCap {
            adjustments.append(Adjustment(rule: .markedInferred, stepOrder: step.order, detail: "no speech supports this step"))
        }
        step.provenance = .inferred
        step.confidence = min(step.confidence, inferredConfidenceCap)
    }

    /// Low confidence or no instruction: show "wasn't clearly captured" rather than a guess.
    ///
    /// A step the provider already marked unclear keeps its instruction when it has one: the
    /// assembler puts the detected moment's label there ("Hands on the dial"), which is a fact
    /// about the video, not an invented instruction.
    private static func validateClarity(_ step: inout AnalyzedStep, adjustments: inout [Adjustment]) {
        let blank = step.instruction.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        guard step.confidence < unclearConfidence || blank else { return }
        let alreadyUnclear = step.provenance == .unclear
        if !alreadyUnclear || blank {
            step.instruction = unclearInstruction
        }
        if !alreadyUnclear {
            adjustments.append(Adjustment(rule: .markedUnclear, stepOrder: step.order, detail: blank ? "empty instruction" : "confidence \(step.confidence)"))
        }
        step.provenance = .unclear
    }

    /// A value in the instruction that nobody said cannot be presented as observed.
    private static func validateValues(_ step: inout AnalyzedStep, heard: Set<String>, uncertainties: inout [String], adjustments: inout [Adjustment]) {
        guard step.provenance != .unclear else { return }
        for value in NumericValueExtractor.extract(from: step.instruction) where !heard.contains("\(value.value) \(value.unit)") {
            let note = "Value \(value.formatted) was not heard in the demonstration"
            if !uncertainties.contains(note) { uncertainties.append(note) }
            adjustments.append(Adjustment(rule: .unheardValue, stepOrder: step.order, detail: value.formatted))
            step.provenance = .inferred
        }
    }

    // MARK: - Whole-list rules

    /// The recording can support at most one step per moment and per spoken segment.
    private static func capStepCount(_ steps: inout [AnalyzedStep], limit: Int, adjustments: inout [Adjustment]) {
        guard steps.count > limit else { return }
        // Drop the least confident first; among equals, the later ones.
        let ranked = steps.enumerated().sorted { lhs, rhs in
            lhs.element.confidence != rhs.element.confidence ? lhs.element.confidence < rhs.element.confidence : lhs.offset > rhs.offset
        }
        let dropped = Set(ranked.prefix(steps.count - max(0, limit)).map(\.offset))
        for offset in dropped.sorted() {
            adjustments.append(Adjustment(rule: .droppedExtraStep, stepOrder: steps[offset].order, detail: "more steps than moments and segments (\(limit))"))
        }
        steps = steps.enumerated().filter { !dropped.contains($0.offset) }.map(\.element)
    }

    /// Steps in time order, numbered 1…n. Steps without a range keep their relative position at the end.
    private static func renumber(_ steps: inout [AnalyzedStep], adjustments: inout [Adjustment]) {
        let sorted = steps.enumerated().sorted { lhs, rhs in
            switch (lhs.element.sourceStart, rhs.element.sourceStart) {
            case (let a?, let b?) where a != b: a < b
            case (nil, .some): false
            case (.some, nil): true
            default: lhs.offset < rhs.offset
            }
        }.map(\.element)
        for (index, step) in sorted.enumerated() where step.order != index + 1 {
            adjustments.append(Adjustment(rule: .renumbered, stepOrder: step.order, detail: "\(step.order) → \(index + 1)"))
        }
        steps = sorted.enumerated().map { index, step in
            var step = step
            step.order = index + 1
            return step
        }
    }

    /// Same warning twice (ignoring case and spacing) is noise.
    private static func deduplicated(_ warnings: [String], adjustments: inout [Adjustment]) -> [String] {
        var seen = Set<String>()
        var kept: [String] = []
        for warning in warnings {
            let key = warning.lowercased().split(whereSeparator: \.isWhitespace).joined(separator: " ")
            if key.isEmpty || !seen.insert(key).inserted {
                adjustments.append(Adjustment(rule: .droppedDuplicateWarning, detail: warning))
            } else {
                kept.append(warning)
            }
        }
        return kept
    }
}
