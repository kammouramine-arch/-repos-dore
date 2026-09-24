import Foundation

/// The funnel events the product tracks.
///
/// Privacy: events carry counts, durations and coarse reasons only. No recording content, transcript
/// text, object names, people or media ever appear in an analytics payload. See README.
public enum AnalyticsEvent: Hashable, Sendable {
    case install
    case firstTeach
    case firstMemory
    case firstLookRecognition
    case firstDoCompletion
    /// Seconds from "Stop" to "Remembered."
    case processingLatency(seconds: TimeInterval)
    case cameraFailure(reason: String)
    case uploadFailure(reason: String)
    /// The user corrected what Look recognised.
    case recognitionCorrection(from: RecognitionResult.Level)
    case share
    case subscriptionConversion(tier: SubscriptionTier)

    /// Stable event name for the analytics backend.
    public var name: String {
        switch self {
        case .install: "install"
        case .firstTeach: "first_teach"
        case .firstMemory: "first_memory"
        case .firstLookRecognition: "first_look_recognition"
        case .firstDoCompletion: "first_do_completion"
        case .processingLatency: "processing_latency"
        case .cameraFailure: "camera_failure"
        case .uploadFailure: "upload_failure"
        case .recognitionCorrection: "recognition_correction"
        case .share: "share"
        case .subscriptionConversion: "subscription_conversion"
        }
    }

    /// Scalar properties only; never content.
    public var properties: [String: String] {
        switch self {
        case .processingLatency(let seconds): ["seconds": String(format: "%.1f", seconds)]
        case .cameraFailure(let reason), .uploadFailure(let reason): ["reason": reason]
        case .recognitionCorrection(let level): ["from_level": level.rawValue]
        case .subscriptionConversion(let tier): ["tier": tier.rawValue]
        default: [:]
        }
    }
}

/// Sends events somewhere. The app decides where; this package only defines the shape.
public protocol Analytics: Sendable {
    func track(_ event: AnalyticsEvent) async
}

/// Remembers every event. For tests and previews.
public actor InMemoryAnalytics: Analytics {
    public private(set) var events: [AnalyticsEvent] = []

    public init() {}

    public func track(_ event: AnalyticsEvent) async {
        events.append(event)
    }
}

/// Drops every event.
public struct NoOpAnalytics: Analytics {
    public init() {}
    public func track(_ event: AnalyticsEvent) async {}
}
