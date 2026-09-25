import Foundation

/// Bytes on disk, split by whether they can be regenerated.
public struct MediaUsage: Hashable, Sendable {
    /// Recorded originals: irreplaceable until uploaded.
    public var originals: Int64
    /// Frames, clips and thumbnails: rebuilt from the original on demand.
    public var derived: Int64
    public var total: Int64

    public init(originals: Int64, derived: Int64) {
        self.originals = originals
        self.derived = derived
        self.total = originals + derived
    }
}

/// Where recordings and everything cut from them live on disk.
///
/// Layout, one directory per recording:
/// ```
/// <root>/<recordingID>/original.mov       the recording, exactly as captured
/// <root>/<recordingID>/thumbnail.jpg      the last frame, for lists
/// <root>/<recordingID>/frames/00022.500.jpg   a key frame at 22.5 s
/// <root>/<recordingID>/clips/step-03.mp4  the clip behind step 3's "See original"
/// ```
///
/// Rules this type enforces, because a lost recording cannot be re-taught:
/// - The original is never duplicated: memories, steps and clips refer to it by path and offset.
/// - Derived artefacts are disposable; `purgeDerived` frees space and never touches the original.
/// - The original is deleted only by an explicit user decision (`allowOriginal: true`), and when
///   its `Recording` is known and not durably uploaded, only with `force` as well.
public struct MediaLibrary: Sendable {
    public enum Error: Swift.Error, Equatable {
        /// `deleteRecording` was asked to remove derived files only, but would have taken the original.
        case originalProtected(UUID)
        /// The original has not been confirmed uploaded, so deleting it would lose the only copy.
        case originalNotUploaded(UUID)
    }

    public static let originalBaseName = "original"

    public let root: URL

    public init(root: URL) {
        self.root = root
    }

    // MARK: - Paths (pure: stable across launches and platforms)

    public func recordingDirectory(_ id: UUID) -> URL {
        root.appendingPathComponent(id.uuidString, isDirectory: true)
    }

    public func originalURL(_ id: UUID, fileExtension: String = "mov") -> URL {
        recordingDirectory(id).appendingPathComponent(Self.originalBaseName).appendingPathExtension(fileExtension)
    }

    /// The last frame of the recording as a JPEG.
    public func thumbnailURL(_ id: UUID) -> URL {
        recordingDirectory(id).appendingPathComponent("thumbnail.jpg")
    }

    public func framesDirectory(_ id: UUID) -> URL {
        recordingDirectory(id).appendingPathComponent("frames", isDirectory: true)
    }

    /// `frames/00022.500.jpg`: zero-padded seconds with millisecond precision, so names sort by time
    /// and the same instant always maps to the same file.
    public func frameURL(_ id: UUID, at seconds: TimeInterval) -> URL {
        framesDirectory(id).appendingPathComponent(String(format: "%09.3f.jpg", max(0, seconds)))
    }

    public func clipsDirectory(_ id: UUID) -> URL {
        recordingDirectory(id).appendingPathComponent("clips", isDirectory: true)
    }

    /// `clips/step-03.mp4`.
    public func clipURL(_ id: UUID, stepOrder: Int) -> URL {
        clipsDirectory(id).appendingPathComponent(String(format: "step-%02d.mp4", stepOrder))
    }

