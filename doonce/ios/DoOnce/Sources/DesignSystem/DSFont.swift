import SwiftUI
import UIKit

/// Text styles from tokens.json, scaled with Dynamic Type. Always SF Pro (system).
///
///     Text("Your world remembers.").font(.ds(.largeTitle))
public enum DSTextStyle: CaseIterable {
    case display, largeTitle, title1, title2, title3, headline, body, callout, subheadline, footnote, caption, label, numeral

    var spec: Tokens.TextStyleSpec {
        switch self {
        case .display: Tokens.Text.display
        case .largeTitle: Tokens.Text.largeTitle
        case .title1: Tokens.Text.title1
        case .title2: Tokens.Text.title2
        case .title3: Tokens.Text.title3
        case .headline: Tokens.Text.headline
        case .body: Tokens.Text.body
        case .callout: Tokens.Text.callout
        case .subheadline: Tokens.Text.subheadline
        case .footnote: Tokens.Text.footnote
        case .caption: Tokens.Text.caption
        case .label: Tokens.Text.label
        case .numeral: Tokens.Text.numeral
        }
    }

    /// The UIKit text style whose Dynamic Type curve this style follows.
    var relative: UIFont.TextStyle {
        switch self {
        case .display, .numeral, .largeTitle: .largeTitle
        case .title1: .title1
        case .title2: .title2
        case .title3: .title3
        case .headline: .headline
        case .body: .body
        case .callout: .callout
        case .subheadline: .subheadline
        case .footnote: .footnote
        case .caption, .label: .caption1
        }
    }

    var weight: Font.Weight {
        switch spec.weight {
        case 800...: .heavy
        case 700...: .bold
        case 600...: .semibold
        case 500...: .medium
        default: .regular
        }
    }
}

extension Font {
    /// Dynamic-Type-aware font for a DoOnce text style.
    static func ds(_ style: DSTextStyle) -> Font {
        let size = UIFontMetrics(forTextStyle: style.relative).scaledValue(for: style.spec.size)
        return .system(size: size, weight: style.weight, design: .default)
    }
}

/// Applies font, tracking and (for numerals) monospaced digits in one go.
struct DSTextModifier: ViewModifier {
    let style: DSTextStyle
    func body(content: Content) -> some View {
        let base = content.font(.ds(style)).tracking(style.spec.tracking)
        if style == .numeral { base.monospacedDigit() } else { base }
    }
}

extension View {
    /// `Text("2 of 5").dsText(.numeral)`
    func dsText(_ style: DSTextStyle) -> some View { modifier(DSTextModifier(style: style)) }
}
