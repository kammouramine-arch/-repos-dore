import CoreGraphics
import CoreMedia
import CoreVideo
import DoOnceCore
import Foundation
import Observation

/// Watches camera frames while Look is open and decides, calmly, what the camera is pointed at.
///
/// Rules (motion spec §5):
/// - a frame is sampled every ~350 ms; embedding runs on the capture queue, never on main;
/// - `.exact` is reported only after two consecutive samples agree on the same object;
/// - after `unknownAfter` seconds without a lock, `.category` is reported when the recent samples
///   agreed on a category, otherwise `.unknown`;
/// - once decided, the recogniser stays put until `reset()`, so the UI never flickers.
///
/// Positions of objects seen recently are kept so a second known object can be shown as a dot
/// and retargeted by tap; nothing is placed where nothing was seen.
@MainActor
@Observable
final class LiveRecogniser {
    struct Sighting: Equatable {
        var result: RecognitionResult
        /// Normalised, top-left origin, in frame space. Nil when Vision found no salient region.
        var region: CGRect?
        var at: TimeInterval
    }

    enum Output: Equatable {
        case searching
        case exact(Sighting)
        case category(Sighting)
        case unknown
        case failed(String)
    }

    private(set) var output: Output = .searching
    /// The last thing seen, whatever its confidence.
    private(set) var latest: Sighting?
    /// Where each known object was last seen above the category threshold (objectID → region).
    private(set) var recentRegions: [UUID: CGRect] = [:]

    var objects: [PhysicalObject]
    let matcher: RecognitionMatcher
    let requiredHits: Int
    let unknownAfter: TimeInterval

    private let source: any FrameEmbeddingSource
    private let throttle: FrameThrottle
    private var startedAt: TimeInterval?
    private var consecutive: (objectID: UUID, hits: Int)?
    private var categoryVotes: [String: Int] = [:]

    init(source: any FrameEmbeddingSource, objects: [PhysicalObject], matcher: RecognitionMatcher = RecognitionMatcher(),
         sampleInterval: TimeInterval = 0.35, requiredHits: Int = 2, unknownAfter: TimeInterval = 2.5) {
        self.source = source
        self.objects = objects
        self.matcher = matcher
        self.requiredHits = requiredHits
        self.unknownAfter = unknownAfter
        throttle = FrameThrottle(interval: sampleInterval)
    }

    // MARK: Frames (capture queue)

    /// Hands a camera frame in. Cheap unless a sample is due; then the embedding is computed here,
    /// on the caller's queue, and the decision is made on the main actor.
    nonisolated func submit(_ sampleBuffer: CMSampleBuffer) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        submit(pixelBuffer: pixelBuffer)
    }

    nonisolated func submit(pixelBuffer: CVPixelBuffer) {
        let now = Date.timeIntervalSinceReferenceDate
        guard throttle.shouldSample(at: now) else { return }
        do {
            let embedding = try source.embedding(for: pixelBuffer)
            let region: CGRect? = (try? source.salientRegion(in: pixelBuffer)) ?? nil
            Task { @MainActor in self.ingest(embedding, region: region, at: now) }
        } catch {
            let message = error.localizedDescription
            Task { @MainActor in self.fail(message) }
        }
    }

    // MARK: Decisions (main actor, testable)

    /// The state machine. `time` is any monotonic clock; tests pass their own.
    func ingest(_ embedding: Embedding, region: CGRect?, at time: TimeInterval) {
        if startedAt == nil { startedAt = time }
        guard case .searching = output else { return }

        let result = matcher.match(embedding, against: objects)
        let sighting = Sighting(result: result, region: region, at: time)
        latest = sighting
        if let best = result.best, let region { recentRegions[best.objectID] = region }

        if result.level == .exact, let best = result.best {
            if let run = consecutive, run.objectID == best.objectID {
                consecutive = (best.objectID, run.hits + 1)
            } else {
                consecutive = (best.objectID, 1)
            }
            if let run = consecutive, run.hits >= requiredHits {
                output = .exact(sighting)
                return
            }
        } else {
            consecutive = nil
        }
        if let category = result.suggestedCategory { categoryVotes[category, default: 0] += 1 }

        if time - (startedAt ?? time) >= unknownAfter {
            if let winner = categoryVotes.max(by: { $0.value < $1.value }), winner.value >= requiredHits {
                var voted = sighting
                if voted.result.level != .category {
                    voted.result = RecognitionResult(level: .category, candidates: result.candidates, suggestedCategory: winner.key)
                }
                output = .category(voted)
            } else {
                output = .unknown
            }
        }
    }

    /// Forces a lock on a specific object (tap on a dot, "Yes" on the uncertain sheet).
    func lock(onto objectID: UUID) {
        guard let object = objects.first(where: { $0.id == objectID }) else { return }
        let candidate = RecognitionResult.Candidate(objectID: object.id, name: object.name, category: object.category, confidence: 1)
        let result = RecognitionResult(level: .exact, candidates: [candidate], suggestedCategory: object.category)
        output = .exact(Sighting(result: result, region: recentRegions[objectID] ?? latest?.region, at: Date.timeIntervalSinceReferenceDate))
    }

    /// Declares the current guess wrong and moves to unknown (the "No" answer).
    func reject() { output = .unknown }

    func reset() {
        output = .searching
        latest = nil
        startedAt = nil
        consecutive = nil
        categoryVotes = [:]
        throttle.reset()
    }

    private func fail(_ message: String) {
        if case .searching = output { output = .failed(message) }
    }
}

/// Decides whether a frame is due for sampling. Lock-protected because frames arrive off-main.
final class FrameThrottle: @unchecked Sendable {
    private let interval: TimeInterval
    private var last: TimeInterval = -.infinity
    private let lock = NSLock()

    init(interval: TimeInterval) { self.interval = interval }

    func shouldSample(at time: TimeInterval) -> Bool {
        lock.lock(); defer { lock.unlock() }
        guard time - last >= interval else { return false }
        last = time
        return true
    }

    func reset() { lock.lock(); last = -.infinity; lock.unlock() }
}
