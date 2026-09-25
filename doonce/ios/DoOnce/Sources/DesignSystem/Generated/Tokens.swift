// Generated from design/foundations/tokens.json — do not edit by hand.
// Colors are exposed as light/dark pairs; DSColor resolves them against the environment.

import Foundation

public enum Tokens {
    public struct RGBA: Sendable, Hashable { public let r: Double, g: Double, b: Double, a: Double
        public init(_ r: Double, _ g: Double, _ b: Double, _ a: Double) { self.r = r; self.g = g; self.b = b; self.a = a } }
    public struct ColorPair: Sendable, Hashable { public let light: RGBA; public let dark: RGBA }

    public enum Color {
        public static let backgroundPrimary = ColorPair(light: RGBA(0.9686, 0.9686, 0.9569, 1), dark: RGBA(0.0353, 0.0392, 0.0353, 1))
        public static let backgroundElevated = ColorPair(light: RGBA(1, 1, 1, 1), dark: RGBA(0.0863, 0.0902, 0.0824, 1))
        public static let backgroundSunken = ColorPair(light: RGBA(0.9333, 0.9333, 0.9137, 1), dark: RGBA(0.0157, 0.0196, 0.0157, 1))
        public static let backgroundInverse = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 1), dark: RGBA(0.949, 0.949, 0.9333, 1))
        public static let textPrimary = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 1), dark: RGBA(0.949, 0.949, 0.9333, 1))
        public static let textSecondary = ColorPair(light: RGBA(0.4, 0.4078, 0.3725, 1), dark: RGBA(0.6118, 0.6196, 0.5882, 1))
        public static let textTertiary = ColorPair(light: RGBA(0.6039, 0.6118, 0.5765, 1), dark: RGBA(0.4157, 0.4235, 0.3961, 1))
        public static let textOnSignal = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 1), dark: RGBA(0.0667, 0.0706, 0.0627, 1))
        public static let textOnInverse = ColorPair(light: RGBA(0.949, 0.949, 0.9333, 1), dark: RGBA(0.0667, 0.0706, 0.0627, 1))
        public static let textOnMedia = ColorPair(light: RGBA(0.949, 0.949, 0.9333, 1), dark: RGBA(0.949, 0.949, 0.9333, 1))
        public static let signal = ColorPair(light: RGBA(0.5451, 0.8314, 0, 1), dark: RGBA(0.8118, 0.949, 0.3529, 1))
        public static let signalStrong = ColorPair(light: RGBA(0.4275, 0.7059, 0, 1), dark: RGBA(0.8667, 1, 0.4784, 1))
        public static let signalText = ColorPair(light: RGBA(0.2471, 0.4902, 0, 1), dark: RGBA(0.8118, 0.949, 0.3529, 1))
        public static let signalSoft = ColorPair(light: RGBA(0.9176, 0.9686, 0.8118, 1), dark: RGBA(0.1176, 0.1647, 0.0431, 1))
        public static let success = ColorPair(light: RGBA(0.4275, 0.7059, 0, 1), dark: RGBA(0.8118, 0.949, 0.3529, 1))
        public static let warning = ColorPair(light: RGBA(0.851, 0.6039, 0, 1), dark: RGBA(0.949, 0.7137, 0.2353, 1))
        public static let warningSoft = ColorPair(light: RGBA(0.9843, 0.9451, 0.8392, 1), dark: RGBA(0.1725, 0.1373, 0.0471, 1))
        public static let warningText = ColorPair(light: RGBA(0.5412, 0.3804, 0, 1), dark: RGBA(0.949, 0.7137, 0.2353, 1))
        public static let danger = ColorPair(light: RGBA(0.7843, 0.2235, 0.1804, 1), dark: RGBA(0.9412, 0.3922, 0.3529, 1))
        public static let dangerSoft = ColorPair(light: RGBA(0.9843, 0.8902, 0.8784, 1), dark: RGBA(0.1804, 0.0784, 0.0706, 1))
        public static let recording = ColorPair(light: RGBA(0.898, 0.2667, 0.2275, 1), dark: RGBA(1, 0.3529, 0.3059, 1))
        public static let separator = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 0.08), dark: RGBA(0.949, 0.949, 0.9333, 0.1))
        public static let separatorStrong = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 0.16), dark: RGBA(0.949, 0.949, 0.9333, 0.18))
        public static let fillSubtle = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 0.05), dark: RGBA(0.949, 0.949, 0.9333, 0.06))
        public static let fillMedium = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 0.1), dark: RGBA(0.949, 0.949, 0.9333, 0.11))
        public static let fillStrong = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 0.16), dark: RGBA(0.949, 0.949, 0.9333, 0.18))
        public static let glassNavigation = ColorPair(light: RGBA(0.9686, 0.9686, 0.9569, 0.74), dark: RGBA(0.0706, 0.0745, 0.0667, 0.68))
        public static let glassControl = ColorPair(light: RGBA(1, 1, 1, 0.62), dark: RGBA(0.149, 0.1529, 0.1412, 0.58))
        public static let glassOnMedia = ColorPair(light: RGBA(0.0784, 0.0824, 0.0745, 0.4), dark: RGBA(0.0353, 0.0392, 0.0353, 0.44))
        public static let scrimMedia = ColorPair(light: RGBA(0.0353, 0.0392, 0.0353, 0.55), dark: RGBA(0.0353, 0.0392, 0.0353, 0.62))
        public static let shadow = ColorPair(light: RGBA(0.0667, 0.0706, 0.0627, 0.14), dark: RGBA(0, 0, 0, 0.55))
    }

    public enum Space {
        public static let s1: Double = 4
        public static let s2: Double = 8
        public static let s3: Double = 12
        public static let s4: Double = 16
        public static let s5: Double = 20
        public static let s6: Double = 24
        public static let s8: Double = 32
        public static let s10: Double = 40
        public static let s12: Double = 48
        public static let s16: Double = 64
        public static let gutter: Double = 20
    }

    public enum Radius {
        public static let small: Double = 10
        public static let medium: Double = 16
        public static let large: Double = 24
        public static let xlarge: Double = 32
        public static let sheet: Double = 38
        public static let capsule: Double = 999
    }

    public enum Blur {
        public static let navigation: Double = 24
        public static let control: Double = 18
        public static let onMedia: Double = 28
        public static let bloom: Double = 14
    }

    public enum Duration {
        public static let instant: Double = 0.12
        public static let quick: Double = 0.18
        public static let standard: Double = 0.26
        public static let navigation: Double = 0.38
        public static let hero: Double = 0.62
        public static let recognition: Double = 0.64
        public static let launchShort: Double = 0.52
        public static let launchFull: Double = 1.1
    }

    public struct SpringSpec: Sendable, Hashable { public let response: Double; public let dampingFraction: Double }
    public enum Spring {
        public static let snappy = SpringSpec(response: 0.32, dampingFraction: 0.86)
        public static let gentle = SpringSpec(response: 0.5, dampingFraction: 0.88)
        public static let lively = SpringSpec(response: 0.42, dampingFraction: 0.72)
    }

    public enum Press {
        public static let scale: Double = 0.985
        public static let cardScale: Double = 0.97
        public static let opacity: Double = 0.92
    }

    public struct TextStyleSpec: Sendable, Hashable { public let size: Double; public let line: Double; public let weight: Int; public let tracking: Double }
    public enum Text {
        public static let display = TextStyleSpec(size: 40, line: 44, weight: 800, tracking: -1.12)
        public static let largeTitle = TextStyleSpec(size: 34, line: 40, weight: 700, tracking: -0.68)
        public static let title1 = TextStyleSpec(size: 28, line: 34, weight: 700, tracking: -0.56)
        public static let title2 = TextStyleSpec(size: 22, line: 28, weight: 600, tracking: -0.44)
        public static let title3 = TextStyleSpec(size: 20, line: 25, weight: 600, tracking: -0.4)
        public static let headline = TextStyleSpec(size: 17, line: 22, weight: 600, tracking: 0)
        public static let body = TextStyleSpec(size: 17, line: 22, weight: 400, tracking: 0)
        public static let callout = TextStyleSpec(size: 16, line: 21, weight: 400, tracking: 0)
        public static let subheadline = TextStyleSpec(size: 15, line: 20, weight: 400, tracking: 0)
        public static let footnote = TextStyleSpec(size: 13, line: 18, weight: 400, tracking: 0.052)
        public static let caption = TextStyleSpec(size: 12, line: 16, weight: 500, tracking: 0.048)
        public static let label = TextStyleSpec(size: 11, line: 13, weight: 600, tracking: 0.66)
        public static let numeral = TextStyleSpec(size: 56, line: 60, weight: 700, tracking: -1.568)
    }

    public enum Sizing {
        public static let touchMin: Double = 44
        public static let touchComfort: Double = 52
        public static let centerAction: Double = 64
        public static let navHeight: Double = 76
        public static let recordButton: Double = 82
        public static let avatar: Double = 40
    }
}