    public func ensureDirectories(for id: UUID) throws {
        for directory in [framesDirectory(id), clipsDirectory(id)] {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
    }

    // MARK: - Inventory

    /// Recording directories present on disk, whatever the store knows about them.
    public func recordingIDs() throws -> [UUID] {
        guard FileManager.default.fileExists(atPath: root.path) else { return [] }
        return try FileManager.default.contentsOfDirectory(atPath: root.path)
            .compactMap(UUID.init(uuidString:))
            .filter { isDirectory(recordingDirectory($0)) }
            .sorted { $0.uuidString < $1.uuidString }
    }

    /// Directories on disk that no recording in the store refers to: leftovers from a crash
    /// between saving the file and saving the record. The caller decides what to do with them.
    public func orphanedRecordingIDs(known: Set<UUID>) throws -> [UUID] {
        try recordingIDs().filter { !known.contains($0) }
    }

    public func diskUsage() throws -> MediaUsage {
        var originals: Int64 = 0
        var derived: Int64 = 0
        for id in try recordingIDs() {
            let directory = recordingDirectory(id)
            guard let enumerator = FileManager.default.enumerator(atPath: directory.path) else { continue }
            for case let relative as String in enumerator {
                let url = directory.appendingPathComponent(relative)
                guard let size = fileSize(url) else { continue }
                if Self.isOriginal(relative) { originals += size } else { derived += size }
            }
        }
        return MediaUsage(originals: originals, derived: derived)
    }

    /// The original on disk for a recording, whatever its extension; nil when there is none.
    public func existingOriginalURL(_ id: UUID) -> URL? {
        let directory = recordingDirectory(id)
        let names = (try? FileManager.default.contentsOfDirectory(atPath: directory.path)) ?? []
        return names.filter(Self.isOriginal).sorted().first.map(directory.appendingPathComponent)
    }

    // MARK: - Deletion

    /// Removes frames, clips and the thumbnail. The original is never touched.
    public func purgeDerived(for id: UUID) throws {
        for url in [framesDirectory(id), clipsDirectory(id), thumbnailURL(id)] where FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.removeItem(at: url)
        }
    }

    /// Removes a recording's directory.
    ///
    /// - `allowOriginal == false`: only derived files go; throws `originalProtected` if an original exists.
    /// - `allowOriginal == true` with a `recording` whose upload is not complete: throws
    ///   `originalNotUploaded` unless `force` is set, because the local file is the only copy.
    public func deleteRecording(_ id: UUID, recording: Recording?, allowOriginal: Bool, force: Bool = false) throws {
        if existingOriginalURL(id) != nil {
            guard allowOriginal else { throw Error.originalProtected(id) }
            if let recording, !recording.uploadState.isComplete, !force {
                throw Error.originalNotUploaded(id)
            }
        }
        let directory = recordingDirectory(id)
        guard FileManager.default.fileExists(atPath: directory.path) else { return }
        if allowOriginal {
            try FileManager.default.removeItem(at: directory)
        } else {
            try purgeDerived(for: id)
        }
    }

    // MARK: - Media references

    /// A step's key frame: the JPEG at `seconds`, remembered with its offset for "See original".
    public func mediaRef(forFrameOf id: UUID, at seconds: TimeInterval) -> MediaRef {
        MediaRef(kind: .image, localURL: frameURL(id, at: seconds), sourceOffset: seconds)
    }

    /// A step's clip. `MediaRef.Kind` has no clip case; a clip is a `.video` with an offset and duration.
    public func mediaRef(forClipOf id: UUID, stepOrder: Int, range: ClosedRange<TimeInterval>) -> MediaRef {
        MediaRef(kind: .video, localURL: clipURL(id, stepOrder: stepOrder), sourceOffset: range.lowerBound, duration: range.upperBound - range.lowerBound)
    }

    // MARK: - Helpers

    static func isOriginal(_ relativePath: String) -> Bool {
        let name = (relativePath as NSString).lastPathComponent
        return !relativePath.contains("/") && (name as NSString).deletingPathExtension == originalBaseName
    }

    private func isDirectory(_ url: URL) -> Bool {
        var isDirectory: ObjCBool = false
        return FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory) && isDirectory.boolValue
    }

    private func fileSize(_ url: URL) -> Int64? {
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
              (attributes[.type] as? FileAttributeType) != .typeDirectory else { return nil }
        return (attributes[.size] as? NSNumber)?.int64Value ?? (attributes[.size] as? Int64)
    }
}
