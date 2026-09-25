import Foundation

/// What the user wants Do mode to do.
public enum DoIntent: Hashable, Sendable {
    case next
    case back
    case repeatStep
    /// Show the key frame or clip for this step.
    case showMe
    case pause
    /// Replay what the demonstrator said for this step.
    case whatDidHeSay
    /// Ask for the number in this step: "what pressure?", "how many bar?".
    case whatValue(unit: String?)
    /// Jump to the source recording ("See original").
    case playOriginal
    case done
}

/// Maps a spoken phrase to a `DoIntent`, tolerating filler, politeness and partial matches.
///
/// Matching is on tokens: filler words are dropped, then patterns are tried longest-first so
/// "what did he say" wins over "what" and "play original" over "play".
public struct VoiceCommandParser: Sendable {
    public init() {}

    /// Words that carry no intent.
    public static let fillerWords: Set<String> = [
        "um", "uh", "er", "erm", "hmm", "like", "please", "ok", "okay", "so", "hey", "doonce", "can", "could",
        "you", "just", "now", "the", "a", "an", "to", "me", "step", "one", "then", "and", "yeah", "well",
        "would", "will", "i", "want", "go", "on", "it", "of", "this", "for", "thanks", "thank", "there",
    ]

    /// Units the user might ask about.
    public static let knownUnits: [String: String] = [
        "bar": "bar", "bars": "bar", "psi": "psi",
        "degrees": "°C", "degree": "°C", "celsius": "°C", "temperature": "°C",
        "volts": "V", "volt": "V", "amps": "A", "amp": "A",
        "litres": "L", "liters": "L", "millilitres": "ml", "ml": "ml",
        "minutes": "min", "minute": "min", "seconds": "s", "second": "s",
        "percent": "%", "grams": "g", "gram": "g", "turns": "turns", "clicks": "clicks",
    ]

    /// Token patterns in priority order (longer, more specific first).
    static let patterns: [([String], DoIntent)] = [
        (["what", "did", "he", "say"], .whatDidHeSay),
        (["what", "did", "she", "say"], .whatDidHeSay),
        (["what", "did", "they", "say"], .whatDidHeSay),
        (["what", "did", "dad", "say"], .whatDidHeSay),
        (["what", "was", "said"], .whatDidHeSay),
        (["what", "did", "say"], .whatDidHeSay),
        (["what", "he", "say"], .whatDidHeSay),
        (["what", "she", "say"], .whatDidHeSay),
        (["say", "that", "again"], .repeatStep),
        (["say", "again"], .repeatStep),
        (["play", "original"], .playOriginal),
        (["see", "original"], .playOriginal),
        (["show", "original"], .playOriginal),
        (["original", "clip"], .playOriginal),
        (["original", "video"], .playOriginal),
        (["play", "clip"], .playOriginal),
        (["play", "video"], .playOriginal),
        (["original"], .playOriginal),
        (["show", "me"], .showMe),
        (["show", "it"], .showMe),
        (["let", "see"], .showMe),
        (["show"], .showMe),
        (["what", "next"], .next),
        (["next"], .next),
        (["continue"], .next),
        (["forward"], .next),
        (["skip"], .next),
        (["go", "back"], .back),
        (["back"], .back),
        (["previous"], .back),
        (["last"], .back),
        (["repeat"], .repeatStep),
        (["again"], .repeatStep),
        (["more", "time"], .repeatStep),
        (["what"], .repeatStep),
        (["pardon"], .repeatStep),
        (["hold"], .pause),
        (["pause"], .pause),
        (["wait"], .pause),
        (["stop"], .pause),
        (["all", "done"], .done),
        (["done"], .done),
        (["finished"], .done),
        (["finish"], .done),
        (["complete"], .done),
        (["completed"], .done),
    ]

    /// Words that turn "what ..." into a value question.
    static let valueCues: Set<String> = [
        "pressure", "value", "number", "setting", "much", "many", "level", "reading", "temperature", "figure",
    ]

    /// The intent behind an utterance, or nil when nothing recognisable was said.
    public func parse(_ utterance: String) -> DoIntent? {
        let tokens = TextTokenizer.words(utterance).filter { !Self.fillerWords.contains($0) }
        guard !tokens.isEmpty else { return nil }

        if let value = valueIntent(tokens) { return value }
        // "what pressure did he say?" — a "what … say" question is always a replay, whatever sits between.
        if tokens.contains("what"), tokens.contains("say") || tokens.contains("said") { return .whatDidHeSay }

        for (pattern, intent) in Self.patterns where Self.contains(tokens, subsequence: pattern) {
            return intent
        }
        return nil
    }

    /// "what pressure", "how many bar", "what's the value".
    private func valueIntent(_ tokens: [String]) -> DoIntent? {
        let unit = tokens.compactMap { Self.knownUnits[$0] }.first
        let asksQuestion = tokens.contains("what") || tokens.contains("how") || tokens.contains("which")
        let asksValue = tokens.contains { Self.valueCues.contains($0) }
        guard asksQuestion, asksValue || unit != nil else { return nil }
        // "what did he say about the pressure" is still a "what did he say".
        if tokens.contains("say") || tokens.contains("said") { return nil }
        return .whatValue(unit: unit)
    }

    private static func contains(_ tokens: [String], subsequence pattern: [String]) -> Bool {
        guard pattern.count <= tokens.count else { return false }
        for start in 0...(tokens.count - pattern.count) where Array(tokens[start..<start + pattern.count]) == pattern {
            return true
        }
        return false
    }
}
