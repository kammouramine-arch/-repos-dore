import XCTest
@testable import DoOnceCore

final class FileStoreTests: XCTestCase {
    var directory: URL!

    override func setUpWithError() throws {
        directory = FileManager.default.temporaryDirectory.appendingPathComponent("doonce-store-\(UUID().uuidString)")
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: directory)
    }

    private var job: ProcessingJob {
        ProcessingJob(recordingID: SampleIDs.boilerRecording, objectID: SampleIDs.boiler, stage: .transcribed, attempts: 1, updatedAt: SampleDates.date(2026, 9, 25), memoryID: nil)
    }

    func testRoundTripsEveryEntityThroughDisk() async throws {
        let store = try FileStore(directory: directory)
        var seed = SampleData.snapshot
        seed.processingJobs = [job]
        try await store.replaceAll(with: seed)

        let reopened = try FileStore(directory: directory)
        let loaded = await reopened.snapshot()
        XCTAssertEqual(loaded.users, seed.users)
        XCTAssertEqual(loaded.households, seed.households)
        XCTAssertEqual(loaded.spaces, seed.spaces)
        XCTAssertEqual(loaded.objects, seed.objects)
        XCTAssertEqual(loaded.people, seed.people)
        XCTAssertEqual(loaded.memories, seed.memories)
        XCTAssertEqual(loaded.recordings, seed.recordings)
        XCTAssertEqual(loaded.progress, seed.progress)
        XCTAssertEqual(loaded.processingJobs, seed.processingJobs)
        let byDad = try await reopened.memories(taughtBy: SampleIDs.dad)
        XCTAssertEqual(byDad.count, 3)
        let households = await reopened.households()
        XCTAssertEqual(households.first?.name, "Home")
    }

    func testDocumentHasSchemaVersionAndStableFormatting() async throws {
        let store = try FileStore(directory: directory)
        try await store.replaceAll(with: SampleData.snapshot)
        let text = try String(contentsOf: store.fileURL, encoding: .utf8)
        XCTAssertTrue(text.hasPrefix("{\n  \"schemaVersion\" : 1,\n  \"snapshot\""), "sorted, indented keys: \(text.prefix(60))")
        XCTAssertTrue(text.contains("\"createdAt\" : \"2026-03-18T10:00:00.000Z\""), "ISO-8601 dates")
        let contents = try FileManager.default.contentsOfDirectory(atPath: directory.path)
        XCTAssertEqual(contents, ["store.json"], "no temporary files left behind")
    }

    func testPartialTemporaryFileIsIgnoredAndCleanedUp() async throws {
        let store = try FileStore(directory: directory)
        try await store.replaceAll(with: SampleData.snapshot)
        let partial = directory.appendingPathComponent(".tmp-store.json-crashed")
        try Data("{\"schemaVersion\": 1, \"snap".utf8).write(to: partial)

        let reopened = try FileStore(directory: directory)
        let loaded = await reopened.snapshot()
        XCTAssertEqual(loaded.memories.count, SampleData.memories.count)
        XCTAssertFalse(FileManager.default.fileExists(atPath: partial.path))
    }

    func testCorruptFileIsMovedAsideNeverOverwritten() async throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let fileURL = directory.appendingPathComponent(FileStore.fileName)
        try Data("this is not json".utf8).write(to: fileURL)

        let store = try FileStore(directory: directory)
        let empty = await store.isEmpty
        XCTAssertTrue(empty)
        let recoveredFile = await store.recoveredCorruptFile
        let recovered = try XCTUnwrap(recoveredFile)
        XCTAssertTrue(recovered.lastPathComponent.hasPrefix("store.corrupt-"))
        XCTAssertEqual(try String(contentsOf: recovered, encoding: .utf8), "this is not json")
        XCTAssertFalse(FileManager.default.fileExists(atPath: fileURL.path))

        try await store.save(SampleData.household)
        XCTAssertEqual(try String(contentsOf: recovered, encoding: .utf8), "this is not json", "the corrupt copy survives later saves")
    }

    func testNewerSchemaIsRejected() async throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let fileURL = directory.appendingPathComponent(FileStore.fileName)
        let data = try StoreCoding.encoder().encode(StoreDocument(schemaVersion: FileStore.schemaVersion + 1, snapshot: SampleData.snapshot))
        try data.write(to: fileURL)

        XCTAssertThrowsError(try FileStore(directory: directory)) { error in
            XCTAssertEqual(error as? FileStore.Error, .incompatibleSchema(found: 2, supported: 1))
        }
        XCTAssertEqual(try Data(contentsOf: fileURL), data, "the newer document is left exactly as it was")
    }

    func testOlderDocumentWithoutProcessingJobsDecodes() throws {
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: StoreCoding.encoder().encode(SampleData.snapshot)) as? [String: Any])
        object["processingJobs"] = nil
        let data = try JSONSerialization.data(withJSONObject: object)
        let decoded = try StoreCoding.decoder().decode(MemoryStoreSnapshot.self, from: data)
        XCTAssertEqual(decoded.processingJobs, [])
        XCTAssertEqual(decoded.memories, SampleData.memories)
    }

    func testSeedIfEmptySeedsOnlyOnce() async throws {
        let store = try FileStore(directory: directory)
        let first = try await store.seedIfEmpty(SampleData.snapshot)
        XCTAssertTrue(first)
        var other = SampleData.snapshot
        other.memories = []
        let second = try await store.seedIfEmpty(other)
        XCTAssertFalse(second)
        let memories = try await store.allMemories()
        XCTAssertEqual(memories.count, SampleData.memories.count)
    }

    func testProgressReplacesByMemoryAndClears() async throws {
        let store = try FileStore(directory: directory)
        let started = MemoryProgress(memoryID: SampleIDs.backflush, userID: SampleIDs.amine, completedStepOrders: [1], totalSteps: 4, lastActiveAt: SampleDates.date(2026, 9, 1))
        try await store.setProgress(started)
        let further = MemoryProgress(memoryID: SampleIDs.backflush, userID: SampleIDs.amine, completedStepOrders: [1, 2, 3], totalSteps: 4, lastActiveAt: SampleDates.date(2026, 9, 2))
        try await store.setProgress(further)
        let all = try await store.allProgress()
        XCTAssertEqual(all.count, 1)
        XCTAssertEqual(all.first?.completedCount, 3)

        try await store.clearProgress(memoryID: SampleIDs.backflush)
        let cleared = try await store.allProgress()
        XCTAssertTrue(cleared.isEmpty)
        let reopened = try FileStore(directory: directory)
        let onDisk = try await reopened.allProgress()
        XCTAssertTrue(onDisk.isEmpty)
    }

    func testConcurrentSavesSerialise() async throws {
        let store = try FileStore(directory: directory)
        let memories = (0..<40).map { index in
            Memory(householdID: SampleIDs.household, title: "Memory \(index)", creatorID: SampleIDs.amine, createdAt: SampleDates.date(2026, 1, 1, 0, index))
        }
        try await withThrowingTaskGroup(of: Void.self) { group in
            for memory in memories {
                group.addTask { try await store.save(memory) }
            }
            try await group.waitForAll()
        }
        let saved = try await store.allMemories()
        XCTAssertEqual(Set(saved.map(\.id)), Set(memories.map(\.id)))
        let reopened = try FileStore(directory: directory)
        let onDisk = try await reopened.allMemories()
        XCTAssertEqual(onDisk.count, 40)
        XCTAssertEqual(onDisk.first?.title, "Memory 39", "newest first")
    }

    func testDeleteRemovesWhicheverEntityHasTheID() async throws {
        let store = try FileStore(directory: directory)
        var seed = SampleData.snapshot
        seed.processingJobs = [job]
        try await store.replaceAll(with: seed)

        try await store.delete(id: SampleIDs.cleanEspressoMachine)
        let progress = try await store.allProgress()
        XCTAssertTrue(progress.isEmpty, "progress for the deleted memory goes with it")
        try await store.delete(id: SampleIDs.router)
        let objects = try await store.allObjects()
        XCTAssertNil(objects.first { $0.id == SampleIDs.router })
        try await store.delete(id: SampleIDs.boilerRecording)
        let recordings = try await store.allRecordings()
        XCTAssertTrue(recordings.isEmpty)
        let jobs = try await store.allJobs()
        XCTAssertTrue(jobs.isEmpty, "the recording's job goes with it")
        let memories = try await store.allMemories()
        XCTAssertEqual(memories.count, SampleData.memories.count - 1, "other kinds are untouched")
    }

    func testProcessingJobsAndUploadState() async throws {
        let store = try FileStore(directory: directory)
        try await store.save(SampleData.boilerRecording)
        try await store.save(job)
        var advanced = job
        advanced.stage = .analysed
        advanced.memoryID = SampleIDs.repressuriseBoiler
        try await store.save(advanced)
        let jobs = try await store.allJobs()
        XCTAssertEqual(jobs, [advanced])
        let byRecording = try await store.job(recordingID: SampleIDs.boilerRecording)
        XCTAssertEqual(byRecording?.stage, .analysed)
        XCTAssertTrue(ProcessingJob.Stage.analysed.rank > ProcessingJob.Stage.transcribed.rank)

        try await store.updateUploadState(id: SampleIDs.boilerRecording, to: .pending)
        let pending = try await store.pendingUploads()
        XCTAssertEqual(pending.map(\.id), [SampleIDs.boilerRecording])
        do {
            try await store.updateUploadState(id: UUID(), to: .pending)
            XCTFail("expected recordingNotFound")
        } catch let error as FileStore.Error {
            if case .recordingNotFound = error {} else { XCTFail("\(error)") }
        }

        try await store.deleteJob(id: job.id)
        let remaining = try await store.allJobs()
        XCTAssertTrue(remaining.isEmpty)
    }

    func testUsersAndHouseholdsUpsert() async throws {
        let store = try FileStore(directory: directory)
        try await store.save(SampleData.users[0])
        var renamed = SampleData.users[0]
        renamed.displayName = "Amine K."
        try await store.save(renamed)
        try await store.save(SampleData.household)
        let users = await store.users()
        XCTAssertEqual(users.map(\.displayName), ["Amine K."])
        let households = await store.households()
        XCTAssertEqual(households.count, 1)
        let empty = await store.isEmpty
        XCTAssertFalse(empty)
    }
}
