import Foundation

/// A sentence the demonstrator flagged as mattering: "Never open it fast."
public struct ImportantStatement: Hashable, Sendable {
    public var text: String
    /// The keyword that flagged it, lowercased.
    public var keyword: String

    public init(text: String, keyword: String) {
        self.text = text
        self.keyword = keyword
    }
}

/// Picks out the sentences where the person teaching said "this matters".
public enum ImportantStatementDetector {
    /// Words that mark an important statement.
    public static let keywords: Set<String> = [
        "important", "never", "remember", "careful", "always", "danger", "dangerous", "warning", "must",
    ]

    /// Important sentences in the text, in order.
    public static func detect(in text: String) -> [ImportantStatement] {
        TextTokenizer.sentences(text).compactMap { sentence in
            let words = Set(TextTokenizer.words(sentence))
            guard let keyword = keywords.first(where: { words.contains($0) }) else { return nil }
            return ImportantStatement(text: sentence, keyword: keyword)
        }
    }

    public static func isImportant(_ text: String) -> Bool {
        !detect(in: text).isEmpty
    }
}
