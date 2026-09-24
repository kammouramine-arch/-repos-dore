import AVFoundation
import DoOnceCore
import Foundation
import Observation
import UIKit

/// Records through the camera session's movie output into Application Support and turns the
/// result into a `Recording` saved in the store.
///
/// Why here and not in the view: recording outlives the record button (a phone call can end it),
/// and the file must be kept and registered whatever happens, because the local file is the
/// source of truth until an upload is confirmed.
@MainActor
@Observable
final class MovieRecorder {
    enum Failure: LocalizedError {
        case lowStorage
        case cameraNotRunning
        case noAudio
        case failed(String)

        var errorDescription: String? {
            switch self {
            case .lowStorage: L10n.string("error.storage.title")
            case .cameraNotRunning: L10n.string("error.camera.title")
            case .noAudio: L10n.string("permission.mic.title")
            case .failed(let message): message
            }
        }
    }

    private(set) var isRecording = false
    private(set) var elapsed: TimeInterval = 0
    /// Smoothed microphone level in 0…1 for the breathing ring.
    private(set) var audioLevel: Double = 0
    /// Seconds into the recording at which the user tapped "Remember this".
    private(set) var markers: [TimeInterval] = []

    /// Below this the recorder refuses to start; a 1080p minute is roughly 100 MB.
    static let minimumFreeBytes: Int64 = 400 * 1024 * 1024

    private let camera: CameraSession
    private let store: any RecordingStore
    private let householdID: UUID
    private let delegate = RecordingDelegate()
    private var startedAt: Date?
    private var ticker: Task<Void, Never>?
    private var finish: CheckedContinuation<URL, any Error>?
    private var currentID = UUID()

    init(camera: CameraSession, store: any RecordingStore, householdID: UUID) {
        self.camera = camera
        self.store = store
        self.householdID = householdID
        delegate.onFinish = { [weak self] url, error in
            Task { @MainActor [weak self] in self?.didFinish(url: url, error: error) }
        }
        camera.engine.onAudioLevel = { [weak self] db in
            Task { @MainActor [weak self] in self?.ingest(decibels: db) }
        }
    }

    // MARK: Control

    func start() async throws {
        guard !isRecording else { return }
        guard camera.state == .running else { throw Failure.cameraNotRunning }
        guard Self.hasEnoughStorage() else { throw Failure.lowStorage }
        guard await camera.enableAudio() else { throw Failure.noAudio }

        let id = UUID()
        currentID = id
        let url = RecordingFiles.movieURL(id)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        markers = []
        elapsed = 0
        let engine = camera.engine
        let delegate = delegate
        engine.queue.async {
            engine.movieOutput.startRecording(to: url, recordingDelegate: delegate)
        }
        isRecording = true
        startedAt = Date()
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(100))
                guard let self, let startedAt = self.startedAt else { return }
                self.elapsed = Date().timeIntervalSince(startedAt)
            }
        }
    }

    /// Adds a "Remember this" marker at the current time.
    func mark() {
        guard isRecording else { return }
        markers.append(elapsed)
    }

    /// Stops and returns the saved `Recording`. The file is kept even when the stop was forced by
    /// an interruption (phone call): AVFoundation finalises the movie before reporting the error.
    func stop() async throws -> Recording {
        guard isRecording else { throw Failure.cameraNotRunning }
        let url: URL = try await withCheckedThrowingContinuation { cont in
            finish = cont
            let engine = camera.engine
            engine.queue.async { engine.movieOutput.stopRecording() }
        }
        return try await register(url: url)
    }

    // MARK: Completion

    private func didFinish(url: URL, error: (any Error)?) {
        ticker?.cancel()
        ticker = nil
        isRecording = false
        startedAt = nil
        audioLevel = 0
        let fileExists = FileManager.default.fileExists(atPath: url.path)
        if let error, !fileExists {
            finish?.resume(throwing: Failure.failed(error.localizedDescription))
        } else {
            // An interruption error with a file on disk is a usable recording.
            finish?.resume(returning: url)
        }
        finish = nil
    }

    private func register(url: URL) async throws -> Recording {
        let asset = AVURLAsset(url: url)
        let duration = (try? await asset.load(.duration).seconds) ?? elapsed
        let bytes = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
        let recording = Recording(id: currentID, householdID: householdID, localURL: url, byteCount: bytes, duration: duration, userMarkers: markers)
        try await store.save(recording)
        _ = try? await KeyFrames.lastFrame(of: recording)
        return recording
    }

    private func ingest(decibels: Float) {
        // −50 dB (quiet room) … 0 dB (full scale) → 0…1, then a light low-pass so the ring breathes.
        let linear = Double(max(0, min(1, (decibels + 50) / 50)))
        audioLevel = audioLevel * 0.6 + linear * 0.4
    }

    static func hasEnoughStorage() -> Bool {
        let home = URL(fileURLWithPath: NSHomeDirectory())
        guard let values = try? home.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]),
              let capacity = values.volumeAvailableCapacityForImportantUsage else { return true }
        return capacity > minimumFreeBytes
    }
}

