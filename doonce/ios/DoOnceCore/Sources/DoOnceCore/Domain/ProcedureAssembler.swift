import Foundation

/// Turns a transcript and the moments the analysis detected into steps with provenance.
///
/// The rule: a step exists only where a detected moment or spoken instruction exists. The
/// assembler never pads a procedure with steps it did not see or hear.
///
/// - A moment that was seen (`userMarked`, `actionDetected`) with speech → `.observed`.
/// - A moment that was only heard (`speechCue`, `sceneChange`) with speech → `.inferred`.
/// - A moment with no speech at all → `.unclear`, shown as "This part wasn't clearly captured."
/// - With no moments at all, each instruction-like transcript segment becomes an `.inferred` step.
public struct ProcedureAssembler: Sendable {
    /// What the assembler found, ready to become a `Memory`.
    public struct Result: Hashable, Sendable {
        public var steps: [Step]
        public var warnings: [Warning]
        public var riskLevel: RiskLevel
        public var tools: [String]
        public var importantStatements: [ImportantStatement]
        public var measuredValues: [MeasuredValue]
    }

    /// Speech shorter than this inside a moment window counts as "nothing said".
    public var minimumSpokenWords: Int
    /// Tools we know how to spot in speech.
    public var toolLexicon: Set<String>

    public init(
        minimumSpokenWords: Int = 2,
        toolLexicon: Set<String> = ProcedureAssembler.defaultToolLexicon
    ) {
        self.minimumSpokenWords = minimumSpokenWords
        self.toolLexicon = toolLexicon
    }

    public static let defaultToolLexicon: Set<String> = [
        "screwdriver", "wrench", "spanner", "pliers", "hex key", "allen key", "radiator key", "torch",
        "cloth", "brush", "bucket", "towel", "gloves", "tape", "hammer", "drill", "hose", "ladder",
        "cleaning tablet", "blind filter", "descaler", "filter",
    ]

    /// Builds steps from what was said and what was seen.
    public func assemble(transcript: Transcript, moments: [DetectedMoment], keyFrames: [MediaRef] = []) -> Result {
        let orderedMoments = moments.sorted { $0.time < $1.time }
        let steps: [Step]
        if orderedMoments.isEmpty {
            steps = stepsFromSpeechOnly(transcript)
        } else {
            steps = stepsFromMoments(orderedMoments, transcript: transcript, keyFrames: keyFrames)
        }

        let fullText = transcript.fullText
        let important = ImportantStatementDetector.detect(in: fullText)
        let risk = RiskClassifier.classify(fullText)
        let warnings = steps.compactMap(\.warning)
        return Result(
            steps: steps,
            warnings: warnings,
            riskLevel: risk,
            tools: tools(in: fullText),
            importantStatements: important,
            measuredValues: NumericValueExtractor.extract(from: fullText)
        )
    }

    // MARK: - Building steps

    private func stepsFromMoments(_ moments: [DetectedMoment], transcript: Transcript, keyFrames: [MediaRef]) -> [Step] {
        let end = max(transcript.duration, moments.last?.time ?? 0)
        var steps: [Step] = []
        for (index, moment) in moments.enumerated() {
            let windowEnd = index + 1 < moments.count ? moments[index + 1].time : end
            let range = moment.time...max(moment.time, windowEnd)
            let spoken = transcript.text(in: range).trimmingCharacters(in: .whitespacesAndNewlines)
            let spokenWords = TextTokenizer.words(spoken)
            let keyFrame = index < keyFrames.count ? keyFrames[index] : nil

            if spokenWords.count < minimumSpokenWords {
                steps.append(Step(
                    order: steps.count + 1,
                    instruction: moment.label ?? "This part wasn't clearly captured.",
                    sourceRange: range,
                    sourceTranscript: spoken.isEmpty ? nil : spoken,
                    keyFrame: keyFrame,
                    provenance: .unclear,
                    completionRule: .manual
                ))
                continue
            }

            steps.append(makeStep(
                order: steps.count + 1,
                spoken: spoken,
                range: range,
                keyFrame: keyFrame,
                provenance: moment.isObserved ? .observed : .inferred
            ))
        }
        return steps
    }

    private func stepsFromSpeechOnly(_ transcript: Transcript) -> [Step] {
        var steps: [Step] = []
        for segment in transcript.segments {
            let sentences = TextTokenizer.sentences(segment.text)
            guard sentences.contains(where: isInstruction) else { continue }
            steps.append(makeStep(
                order: steps.count + 1,
                spoken: segment.text,
                range: segment.range,
                keyFrame: nil,
                provenance: .inferred
            ))
        }
        return steps
    }

