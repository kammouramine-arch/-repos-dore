import AVFoundation
import DoOnceCore
import Foundation

/// Cuts one step's clip out of a recording. Real: `AVAssetExportSession`; tests: a stub.
protocol StepClipExporting: Sendable {
    /// The clip for `range` of the recording, written under the media library, as a `MediaRef`.
    func clip(of recording: Recording, stepOrder: Int, range: ClosedRange<TimeInterval>) async throws -> MediaRef
}

/// Exports a step's `sourceRange` as a small mp4 (`AVAssetExportPresetMediumQuality`) into
/// `MediaLibrary.clipURL`, so Do mode can loop the moment silently without seeking the original.
///
/// A clip that already exists is reused. Failures are the caller's to swallow: a step without a
/// clip falls back to its key frame, which is better than a memory that fails to save.
struct StepClipExporter: StepClipExporting {
    enum Failure: Error { case exportFailed(String), noSource }

    func clip(of recording: Recording, stepOrder: Int, range: ClosedRange<TimeInterval>) async throws -> MediaRef {
        let destination = RecordingFiles.clipURL(recording.id, stepOrder: stepOrder)
        let length = max(0.5, range.upperBound - range.lowerBound)
        if !FileManager.default.fileExists(atPath: destination.path) {
            let source = try KeyFrames.sourceURL(of: recording)
            try await Self.export(source: source, range: range, to: destination)
        }
        return MediaRef(kind: .video, localURL: destination, sourceOffset: range.lowerBound, duration: length)
    }

    static func export(source: URL, range: ClosedRange<TimeInterval>, to destination: URL) async throws {
        let asset = AVURLAsset(url: source)
        guard let session = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetMediumQuality) else {
            throw Failure.exportFailed("No export session")
        }
        try FileManager.default.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? FileManager.default.removeItem(at: destination)
        let start = CMTime(seconds: max(0, range.lowerBound), preferredTimescale: 600)
        let end = CMTime(seconds: max(range.lowerBound + 0.5, range.upperBound), preferredTimescale: 600)
        session.outputURL = destination
        session.outputFileType = .mp4
        session.shouldOptimizeForNetworkUse = true
        session.timeRange = CMTimeRange(start: start, end: end)
        await session.export()
        guard session.status == .completed else {
            try? FileManager.default.removeItem(at: destination)
            throw Failure.exportFailed(session.error?.localizedDescription ?? "\(session.status.rawValue)")
        }
    }
}
