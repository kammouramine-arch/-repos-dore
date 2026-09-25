import XCTest
@testable import DoOnceCore

final class UploadServiceTests: XCTestCase {
    private let localURL = URL(string: "file:///var/mobile/Recordings/teach-0042.mov")!

    private func makeRecording(bytes: Int64 = 10_000) -> Recording {
        Recording(householdID: SampleIDs.household, localURL: localURL, byteCount: bytes, duration: 30)
    }

    func testFailureKeepsLocalFileAndProgressThenResumes() async throws {
        let store = InMemoryRecordingStore()
        let transport = SimulatedUploadTransport()
        let service = ChunkedUploadService(store: store, transport: transport, chunkSize: 1_000)
        let recording = makeRecording()
        try await store.save(recording)

        await transport.failOnce(atOrAfter: 5_000)
        let failed = try await service.upload(recordingID: recording.id)

        guard case .failed(let progress, let message) = failed else {
            return XCTFail("expected a failure, got \(failed)")
        }
        XCTAssertEqual(progress.bytesSent, 5_000)
        XCTAssertEqual(message, "transport(\"Connection lost\")")

        let storedOptional = try await store.recording(id: recording.id)
        let stored = try XCTUnwrap(storedOptional)
        XCTAssertEqual(stored.localURL, localURL, "the local file must never be touched")
        XCTAssertEqual(stored.uploadState, failed)
        let pending = try await store.pendingUploads().map(\.id)
        XCTAssertEqual(pending, [recording.id])

        let resumed = try await service.resume(recordingID: recording.id)
        guard case .uploaded(let remoteURL) = resumed else {
            return XCTFail("expected upload to complete, got \(resumed)")
        }
        XCTAssertTrue(remoteURL.absoluteString.contains(recording.id.uuidString))
        let transferred = await transport.bytesTransferred
        XCTAssertEqual(transferred, 10_000, "resumed from byte 5000, did not start over")
        let chunks = await transport.chunksSent
        XCTAssertEqual(chunks, 10)

        let afterOptional = try await store.recording(id: recording.id)
        let after = try XCTUnwrap(afterOptional)
        XCTAssertEqual(after.localURL, localURL)
        XCTAssertTrue(after.uploadState.isComplete)
        let nothingPending = try await store.pendingUploads()
        XCTAssertTrue(nothingPending.isEmpty)
    }

    func testPauseStopsAtChunkBoundaryAndResumeFinishes() async throws {
        let store = InMemoryRecordingStore()
        let transport = SimulatedUploadTransport()
        let service = ChunkedUploadService(store: store, transport: transport, chunkSize: 4_000)
        let recording = makeRecording()
        try await store.save(recording)

        try await service.pause(recordingID: recording.id, reason: "Offline")
        let paused = try await service.upload(recordingID: recording.id)
        guard case .paused(let progress, _) = paused else { return XCTFail("expected paused, got \(paused)") }
        XCTAssertEqual(progress.bytesSent, 0)
        XCTAssertEqual(paused.fractionCompleted, 0)

        let done = try await service.resume(recordingID: recording.id)
        XCTAssertTrue(done.isComplete)
        XCTAssertEqual(done.fractionCompleted, 1)
    }

    func testUploadingUnknownRecordingThrows() async {
        let service = ChunkedUploadService(store: InMemoryRecordingStore(), transport: SimulatedUploadTransport())
        do {
            _ = try await service.upload(recordingID: UUID())
            XCTFail("expected an error")
        } catch let error as UploadError {
            if case .recordingNotFound = error {} else { XCTFail("wrong error \(error)") }
        } catch {
            XCTFail("wrong error \(error)")
        }
    }
}
