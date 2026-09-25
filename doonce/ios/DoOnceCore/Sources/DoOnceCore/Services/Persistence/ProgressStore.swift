import Foundation

/// Where Do-mode progress is kept ("2 of 7 steps done"), one entry per memory.
public protocol ProgressStore: Sendable {
    func allProgress() async throws -> [MemoryProgress]
    /// Replaces any entry with the same `memoryID`.
    func setProgress(_ progress: MemoryProgress) async throws
    func clearProgress(memoryID: UUID) async throws
}

/// Where resumable processing jobs are kept, one per recording.
public protocol ProcessingJobStore: Sendable {
    func allJobs() async throws -> [ProcessingJob]
    func job(recordingID: UUID) async throws -> ProcessingJob?
    /// Inserts or replaces by `id`.
    func save(_ job: ProcessingJob) async throws
    func deleteJob(id: UUID) async throws
}
