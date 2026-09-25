import Foundation

/// Naive tokenisation shared by search, voice parsing and keyword detection.
///
/// Lowercases, splits on anything that is not a letter or digit (keeping decimals like `1.5`),
/// and optionally applies a very light English stemmer so "showed" and "show" meet.
public enum TextTokenizer {
    /// Words with no search value on their own.
    public static let stopWords: Set<String> = [
        "a", "an", "the", "of", "for", "to", "in", "on", "at", "by", "with", "and", "or",
        "me", "my", "i", "you", "your", "we", "our", "it", "its", "this", "that", "these", "those",
        "thing", "things", "stuff", "one",
        "what", "which", "who", "how", "when", "where", "why",
        "did", "do", "does", "done", "was", "is", "are", "be", "been", "were",
        "show", "showed", "shown", "say", "said", "says", "tell", "told",
        "about", "from", "up", "down", "into", "again", "so", "just", "like",
    ]

    /// Splits text into lowercase word tokens. Numbers with a decimal point stay whole.
    public static func words(_ text: String) -> [String] {
        var tokens: [String] = []
        var current = ""
        let scalars = Array(text.lowercased())
        for (index, character) in scalars.enumerated() {
            if character.isLetter || character.isNumber {
                current.append(character)
            } else if character == ".",
                      !current.isEmpty, current.last?.isNumber == true,
                      index + 1 < scalars.count, scalars[index + 1].isNumber {
                current.append(character)
            } else {
                if !current.isEmpty { tokens.append(current) }
                current = ""
            }
        }
        if !current.isEmpty { tokens.append(current) }
        return tokens
    }

    /// Words minus stop words, stemmed. This is what search indexes and queries share.
    public static func searchTokens(_ text: String) -> [String] {
        words(text)
            .filter { !stopWords.contains($0) && ($0.count > 1 || $0.first?.isNumber == true) }
            .map(stem)
    }

    /// A deliberately small stemmer: plurals and common verb endings only.
    public static func stem(_ word: String) -> String {
        guard word.count > 3, word.first?.isNumber == false else { return word }
        if word.hasSuffix("ies") { return String(word.dropLast(3)) + "y" }
        if word.hasSuffix("sses") { return String(word.dropLast(2)) }
        if word.hasSuffix("ing"), word.count > 5 { return String(word.dropLast(3)) }
        if word.hasSuffix("ed"), word.count > 4 { return String(word.dropLast(2)) }
        if word.hasSuffix("es"), word.count > 4,
           ["sh", "ch", "ss", "x", "z"].contains(where: { word.dropLast(2).hasSuffix($0) }) {
            return String(word.dropLast(2))
        }
        if word.hasSuffix("s"), !word.hasSuffix("ss"), !word.hasSuffix("us") { return String(word.dropLast()) }
        return word
    }

    /// Splits text into sentences on `.`, `!`, `?` and newlines. Decimal points are preserved.
    public static func sentences(_ text: String) -> [String] {
        var sentences: [String] = []
        var current = ""
        let characters = Array(text)
        for (index, character) in characters.enumerated() {
            current.append(character)
            let isTerminator = character == "!" || character == "?" || character == "\n"
                || (character == "." && !(index + 1 < characters.count && characters[index + 1].isNumber))
            if isTerminator {
                let trimmed = current.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty { sentences.append(trimmed) }
                current = ""
            }
        }
        let trimmed = current.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { sentences.append(trimmed) }
        return sentences
    }
}
