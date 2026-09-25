import Foundation

// Protocol conformances of `FileStore`. Each is a thin view over the one snapshot, with the same
// ordering the in-memory repositories use so the app behaves identically with either.

extension FileStore {
    // MARK: MemoryRepository

    public func allMemories() async throws -> [Memory] {
        snapshot().memories.sorted { $0.createdAt > $1.createdAt }
    }

    public func memory(id: UUID) async throws -> Memory? {
        snapshot().memory(id: id)
    }

    public func memories(forObject objectID: UUID) async throws -> [Memory] {
        try await allMemories().filter { $0.objectID == objectID }
    }

    public func memories(taughtBy personID: UUID) async throws -> [Memory] {
        try await allMemories().filter { $0.demonstratorID == personID }
    }

    public func save(_ memory: Memory) async throws {
        try mutate { $0.memories.replaceOrAppend(memory) }
    }

    /// Deletes whichever entity carries `id`: memory, object, person, space or recording.
    ///
    /// Every repository protocol declares the same `delete(id:)`, and one actor can only have one.
    /// UUIDs are unique across kinds, so removing by id everywhere is unambiguous and means the
    /// store behaves the same whichever protocol the caller holds it as. Progress and jobs that
    /// pointed at the deleted memory or recording go with it; a recording's file does not (see
    /// `MediaLibrary`).
    public func delete(id: UUID) async throws {
        try mutate {
            $0.memories.removeAll { $0.id == id }
            $0.objects.removeAll { $0.id == id }
            $0.people.removeAll { $0.id == id }
            $0.spaces.removeAll { $0.id == id }
            $0.recordings.removeAll { $0.id == id }
            $0.progress.removeAll { $0.memoryID == id }
            $0.processingJobs.removeAll { $0.recordingID == id || $0.memoryID == id }
        }
    }

    // MARK: ObjectRepository

    public func allObjects() async throws -> [PhysicalObject] {
        snapshot().objects.sorted { $0.name < $1.name }
    }

    public func object(id: UUID) async throws -> PhysicalObject? {
        snapshot().object(id: id)
    }

    public func objects(inSpace spaceID: UUID) async throws -> [PhysicalObject] {
        try await allObjects().filter { $0.spaceID == spaceID }
    }

    public func save(_ object: PhysicalObject) async throws {
        try mutate { $0.objects.replaceOrAppend(object) }
    }


    // MARK: PersonRepository

    public func allPeople() async throws -> [Person] {
        snapshot().people.sorted { $0.displayName < $1.displayName }
    }

    public func person(id: UUID) async throws -> Person? {
        snapshot().person(id: id)
    }

    public func selfPerson() async throws -> Person? {
        snapshot().people.first { $0.isSelf }
    }

    public func save(_ person: Person) async throws {
        try mutate { $0.people.replaceOrAppend(person) }
    }


    // MARK: SpaceRepository

    public func allSpaces() async throws -> [Space] {
        snapshot().spaces.sorted { $0.name < $1.name }
    }

    public func space(id: UUID) async throws -> Space? {
        snapshot().space(id: id)
    }

    public func save(_ space: Space) async throws {
        try mutate { $0.spaces.replaceOrAppend(space) }
    }


    // MARK: RecordingStore

    public func recording(id: UUID) async throws -> Recording? {
        snapshot().recordings.first { $0.id == id }
    }

    public func allRecordings() async throws -> [Recording] {
        snapshot().recordings.sorted { $0.recordedAt > $1.recordedAt }
    }

    public func pendingUploads() async throws -> [Recording] {
        try await allRecordings().filter { !$0.uploadState.isComplete }
    }

    public func save(_ recording: Recording) async throws {
        try mutate { $0.recordings.replaceOrAppend(recording) }
    }

    public func updateUploadState(id: UUID, to state: UploadState) async throws {
        guard var recording = try await recording(id: id) else { throw Error.recordingNotFound(id) }
        recording.uploadState = state
        try await save(recording)
    }

    // MARK: ProgressStore

    public func allProgress() async throws -> [MemoryProgress] {
        snapshot().progress
    }

    public func setProgress(_ progress: MemoryProgress) async throws {
        try mutate {
            $0.progress.removeAll { $0.memoryID == progress.memoryID }
            $0.progress.append(progress)
        }
    }

    public func clearProgress(memoryID: UUID) async throws {
        try mutate { $0.progress.removeAll { $0.memoryID == memoryID } }
    }

    // MARK: ProcessingJobStore

    public func allJobs() async throws -> [ProcessingJob] {
        snapshot().processingJobs
    }

    public func job(recordingID: UUID) async throws -> ProcessingJob? {
        snapshot().processingJobs.first { $0.recordingID == recordingID }
    }

    public func save(_ job: ProcessingJob) async throws {
        try mutate { $0.processingJobs.replaceOrAppend(job) }
    }

    public func deleteJob(id: UUID) async throws {
        try mutate { $0.processingJobs.removeAll { $0.id == id } }
    }
}
