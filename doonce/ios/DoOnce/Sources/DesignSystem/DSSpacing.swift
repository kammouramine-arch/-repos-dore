import SwiftUI

/// Spacing, radii and sizes from tokens.json.
public enum DS {
    public enum Space {
        public static let s1: CGFloat = Tokens.Space.s1
        public static let s2: CGFloat = Tokens.Space.s2
        public static let s3: CGFloat = Tokens.Space.s3
        public static let s4: CGFloat = Tokens.Space.s4
        public static let s5: CGFloat = Tokens.Space.s5
        public static let s6: CGFloat = Tokens.Space.s6
        public static let s8: CGFloat = Tokens.Space.s8
        public static let s10: CGFloat = Tokens.Space.s10
        public static let s12: CGFloat = Tokens.Space.s12
        public static let s16: CGFloat = Tokens.Space.s16
        /// Horizontal page gutter.
        public static let gutter: CGFloat = Tokens.Space.gutter
    }
    public enum Radius {
        public static let small: CGFloat = Tokens.Radius.small
        public static let medium: CGFloat = Tokens.Radius.medium
        public static let large: CGFloat = Tokens.Radius.large
        public static let xlarge: CGFloat = Tokens.Radius.xlarge
        public static let sheet: CGFloat = Tokens.Radius.sheet
    }
    public enum Size {
        public static let touchMin: CGFloat = Tokens.Sizing.touchMin
        public static let touchComfort: CGFloat = Tokens.Sizing.touchComfort
        public static let centerAction: CGFloat = Tokens.Sizing.centerAction
        public static let navHeight: CGFloat = Tokens.Sizing.navHeight
        public static let recordButton: CGFloat = Tokens.Sizing.recordButton
        public static let avatar: CGFloat = Tokens.Sizing.avatar
        /// Space to leave under scrolling content so the floating tab bar never covers it.
        public static let tabBarClearance: CGFloat = 130
    }
}
