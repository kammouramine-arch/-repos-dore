import Foundation

/// The household's data as one JSON document on disk, `store.json` inside `directory`.
///
/// One file rather than a database because the whole household fits comfortably in memory, a
/// single value is trivial to back up, export and diff, and every mutation becomes one atomic
/// write (see `AtomicFile`): the file on disk is always a complete, valid document.
///
/// Recovery rules:
/// - A missing file means a fresh install; the store starts empty.
/// - A document with a newer `schemaVersion` throws `Error.incompatibleSchema` from `init`, so
///   an older build never rewrites data it does not understand.
/// - A corrupt file is moved aside as `store.corrupt-<timestamp>.json` and the store starts
///   empty. It is never overwritten in place and never crashes the app; support can recover it.
///
/// Being an actor, every read sees a consistent snapshot and every write is serialised.
public actor FileStore: MemoryRepository, ObjectRepository, PersonRepository, SpaceRepository, RecordingStore, ProgressStore, ProcessingJobStore {
    /// Bump when a document written by this version cannot be read by the previous one.
    public static let schemaVersion = 1
    public static let fileName = "store.json"

    public enum Error: Swift.Error, Equatable {
        /// The document was written by a newer app; `found` is its schema version.
        case incompatibleSchema(found: Int, supported: Int)
        case recordingNotFound(UUID)
    }

    public let directory: URL
    private var document: MemoryStoreSnapshot
    /// Set when a corrupt file was moved aside during `init`, for diagnostics.
    public private(set) var recoveredCorruptFile: URL?

    /// Creates `directory` if needed and loads `store.json` when present.
    public init(directory: URL) throws {
        self.directory = directory
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        AtomicFile.removeStaleTemporaries(in: directory)

        let fileURL = directory.appendingPathComponent(Self.fileName)
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            document = MemoryStoreSnapshot()
            return
        }

        let data = try Data(contentsOf: fileURL)
        let decoder = StoreCoding.decoder()
        if let header = try? decoder.decode(StoreDocument.Header.self, from: data), header.schemaVersion > Self.schemaVersion {
            throw Error.incompatibleSchema(found: header.schemaVersion, supported: Self.schemaVersion)
        }
        do {
            document = try decoder.decode(StoreDocument.self, from: data).snapshot
        } catch {
            let stamp = Int(Date().timeIntervalSince1970)
            let corrupt = directory.appendingPathComponent("store.corrupt-\(stamp).json")
            try? FileManager.default.moveItem(at: fileURL, to: corrupt)
            recoveredCorruptFile = corrupt
            document = MemoryStoreSnapshot()
        }
    }

    public nonisolated var fileURL: URL { directory.appendingPathComponent(Self.fileName) }

    // MARK: - Whole-store operations

    public func snapshot() -> MemoryStoreSnapshot { document }

    public var isEmpty: Bool { document.isEmpty }

    /// Replaces everything, for restores and imports.
    public func replaceAll(with snapshot: MemoryStoreSnapshot) async throws {
        document = snapshot
        try persist()
    }

    /// Loads sample or starter content, but only into an empty store. Returns true when it did.
    public func seedIfEmpty(_ snapshot: MemoryStoreSnapshot) async throws -> Bool {
        guard document.isEmpty else { return false }
        document = snapshot
        try persist()
        return true
    }

    // MARK: - Households and users

    public func households() -> [Household] { document.households }
    public func users() -> [User] { document.users }

    public func save(_ household: Household) async throws {
        try mutate { $0.households.replaceOrAppend(household) }
    }

    public func save(_ user: User) async throws {
        try mutate { $0.users.replaceOrAppend(user) }
    }

    // MARK: - Internals

    /// Applies a change and writes the document. The change is rolled back if the write fails,
    /// so memory and disk never disagree.
    func mutate(_ change: (inout MemoryStoreSnapshot) -> Void) throws {
        let previous = document
        change(&document)
        do {
            try persist()
        } catch {
            document = previous
            throw error
        }
    }

    private func persist() throws {
        document.exportedAt = Date()
        let data = try StoreCoding.encoder().encode(StoreDocument(schemaVersion: Self.schemaVersion, snapshot: document))
        try AtomicFile.write(data, to: fileURL)
    }
}

extension Array where Element: Identifiable {
    /// Upsert by `id`, keeping the element's position when it already exists.
    mutating func replaceOrAppend(_ element: Element) {
        if let index = firstIndex(where: { $0.id == element.id }) {
            self[index] = element
        } else {
            append(element)
        }
    }
}
