import Foundation

/// A haptic the UI would like to play. The app maps these to UIKit generators.
public enum HapticsIntent: String, CaseIterable, Hashable, Sendable {
    case selection
    case light
    case medium
    case rigid
    case success
    case warning
    case error

    /// True for feedback that tells the user something happened, not just that they touched something.
    public var carriesMeaning: Bool {
        switch self {
        case .success, .warning, .error: true
        case .selection, .light, .medium, .rigid: false
        }
    }
}

/// The user's haptics setting: Full, Reduced or Off.
public enum HapticsPolicy: String, CaseIterable, Codable, Hashable, Sendable {
    case full
    case reduced
    case off

    /// Whether an intent should play under this policy.
    public func allows(_ intent: HapticsIntent) -> Bool {
        switch self {
        case .full: true
        case .reduced: intent.carriesMeaning
        case .off: false
        }
    }

    /// The intent to play, or nil when the policy swallows it.
    public func filter(_ intent: HapticsIntent) -> HapticsIntent? {
        allows(intent) ? intent : nil
    }
}
