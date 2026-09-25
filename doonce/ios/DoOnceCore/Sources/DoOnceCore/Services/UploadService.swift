import Foundation

/// Uploads recordings in resumable chunks.
///
/// Rules every implementation follows:
/// - The local file is never deleted or moved by the upload service; that is a separate user decision.
/// - A failure keeps the bytes already accepted, so `resume` continues rather than restarts.
public protocol UploadService: Sendable {
    /// Starts (or continues) uploading and returns the final state.
    func upload(recordingID: UUID) async throws -> UploadState
    /// Continues an upload from where it stopped.
    func resume(recordingID: UUID) async throws -> UploadState
    func pause(recordingID: UUID, reason: String) async throws
    func state(recordingID: UUID) async throws -> UploadState?
}

/// Sends one chunk of a file. Real implementations talk HTTP; tests inject failures.
public protocol UploadTransport: Sendable {
    /// Sends the bytes in `range` of the file at `localURL` under an upload session.
    /// Returns the number of bytes the server now has in total.
    func send(sessionID: String, localURL: URL, range: Range<Int64>, totalBytes: Int64) async throws -> Int64
}

public enum UploadError: Swift.Error, Equatable {
    case recordingNotFound(UUID)
    case localFileMissing(URL)
    case transport(String)
}

/// A chunked, resumable upload service backed by a `RecordingStore` and an `UploadTransport`.
///
/// State is written to the store after every chunk, so a crash mid-upload resumes from the last
/// accepted byte. The recording's `localURL` is read, never written.
public actor ChunkedUploadService: UploadService {
    private let store: any RecordingStore
    private let transport: any UploadTransport
    private let chunkSize: Int64
    private let remoteBase: URL
    private var paused: Set<UUID> = []

    public init(store: any RecordingStore, transport: any UploadTransport, chunkSize: Int64 = 512 * 1024, remoteBase: URL = URL(string: "https://media.doonce.app/recordings")!) {
        self.store = store
        self.transport = transport
        self.chunkSize = chunkSize
        self.remoteBase = remoteBase
    }

    public func upload(recordingID: UUID) async throws -> UploadState {
        try await run(recordingID: recordingID)
    }

    public func resume(recordingID: UUID) async throws -> UploadState {
        paused.remove(recordingID)
        return try await run(recordingID: recordingID)
    }

    public func pause(recordingID: UUID, reason: String) async throws {
        paused.insert(recordingID)
        guard let recording = try await store.recording(id: recordingID) else { throw UploadError.recordingNotFound(recordingID) }
        if case .uploading(let progress) = recording.uploadState {
            try await store.updateUploadState(id: recordingID, to: .paused(progress: progress, reason: reason))
        }
    }

    public func state(recordingID: UUID) async throws -> UploadState? {
        try await store.recording(id: recordingID)?.uploadState
    }

    private func run(recordingID: UUID) async throws -> UploadState {
        guard let recording = try await store.recording(id: recordingID) else { throw UploadError.recordingNotFound(recordingID) }
        if case .uploaded = recording.uploadState { return recording.uploadState }

        var progress = Self.progress(from: recording)
        while progress.bytesSent < progress.totalBytes {
            if paused.contains(recordingID) {
                let state = UploadState.paused(progress: progress, reason: "Paused")
                try await store.updateUploadState(id: recordingID, to: state)
                return state
            }
            let end = min(progress.bytesSent + chunkSize, progress.totalBytes)
            try await store.updateUploadState(id: recordingID, to: .uploading(progress: progress))
            do {
                let accepted = try await transport.send(sessionID: progress.uploadSessionID, localURL: recording.localURL, range: progress.bytesSent..<end, totalBytes: progress.totalBytes)
                progress.bytesSent = accepted
            } catch {
                let state = UploadState.failed(progress: progress, message: "\(error)")
                try await store.updateUploadState(id: recordingID, to: state)
                return state
            }
        }

        let state = UploadState.uploaded(remoteURL: remoteBase.appendingPathComponent(recordingID.uuidString))
        try await store.updateUploadState(id: recordingID, to: state)
        return state
    }

    private static func progress(from recording: Recording) -> UploadProgress {
        switch recording.uploadState {
        case .uploading(let progress), .paused(let progress, _), .failed(let progress, _):
            return progress
        case .pending, .uploaded:
            return UploadProgress(uploadSessionID: UUID().uuidString, bytesSent: 0, totalBytes: recording.byteCount)
        }
    }
}

/// A transport that succeeds instantly, or fails when told to. For tests and previews.
public actor SimulatedUploadTransport: UploadTransport {
    public private(set) var bytesTransferred: Int64 = 0
    public private(set) var chunksSent = 0
    private var failAtOffset: Int64?

    public init() {}

    /// Makes the next chunk that starts at or beyond `offset` fail once.
    public func failOnce(atOrAfter offset: Int64) {
        failAtOffset = offset
    }

    public func send(sessionID: String, localURL: URL, range: Range<Int64>, totalBytes: Int64) async throws -> Int64 {
        if let failAtOffset, range.lowerBound >= failAtOffset {
            self.failAtOffset = nil
            throw UploadError.transport("Connection lost")
        }
        bytesTransferred += range.upperBound - range.lowerBound
        chunksSent += 1
        return range.upperBound
    }
}
