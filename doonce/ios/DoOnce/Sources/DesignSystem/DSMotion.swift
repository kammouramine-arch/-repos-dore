import SwiftUI

/// The motion language. Durations and springs come from tokens.json; Reduce Motion is honoured
/// by `dsAnimation`, which swaps spatial springs for a short ease when the user asks for it.
public enum DSMotion {
    public static let instant = Tokens.Duration.instant
    public static let quick = Tokens.Duration.quick
    public static let standard = Tokens.Duration.standard
    public static let navigation = Tokens.Duration.navigation
    public static let hero = Tokens.Duration.hero
    public static let recognition = Tokens.Duration.recognition
    public static let launchShort = Tokens.Duration.launchShort
    public static let launchFull = Tokens.Duration.launchFull

    /// Presses, toggles, chips.
    public static let snappy = Animation.spring(response: Tokens.Spring.snappy.response, dampingFraction: Tokens.Spring.snappy.dampingFraction)
    /// Navigation, sheets, matched geometry.
    public static let gentle = Animation.spring(response: Tokens.Spring.gentle.response, dampingFraction: Tokens.Spring.gentle.dampingFraction)
    /// Bloom and the recognition pulse only. Never for text.
    public static let lively = Animation.spring(response: Tokens.Spring.lively.response, dampingFraction: Tokens.Spring.lively.dampingFraction)
    /// Enter / settle curve for timed animations.
    public static func standard(_ duration: Double = Tokens.Duration.standard) -> Animation { .timingCurve(0.2, 0, 0, 1, duration: duration) }
    public static func emphasized(_ duration: Double = Tokens.Duration.hero) -> Animation { .timingCurve(0.32, 0.72, 0, 1, duration: duration) }
    public static func exit(_ duration: Double = Tokens.Duration.quick) -> Animation { .timingCurve(0.4, 0, 1, 1, duration: duration) }
    /// Reduce Motion replacement for any spatial animation.
    public static let crossfade = Animation.easeOut(duration: 0.2)
}

extension View {
    /// Use instead of `.animation(_:value:)`: falls back to a crossfade under Reduce Motion.
    func dsAnimation<V: Equatable>(_ animation: Animation, value: V) -> some View {
        modifier(DSAnimationModifier(animation: animation, value: value))
    }
}

private struct DSAnimationModifier<V: Equatable>: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let animation: Animation
    let value: V
    func body(content: Content) -> some View {
        content.animation(reduceMotion ? DSMotion.crossfade : animation, value: value)
    }
}

/// `withDSAnimation(.gentle) { ... }` — honours Reduce Motion.
@MainActor
func withDSAnimation<R>(_ animation: Animation, _ body: () throws -> R) rethrows -> R {
    let reduce = UIAccessibility.isReduceMotionEnabled
    return try withAnimation(reduce ? DSMotion.crossfade : animation, body)
}
