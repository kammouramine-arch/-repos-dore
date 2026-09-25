import XCTest
@testable import DoOnceCore

final class MediaLibraryTests: XCTestCase {
    var root: URL!
    var library: MediaLibrary!
    let id = SampleIDs.boilerRecording

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent("doonce-media-\(UUID().uuidString)")
        library = MediaLibrary(root: root)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: root)
    }

    /// Writes `count` bytes at `url`, creating directories as needed.
    private func write(_ count: Int, to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(repeating: 0xAB, count: count).write(to: url)
    }

    private func populate() throws {
        try library.ensureDirectories(for: id)
        try write(100, to: library.originalURL(id))
        try write(10, to: library.frameURL(id, at: 22.5))
        try write(20, to: library.clipURL(id, stepOrder: 3))
        try write(5, to: library.thumbnailURL(id))
    }

    func testPathsAreStableAndReadable() {
        XCTAssertEqual(library.recordingDirectory(id).lastPathComponent, id.uuidString)
        XCTAssertEqual(library.originalURL(id).lastPathComponent, "original.mov")
        XCTAssertEqual(library.originalURL(id, fileExtension: "mp4").lastPathComponent, "original.mp4")
        XCTAssertEqual(library.thumbnailURL(id).lastPathComponent, "thumbnail.jpg")
        XCTAssertEqual(library.frameURL(id, at: 22.5).lastPathComponent, "00022.500.jpg")
        XCTAssertEqual(library.frameURL(id, at: 0).lastPathComponent, "00000.000.jpg")
        XCTAssertEqual(library.frameURL(id, at: 3599.9994).lastPathComponent, "03599.999.jpg")
        XCTAssertEqual(library.frameURL(id, at: 22.5), library.frameURL(id, at: 22.5))
        XCTAssertEqual(library.framesDirectory(id).lastPathComponent, "frames")
        XCTAssertEqual(library.clipURL(id, stepOrder: 3).lastPathComponent, "step-03.mp4")
        XCTAssertEqual(library.clipURL(id, stepOrder: 12).lastPathComponent, "step-12.mp4")
        XCTAssertEqual(library.clipsDirectory(id).lastPathComponent, "clips")
        XCTAssertTrue(library.clipURL(id, stepOrder: 1).path.hasPrefix(root.path))
    }

    func testDiskUsageSeparatesOriginalsFromDerived() throws {
        XCTAssertEqual(try library.diskUsage(), MediaUsage(originals: 0, derived: 0))
        try populate()
        let usage = try library.diskUsage()
        XCTAssertEqual(usage.originals, 100)
        XCTAssertEqual(usage.derived, 35)
        XCTAssertEqual(usage.total, 135)
        XCTAssertEqual(try library.recordingIDs(), [id])
        XCTAssertEqual(library.existingOriginalURL(id), library.originalURL(id))
    }

    func testPurgeDerivedKeepsTheOriginal() throws {
        try populate()
        try library.purgeDerived(for: id)
        XCTAssertTrue(FileManager.default.fileExists(atPath: library.originalURL(id).path))
        XCTAssertFalse(FileManager.default.fileExists(atPath: library.framesDirectory(id).path))
        XCTAssertFalse(FileManager.default.fileExists(atPath: library.clipsDirectory(id).path))
        XCTAssertFalse(FileManager.default.fileExists(atPath: library.thumbnailURL(id).path))
        XCTAssertEqual(try library.diskUsage(), MediaUsage(originals: 100, derived: 0))
        try library.purgeDerived(for: id)
    }

    func testDeleteProtectsTheOriginal() throws {
        try populate()
        XCTAssertThrowsError(try library.deleteRecording(id, recording: nil, allowOriginal: false)) {
            XCTAssertEqual($0 as? MediaLibrary.Error, .originalProtected(id))
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: library.originalURL(id).path))

        var pending = SampleData.boilerRecording
        pending.uploadState = .failed(progress: UploadProgress(uploadSessionID: "s", bytesSent: 10, totalBytes: 100), message: "lost")
        XCTAssertThrowsError(try library.deleteRecording(id, recording: pending, allowOriginal: true)) {
            XCTAssertEqual($0 as? MediaLibrary.Error, .originalNotUploaded(id))
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: library.originalURL(id).path))

        try library.deleteRecording(id, recording: pending, allowOriginal: true, force: true)
        XCTAssertFalse(FileManager.default.fileExists(atPath: library.recordingDirectory(id).path))
        XCTAssertEqual(try library.recordingIDs(), [])
    }

    func testDeleteAfterConfirmedUploadAndWithoutOriginal() throws {
        try populate()
        XCTAssertTrue(SampleData.boilerRecording.uploadState.isComplete)
        try library.deleteRecording(id, recording: SampleData.boilerRecording, allowOriginal: true)
        XCTAssertFalse(FileManager.default.fileExists(atPath: library.recordingDirectory(id).path))

        try library.ensureDirectories(for: id)
        try write(10, to: library.frameURL(id, at: 1))
        try library.deleteRecording(id, recording: nil, allowOriginal: false)
        XCTAssertEqual(try library.diskUsage(), MediaUsage(originals: 0, derived: 0))
        try library.deleteRecording(UUID(), recording: nil, allowOriginal: true)
    }

    func testOrphansAreDirectoriesTheStoreDoesNotKnow() throws {
        try populate()
        let stray = UUID()
        try write(3, to: library.originalURL(stray))
        try write(1, to: root.appendingPathComponent("not-a-uuid").appendingPathComponent("x.bin"))
        try write(1, to: root.appendingPathComponent(UUID().uuidString))
        XCTAssertEqual(Set(try library.recordingIDs()), [id, stray])
        XCTAssertEqual(try library.orphanedRecordingIDs(known: [id]), [stray])
        XCTAssertEqual(try library.orphanedRecordingIDs(known: [id, stray]), [])
    }

    func testMediaRefsCarryOffsets() {
        let frame = library.mediaRef(forFrameOf: id, at: 22.5)
        XCTAssertEqual(frame.kind, .image)
        XCTAssertEqual(frame.localURL, library.frameURL(id, at: 22.5))
        XCTAssertEqual(frame.sourceOffset, 22.5)
        XCTAssertTrue(frame.isAvailableOffline)

        let clip = library.mediaRef(forClipOf: id, stepOrder: 3, range: 35...58)
        XCTAssertEqual(clip.kind, .video)
        XCTAssertEqual(clip.localURL, library.clipURL(id, stepOrder: 3))
        XCTAssertEqual(clip.sourceOffset, 35)
        XCTAssertEqual(clip.duration, 23)
    }
}