/// Bridges `AVCaptureFileOutputRecordingDelegate` (capture queue) to a closure.
private final class RecordingDelegate: NSObject, AVCaptureFileOutputRecordingDelegate, @unchecked Sendable {
    var onFinish: (@Sendable (URL, (any Error)?) -> Void)?
    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: (any Error)?) {
        onFinish?(outputFileURL, error)
    }
}

/// Where recordings and derived images live. Everything is under Application Support so it is
/// backed up and never purged behind the user's back.
enum RecordingFiles {
    static var root: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    }
    static func movieURL(_ id: UUID) -> URL { root.appending(path: "Recordings/\(id.uuidString).mov") }
    static func framesDirectory(_ recordingID: UUID) -> URL { root.appending(path: "Frames/\(recordingID.uuidString)") }
    static func frameURL(_ recordingID: UUID, at seconds: TimeInterval) -> URL {
        framesDirectory(recordingID).appending(path: "\(Int(seconds.rounded())).jpg")
    }
    static func lastFrameURL(_ recordingID: UUID) -> URL { framesDirectory(recordingID).appending(path: "last.jpg") }
    static func objectImageURL(_ objectID: UUID, index: Int) -> URL { root.appending(path: "Images/\(objectID.uuidString)-\(index).jpg") }
}

/// Pulls stills out of a recording with `AVAssetImageGenerator`.
enum KeyFrames {
    static func image(from url: URL, at seconds: TimeInterval) async throws -> UIImage {
        let generator = AVAssetImageGenerator(asset: AVURLAsset(url: url))
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = CMTime(seconds: 0.25, preferredTimescale: 600)
        generator.requestedTimeToleranceAfter = CMTime(seconds: 0.25, preferredTimescale: 600)
        generator.maximumSize = CGSize(width: 1280, height: 1280)
        let (cgImage, _) = try await generator.image(at: CMTime(seconds: max(0, seconds), preferredTimescale: 600))
        return UIImage(cgImage: cgImage)
    }

    /// Writes (or reuses) the frame at `seconds` and returns a `MediaRef` pointing at it.
    static func frame(of recording: Recording, at seconds: TimeInterval) async throws -> MediaRef {
        let url = RecordingFiles.frameURL(recording.id, at: seconds)
        if !FileManager.default.fileExists(atPath: url.path) {
            let image = try await image(from: recording.localURL, at: seconds)
            try FrameImage.writeJPEG(image, to: url)
        }
        return MediaRef(kind: .image, localURL: url, sourceOffset: seconds)
    }

    /// The frozen last frame used as the Processing hero.
    static func lastFrame(of recording: Recording) async throws -> MediaRef {
        let url = RecordingFiles.lastFrameURL(recording.id)
        if !FileManager.default.fileExists(atPath: url.path) {
            let image = try await image(from: recording.localURL, at: max(0, recording.duration - 0.3))
            try FrameImage.writeJPEG(image, to: url)
        }
        return MediaRef(kind: .image, localURL: url, sourceOffset: recording.duration)
    }
}
