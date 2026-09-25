import Foundation

/// Decides how dangerous a procedure is from the words used to describe it.
///
/// Keyword-based on purpose: transparent, testable and easy to tune. A memory's risk level is the
/// highest level triggered anywhere in its text.
public enum RiskClassifier {
    /// Words that mean a mistake could hurt someone: energy sources, moving parts, chemicals.
    public static let highRiskKeywords: Set<String> = [
        "gas", "electric", "electrical", "electricity", "mains", "brake", "brakes", "blade", "blades",
        "chemical", "chemicals", "bleach", "live", "voltage", "fuse", "fusebox",
    ]

    /// Words that mean care is needed but a mistake is recoverable.
    public static let mediumRiskKeywords: Set<String> = [
        "boiler", "hot", "steam", "pressure", "heat", "heating", "sharp", "ladder", "engine",
    ]

    /// The risk level for a piece of text.
    public static func classify(_ text: String) -> RiskLevel {
        classify(tokens: TextTokenizer.words(text))
    }

    /// The risk level across several pieces of text; the highest wins.
    public static func classify(_ texts: [String]) -> RiskLevel {
        texts.map(classify).max() ?? .low
    }

    /// The keywords that triggered a level, for explaining the classification to the user.
    public static func triggers(in text: String) -> [String] {
        let tokens = TextTokenizer.words(text)
        var seen = Set<String>()
        return tokens.filter { token in
            (highRiskKeywords.contains(token) || mediumRiskKeywords.contains(token)) && seen.insert(token).inserted
        }
    }

    private static func classify(tokens: [String]) -> RiskLevel {
        var level = RiskLevel.low
        for token in tokens {
            if highRiskKeywords.contains(token) { return .high }
            if mediumRiskKeywords.contains(token) { level = .medium }
        }
        return level
    }
}
