import Foundation
import DoOnceCore

/// Thin facade over `app.services.analytics` for the product funnel.
///
/// Privacy: analytics carries counts, durations and coarse reasons only. No recording content, no
/// transcript text, no images, no object names, no people. `AnalyticsEvent` cannot even hold them.
/// The five funnel events fire once per install; the "once" flags live in `UserDefaults`, so a
/// reinstall counts again and an account never needs to be identified.
@MainActor
final class AnalyticsService {
    private let analytics: Analytics
    private let defaults: UserDefaults

    init(_ analytics: Analytics, defaults: UserDefaults = .standard) {
        self.analytics = analytics
        self.defaults = defaults
    }

    // MARK: Funnel (each fires at most once per install)

    func install() { trackOnce(.install) }
    func firstTeach() { trackOnce(.firstTeach) }
    func firstMemory() { trackOnce(.firstMemory) }
    func firstLookRecognition() { trackOnce(.firstLookRecognition) }
    func firstDoCompletion() { trackOnce(.firstDoCompletion) }

    /// True when a funnel event has already been sent from this install.
    func hasTracked(_ event: AnalyticsEvent) -> Bool { defaults.bool(forKey: onceKey(event)) }

    /// Non-funnel events (latency, failures, share, conversion) go straight through.
    func track(_ event: AnalyticsEvent) {
        Task { await analytics.track(event) }
    }

    private func trackOnce(_ event: AnalyticsEvent) {
        let key = onceKey(event)
        guard !defaults.bool(forKey: key) else { return }
        defaults.set(true, forKey: key)
        track(event)
    }

    private func onceKey(_ event: AnalyticsEvent) -> String { "analytics.once.\(event.name)" }
}
