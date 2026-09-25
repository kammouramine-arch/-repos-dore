import Foundation

/// Where a recording is on its way from "Stop" to "Remembered.", so processing can resume after
/// the app is killed, the network drops or the user walks away.
///
/// One job per recording (`id == recordingID`), stored in the household snapshot next to the
/// recording it describes. Every stage is a checkpoint whose outputs are already persisted
/// (the secured file, the transcript on the `Recording`, the analysis, the generated memory), so
/// a job at stage `.transcribed` can restart at moment detection without transcribing again.
public struct ProcessingJob: Codable, Sendable, Hashable, Identifiable {
    /// The pipeline checkpoints, in order. `failed` keeps `lastError` for the retry sheet.
    public enum Stage: String, Codable, Sendable, CaseIterable {
        /// The original file is copied into the media library and will not be lost.
        case secured
        /// The transcript is on the recording.
        case transcribed
        /// Detected moments are on the recording's analysis.
        case momentsFound
        /// The procedure analysis has produced a memory (see `memoryID`).
        case analysed
        /// Key frames and clips have been extracted for the memory's steps.
        case framesReady
        case done
        case failed

        /// Position in the pipeline, for "resume from the furthest checkpoint" logic.
        public var rank: Int {
            switch self {
            case .secured: 0
            case .transcribed: 1
            case .momentsFound: 2
            case .analysed: 3
            case .framesReady: 4
            case .done: 5
            case .failed: -1
            }
        }
    }

    /// Same value as `recordingID`; a recording has at most one job.
    public var id: UUID
    public var recordingID: UUID
    public var objectID: UUID?
    public var stage: Stage
    /// How many times processing has been started for this recording, for backoff and "give up" copy.
    public var attempts: Int
    public var lastError: String?
    public var updatedAt: Date
    /// The memory produced at `.analysed`, when there is one.
    public var memoryID: UUID?

    public init(
        recordingID: UUID,
        objectID: UUID? = nil,
        stage: Stage = .secured,
        attempts: Int = 0,
        lastError: String? = nil,
        updatedAt: Date = Date(),
        memoryID: UUID? = nil
    ) {
        self.id = recordingID
        self.recordingID = recordingID
        self.objectID = objectID
        self.stage = stage
        self.attempts = attempts
        self.lastError = lastError
        self.updatedAt = updatedAt
        self.memoryID = memoryID
    }

    /// True while the job still needs work.
    public var isActive: Bool { stage != .done && stage != .failed }
}
