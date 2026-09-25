import SwiftUI

/// Builds a `Text` from copy where `*…*` marks the emphasised value, so a transcript line can read
/// "stop when it reaches *1.5 bar*" with the value in signal. Markup lives in strings.json, not in views.
enum MarkedText {
    static func text(_ source: String, emphasis: Color = DSColor.signal, weight: Font.Weight = .bold) -> Text {
        let parts = source.components(separatedBy: "*")
        var result = Text("")
        for (index, part) in parts.enumerated() where !part.isEmpty {
            if index % 2 == 1 {
                result = result + Text(part).foregroundStyle(emphasis).fontWeight(weight)
            } else {
                result = result + Text(part)
            }
        }
        return result
    }
}
