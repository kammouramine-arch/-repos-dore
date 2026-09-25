import Foundation

/// The device session as `session.json` in a directory of its own.
///
/// Written atomically like the main store, and the file is set to owner-only permissions
/// (0600) on a best-effort basis: on iOS the app container already isolates it, on other
/// platforms this keeps tokens away from other users of the machine.
public struct FileSessionStore: SessionStore {
    public static let fileName = "session.json"

    public let directory: URL

    public init(directory: URL) {
        self.directory = directory
    }

    public var fileURL: URL { directory.appendingPathComponent(Self.fileName) }

    public func load() async throws -> AuthSession? {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return nil }
        let data = try Data(contentsOf: fileURL)
        return try StoreCoding.decoder().decode(AuthSession.self, from: data)
    }

    public func save(_ session: AuthSession) async throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try StoreCoding.encoder().encode(session)
        try AtomicFile.write(data, to: fileURL)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path)
    }

    public func clear() async throws {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
        try FileManager.default.removeItem(at: fileURL)
    }
}
