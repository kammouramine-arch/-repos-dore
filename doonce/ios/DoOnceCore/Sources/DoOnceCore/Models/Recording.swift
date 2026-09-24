import Foundation

/// A video the user recorded (or imported) while teaching.
///
/// The local file is the source of truth until the upload is confirmed; nothing in this
/// package ever clears `localURL` on failure.
public struct Recording: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var householdID: UUID
    public var localURL: URL
    public var byteCount: Int64
    public var duration: TimeInterval
    public var recordedAt: Date
    public var uploadState: UploadState
    public var transcript: Transcript?
    public var analysis: Analysis?
    /// Times at which the user tapped "Remember this" while recording.
    public var userMarkers: [TimeInterval]

    public init(
        id: UUID = UUID(),
        householdID: UUID,
        localURL: URL,
        byteCount: Int64,
        duration: TimeInterval,
        recordedAt: Date = Date(),
        uploadState: UploadState = .pending,
        transcript: Transcript? = nil,
        analysis: Analysis? = nil,
        userMarkers: [TimeInterval] = []
    ) {
        self.id = id
        self.householdID = householdID
        self.localURL = localURL
        self.byteCount = byteCount
        self.duration = duration
        self.recordedAt = recordedAt
        self.uploadState = uploadState
        self.transcript = transcript
        self.analysis = analysis
        self.userMarkers = userMarkers
    }
}

/// Where a recording is in its journey to the server. Progress survives failures so uploads resume.
public enum UploadState: Codable, Hashable, Sendable {
    case pending
    case uploading(progress: UploadProgress)
    case paused(progress: UploadProgress, reason: String)
    case failed(progress: UploadProgress, message: String)
    case uploaded(remoteURL: URL)

    public var isComplete: Bool {
        if case .uploaded = self { return true }
        return false
    }

    /// Bytes already accepted by the server, or zero before the upload starts.
    public var bytesSent: Int64 {
        switch self {
        case .pending: 0
        case .uploading(let progress), .paused(let progress, _), .failed(let progress, _): progress.bytesSent
        case .uploaded: Int64.max
        }
    }

    /// Fraction in `0...1`.
    public var fractionCompleted: Double {
        switch self {
        case .pending: 0
        case .uploading(let progress), .paused(let progress, _), .failed(let progress, _): progress.fraction
        case .uploaded: 1
        }
    }
}

/// Resumable-upload bookkeeping: how much of the file the server has, and the session to resume.
public struct UploadProgress: Codable, Hashable, Sendable {
    public var uploadSessionID: String
    public var bytesSent: Int64
    public var totalBytes: Int64

    public init(uploadSessionID: String, bytesSent: Int64, totalBytes: Int64) {
        self.uploadSessionID = uploadSessionID
        self.bytesSent = bytesSent
        self.totalBytes = totalBytes
    }

    public var fraction: Double {
        totalBytes > 0 ? Double(bytesSent) / Double(totalBytes) : 0
    }
}
