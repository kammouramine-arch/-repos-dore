import Foundation

/// Keeps recordings and their upload state. The local file is never removed by this store.
public protocol RecordingStore: Sendable {
    func recording(id: UUID) async throws -> Recording?
    func allRecordings() async throws -> [Recording]
    /// Recordings whose upload has not completed.
    func pendingUploads() async throws -> [Recording]
    func save(_ recording: Recording) async throws
    func updateUploadState(id: UUID, to state: UploadState) async throws
    func delete(id: UUID) async throws
}

public actor InMemoryRecordingStore: RecordingStore {
    public enum Error: Swift.Error, Equatable {
        case recordingNotFound(UUID)
    }

    private var storage: [UUID: Recording]

    public init(initial: [Recording] = []) {
        storage = Dictionary(uniqueKeysWithValues: initial.map { ($0.id, $0) })
    }

    public func recording(id: UUID) async throws -> Recording? {
        storage[id]
    }

    public func allRecordings() async throws -> [Recording] {
        storage.values.sorted { $0.recordedAt > $1.recordedAt }
    }

    public func pendingUploads() async throws -> [Recording] {
        try await allRecordings().filter { !$0.uploadState.isComplete }
    }

    public func save(_ recording: Recording) async throws {
        storage[recording.id] = recording
    }

    public func updateUploadState(id: UUID, to state: UploadState) async throws {
        guard var recording = storage[id] else { throw Error.recordingNotFound(id) }
        recording.uploadState = state
        storage[id] = recording
    }

    public func delete(id: UUID) async throws {
        storage[id] = nil
    }
}
