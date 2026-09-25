import UIKit
import CoreHaptics
import DoOnceCore

/// Plays `HapticsIntent`s through UIKit generators, filtered by the user's `HapticsPolicy`.
/// Three signature moments use Core Haptics patterns so they feel identical across devices.
///
/// Rules: fire only with a visible change, at the frame the change lands. Never on plain touch-down.
@MainActor
final class HapticsService {
    static let shared = HapticsService()

    var policy: HapticsPolicy = .full {
        didSet { UserDefaults.standard.set(policy.rawValue, forKey: "haptics.policy") }
    }

    private let selection = UISelectionFeedbackGenerator()
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let rigid = UIImpactFeedbackGenerator(style: .rigid)
    private let notification = UINotificationFeedbackGenerator()
    private var engine: CHHapticEngine?

    private init() {
        if let raw = UserDefaults.standard.string(forKey: "haptics.policy"), let p = HapticsPolicy(rawValue: raw) { policy = p }
        prepareEngine()
    }

    /// Warm generators before a moment where latency matters (recognition, save).
    func prepare() { selection.prepare(); light.prepare(); medium.prepare(); rigid.prepare(); notification.prepare() }

    func play(_ intent: HapticsIntent) {
        guard let allowed = policy.filter(intent) else { return }
        switch allowed {
        case .selection: selection.selectionChanged()
        case .light: light.impactOccurred()
        case .medium: medium.impactOccurred()
        case .rigid: rigid.impactOccurred()
        case .success: notification.notificationOccurred(.success)
        case .warning: notification.notificationOccurred(.warning)
        case .error: notification.notificationOccurred(.error)
        }
    }

    // MARK: Signature patterns

    /// Recognition lock: a soft rise into a firm transient. ~120 ms.
    func playRecognitionLock() {
        guard policy.allows(.medium) else { return }
        play(pattern: [
            .continuous(intensity: 0.35, sharpness: 0.2, start: 0, duration: 0.08),
            .transient(intensity: 0.8, sharpness: 0.55, at: 0.09),
        ]) ?? play(.medium)
    }

    /// Save settle: two soft transients, the second lighter (the memory "landing"). ~180 ms.
    func playSaveSettle() {
        guard policy.allows(.success) else { return }
        play(pattern: [
            .transient(intensity: 0.7, sharpness: 0.4, at: 0),
            .transient(intensity: 0.45, sharpness: 0.3, at: 0.12),
        ]) ?? play(.success)
    }

    /// Loop closes (launch, completion): one crisp rigid tick.
    func playLoopClose() {
        guard policy.allows(.rigid) else { return }
        play(pattern: [.transient(intensity: 0.9, sharpness: 0.8, at: 0)]) ?? play(.rigid)
    }

    // MARK: Core Haptics plumbing

    private enum Event {
        case transient(intensity: Float, sharpness: Float, at: TimeInterval)
        case continuous(intensity: Float, sharpness: Float, start: TimeInterval, duration: TimeInterval)
        var haptic: CHHapticEvent {
            switch self {
            case let .transient(i, s, t):
                CHHapticEvent(eventType: .hapticTransient, parameters: [.init(parameterID: .hapticIntensity, value: i), .init(parameterID: .hapticSharpness, value: s)], relativeTime: t)
            case let .continuous(i, s, t, d):
                CHHapticEvent(eventType: .hapticContinuous, parameters: [.init(parameterID: .hapticIntensity, value: i), .init(parameterID: .hapticSharpness, value: s)], relativeTime: t, duration: d)
            }
        }
    }

    private func prepareEngine() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        engine = try? CHHapticEngine()
        engine?.resetHandler = { [weak self] in try? self?.engine?.start() }
        try? engine?.start()
    }

    /// Returns nil when Core Haptics is unavailable so callers can fall back to a generator.
    private func play(pattern events: [Event]) -> Void? {
        guard let engine else { return nil }
        do {
            let pattern = try CHHapticPattern(events: events.map(\.haptic), parameters: [])
            let player = try engine.makePlayer(with: pattern)
            try engine.start()
            try player.start(atTime: CHHapticTimeImmediate)
            return ()
        } catch { return nil }
    }
}
