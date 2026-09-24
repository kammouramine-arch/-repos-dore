import SwiftUI
import UIKit

extension Color {
    /// A dynamic colour that resolves the light/dark pair against the current trait collection.
    init(pair: Tokens.ColorPair) {
        self.init(uiColor: UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? pair.dark : pair.light
            return UIColor(red: c.r, green: c.g, blue: c.b, alpha: c.a)
        })
    }
}

extension ShapeStyle where Self == Color {
    /// `Rectangle().fill(.ds(.signal))`
    static func ds(_ color: Color) -> Color { color }
}
