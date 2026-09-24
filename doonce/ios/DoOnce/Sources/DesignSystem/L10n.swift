import Foundation
import DoOnceCore

/// Copy access. Keys live in design/copy/strings.json (mirrored in Resources/Localizable.xcstrings
/// and DoOnceCore's bundled strings.json). No concatenated strings in views.
///
///     Text(L10n.string("memory.greeting"))
///     Text(L10n.plural("object.procedures", n: memories.count))
enum L10n {
    nonisolated(unsafe) private static var table: Localization? = try? Localization.bundled(language: Locale.current.language.languageCode?.identifier ?? "en")

    static func string(_ key: String, _ args: [String: String] = [:]) -> String {
        // Prefer the app's String Catalog (Xcode localisation), fall back to the core table.
        let catalog = String(localized: String.LocalizationValue(key))
        if catalog != key { return args.reduce(catalog) { $0.replacingOccurrences(of: "{\($1.key)}", with: $1.value).replacingOccurrences(of: "%@", with: $1.value) } }
        return table?.string(key, args) ?? key
    }

    static func plural(_ key: String, n: Int, _ args: [String: String] = [:]) -> String {
        table?.plural(key, count: n, args) ?? "\(n)"
    }

    static func list(_ key: String) -> [String] { table?.list(key) ?? [] }
}
