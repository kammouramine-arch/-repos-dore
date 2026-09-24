import Foundation

/// Product copy loaded from `strings.json`, the source of truth in `design/copy`.
///
/// Supports `{name}` placeholders and `one` / `other` (plus optional `zero`) plural forms.
/// Missing keys fall back to the fallback language, then to the key itself.
public struct Localization: Sendable {
    public enum Error: Swift.Error {
        case resourceMissing
        case invalidFormat
    }

    /// One entry in the strings file.
    public enum Entry: Hashable, Sendable {
        case text(String)
        case plural(zero: String?, one: String, other: String)
        case list([String])
    }

    public let language: String
    public let fallbackLanguage: String
    private let tables: [String: [String: Entry]]

    /// Loads a strings file from JSON data.
    public init(data: Data, language: String = "en", fallbackLanguage: String = "en") throws {
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw Error.invalidFormat
        }
        var tables: [String: [String: Entry]] = [:]
        for (languageCode, value) in root where !languageCode.hasPrefix("$") {
            guard let table = value as? [String: Any] else { continue }
            tables[languageCode] = table.compactMapValues(Self.entry)
        }
        self.tables = tables
        self.language = language
        self.fallbackLanguage = fallbackLanguage
    }

    /// Loads the copy of `strings.json` bundled with this package.
    public static func bundled(language: String = "en") throws -> Localization {
        guard let url = Bundle.module.url(forResource: "strings", withExtension: "json") else {
            throw Error.resourceMissing
        }
        return try Localization(data: try Data(contentsOf: url), language: language)
    }

    /// Languages present in the file.
    public var availableLanguages: [String] { tables.keys.sorted() }

    /// The raw entry for a key in the current language, or the fallback.
    public func entry(for key: String) -> Entry? {
        tables[language]?[key] ?? tables[fallbackLanguage]?[key]
    }

    /// A plain string with placeholders filled: `string("look.found", ["object": "boiler"])`.
    public func string(_ key: String, _ arguments: [String: String] = [:]) -> String {
        switch entry(for: key) {
        case .text(let text): Self.fill(text, arguments)
        case .plural(_, _, let other): Self.fill(other, arguments)
        case .list(let items): items.joined(separator: ", ")
        case nil: key
        }
    }

    /// A pluralised string. `{n}` is always available; extra arguments are filled too.
    public func plural(_ key: String, count: Int, _ arguments: [String: String] = [:]) -> String {
        var arguments = arguments
        arguments["n"] = arguments["n"] ?? String(count)
        switch entry(for: key) {
        case .plural(let zero, let one, let other):
            let form: String
            if count == 0, let zero { form = zero } else if count == 1 { form = one } else { form = other }
            return Self.fill(form, arguments)
        case .text(let text):
            return Self.fill(text, arguments)
        case .list(let items):
            return items.joined(separator: ", ")
        case nil:
            return key
        }
    }

    /// A list entry, such as `firstRun.examples`.
    public func list(_ key: String) -> [String] {
        if case .list(let items) = entry(for: key) { return items }
        return []
    }

    static func fill(_ template: String, _ arguments: [String: String]) -> String {
        arguments.reduce(template) { text, pair in
            text.replacingOccurrences(of: "{\(pair.key)}", with: pair.value)
        }
    }

    private static func entry(from value: Any) -> Entry? {
        if let text = value as? String { return .text(text) }
        if let items = value as? [String] { return .list(items) }
        if let forms = value as? [String: String], let other = forms["other"] {
            return .plural(zero: forms["zero"], one: forms["one"] ?? other, other: other)
        }
        return nil
    }
}
