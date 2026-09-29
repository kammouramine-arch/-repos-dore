import Foundation

/// A generation service that can take key frames to send with its request.
public protocol KeyFrameAwareGeneration: ProcedureGenerationService {
    /// True when frames would actually be looked at; false spares the extraction.
    var wantsKeyFrames: Bool { get }
    /// The same service, sending these frames. `media` maps `KeyFrameReference.id` to the frame on
    /// disk, so a step the model pins to a frame gets that exact frame as its picture.
    func withKeyFrames(_ frames: [KeyFrameReference], media: [String: MediaRef]) -> any ProcedureGenerationService
}

/// Chooses when to take the stills the model sees. The user's "Remember this" taps come first,
/// then the moments found in the speech, then an even spread so a silent stretch is still seen.
/// A frame is taken a little after a moment starts, when the hands are on the thing.
public struct AnalysisFrameSampler: Sendable {
    public var maxFrames: Int
    public var minSpacing: TimeInterval
    public var leadIn: TimeInterval

    public init(maxFrames: Int = 10, minSpacing: TimeInterval = 1.5, leadIn: TimeInterval = 0.8) {
        self.maxFrames = maxFrames
        self.minSpacing = minSpacing
        self.leadIn = leadIn
    }

    /// Ascending, de-duplicated times inside the recording, at most `maxFrames`.
    public func times(duration: TimeInterval, moments: [DetectedMoment], markers: [TimeInterval]) -> [TimeInterval] {
        guard duration > 0, maxFrames > 0 else { return [] }
        let last = max(0, duration - 0.3)
        let clamp = { (t: TimeInterval) in min(max(0, t), last) }
        let spacing = min(minSpacing, duration / Double(maxFrames))

        let marked = (markers + moments.filter { $0.kind == .userMarked }.map(\.time)).map { clamp($0 + leadIn) }.sorted()
        let found = moments.filter { $0.kind != .userMarked }.sorted { $0.confidence > $1.confidence }.map { clamp($0.time + leadIn) }
        let spread = (0..<maxFrames).map { clamp((Double($0) + 0.5) * duration / Double(maxFrames)) }

        var picked: [TimeInterval] = []
        for candidate in marked + found + spread where picked.count < maxFrames {
            if picked.allSatisfy({ abs($0 - candidate) >= spacing }) { picked.append(candidate) }
        }
        return picked.sorted()
    }

    /// "f1", "f2", … in time order; the ids the model refers back to.
    public static func frameID(_ index: Int) -> String { "f\(index + 1)" }
}
