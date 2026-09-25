import DoOnceCore
import Foundation

/// Where DoOnce keeps its files on this phone: `Application Support/DoOnce/{store,media,session}`.
///
/// Why three directories: `store` is the household document (`FileStore`), `media` is every
/// original recording and everything derived from it (`MediaLibrary`), `session` is the device's
/// sign-in. They are backed up differently: the store and session are small and precious; media
/// is large, re-creatable from the originals, and excluded from iCloud backup so a household's
/// videos never blow through the user's backup quota behind their back.
struct AppDirectories: Sendable {
    let root: URL

    var store: URL { root.appending(path: "store") }
    var media: URL { root.appending(path: "media") }
    var session: URL { root.appending(path: "session") }

    /// The app's own directories, under Application Support.
    static let `default` = AppDirectories(
        root: FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appending(path: "DoOnce")
    )

    /// A throwaway set of directories for tests and previews.
    static func temporary() -> AppDirectories {
        AppDirectories(root: FileManager.default.temporaryDirectory.appending(path: "DoOnce-\(UUID().uuidString)"))
    }

    /// Creates the directories on first use and marks media as not-for-backup. Idempotent.
    func prepare() throws {
        let manager = FileManager.default
        for directory in [store, media, session] {
            try manager.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        var mediaURL = media
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try mediaURL.setResourceValues(values)
    }

    /// The one media library for these directories.
    var library: MediaLibrary { MediaLibrary(root: media) }
}

extension MediaLibrary {
    /// The original video for a recording when it is on this phone: the path the recording was
    /// registered with, or the library's own path when the recording was moved there (or the
    /// container path changed between launches, which iOS does). Nil when neither exists.
    func playableOriginalURL(for recording: Recording) -> URL? {
        let candidates = [recording.localURL, originalURL(recording.id)]
        return candidates.first { $0.isFileURL && FileManager.default.fileExists(atPath: $0.path) }
    }
}