    private func makeStep(order: Int, spoken: String, range: ClosedRange<TimeInterval>, keyFrame: MediaRef?, provenance: Provenance) -> Step {
        let sentences = TextTokenizer.sentences(spoken)
        let instructionSentence = sentences.first(where: isInstruction) ?? sentences.first ?? spoken
        let instruction = Self.tidyInstruction(instructionSentence)
        let details = sentences.filter { $0 != instructionSentence }.joined(separator: " ")

        let warning = ImportantStatementDetector.detect(in: spoken).first.map {
            Warning(text: $0.text, severity: max(.medium, RiskClassifier.classify($0.text)), trigger: $0.keyword)
        }

        return Step(
            order: order,
            instruction: instruction,
            details: details.isEmpty ? nil : details,
            sourceRange: range,
            sourceTranscript: spoken,
            keyFrame: keyFrame,
            warning: warning,
            provenance: provenance,
            completionRule: Self.completionRule(for: spoken)
        )
    }

    // MARK: - Language heuristics

    /// Verbs that usually start a spoken instruction.
    static let instructionVerbs: Set<String> = [
        "turn", "open", "close", "press", "hold", "wait", "stop", "check", "remove", "pull", "push", "lift",
        "set", "switch", "unscrew", "screw", "tighten", "loosen", "let", "fill", "take", "put", "plug",
        "unplug", "insert", "run", "restart", "reset", "look", "watch", "make", "keep", "find", "go",
        "lock", "unlock", "flip", "twist", "release", "start", "give", "leave", "pour", "rinse", "wipe",
        "clean", "spray", "attach", "connect", "disconnect", "slide", "lower", "raise", "top", "empty",
        "don't", "dont", "never", "always", "you",
    ]

    /// Filler that speech-to-text keeps at the start of sentences.
    static let leadingFiller: Set<String> = [
        "so", "okay", "ok", "right", "now", "um", "uh", "then", "and", "next", "basically", "just", "well", "first",
    ]

    /// True when the sentence reads like something to do, not narration.
    func isInstruction(_ sentence: String) -> Bool {
        let words = TextTokenizer.words(sentence)
        let meaningful = words.drop { Self.leadingFiller.contains($0) }
        guard let first = meaningful.first else { return false }
        if Self.instructionVerbs.contains(first) { return true }
        // "you want to turn", "you just press"
        if first == "you", let verb = meaningful.dropFirst().first(where: { !Self.leadingFiller.contains($0) && $0 != "want" && $0 != "to" && $0 != "need" }) {
            return Self.instructionVerbs.contains(verb)
        }
        return false
    }

    /// Strips filler, capitalises and ends with a full stop.
    static func tidyInstruction(_ sentence: String) -> String {
        var text = sentence.trimmingCharacters(in: .whitespacesAndNewlines)
        var stripped = true
        while stripped {
            stripped = false
            for filler in leadingFiller {
                for separator in [", ", " "] {
                    let prefix = filler + separator
                    if text.lowercased().hasPrefix(prefix), text.count > prefix.count {
                        text = String(text.dropFirst(prefix.count))
                        stripped = true
                    }
                }
            }
        }
        text = text.trimmingCharacters(in: CharacterSet(charactersIn: ",; "))
        guard let first = text.first else { return sentence }
        text = first.uppercased() + text.dropFirst()
        if let last = text.last, ![".", "!", "?"].contains(last) { text.append(".") }
        return text
    }

    /// Phrases that mean "keep going until the gauge shows this".
    static let completionPhraseCues = ["stop when", "should be", "get to", "gets to", "up to", "stop at"]
    static let completionWordCues: Set<String> = ["reach", "reaches", "until", "hit", "hits"]

    /// A gauge rule when the speech says to stop at a value; otherwise manual.
    static func completionRule(for spoken: String) -> CompletionRule {
        let lowered = spoken.lowercased()
        let words = Set(TextTokenizer.words(spoken))
        let hasCue = completionPhraseCues.contains(where: lowered.contains) || !words.isDisjoint(with: completionWordCues)
        guard hasCue, let value = NumericValueExtractor.first(in: spoken) else { return .manual }
        return .gaugeReaches(value: value.value, unit: value.unit)
    }

    private func tools(in text: String) -> [String] {
        let lowered = text.lowercased()
        return toolLexicon.filter { lowered.contains($0) }.sorted()
    }
}
