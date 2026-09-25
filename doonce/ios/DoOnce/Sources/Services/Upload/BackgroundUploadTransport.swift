import DoOnceCore
import Foundation

/// Sends recording chunks with a background `URLSession`, so an upload in flight survives the app
/// being suspended. Used by DoOnceCore's `ChunkedUploadService`, which persists progress after
/// every chunk and resumes from the last accepted byte.
///
/// Endpoint: `Info.plist` key `DoOnceUploadEndpoint` (a base URL). When the key is absent,
/// `isConfigured` is false and `make()` returns nil; callers then never start an upload, the
/// recording stays `.pending`, and the local file is kept. This transport never deletes or moves
/// the local file: it reads the requested byte range into a temporary file for the upload task.
///
/// Protocol (simple, resumable): `PUT <endpoint>/<sessionID>` with `Content-Range: bytes a-b/total`.
/// The server answers 2xx with `Upload-Offset: <bytes it now has>`; without the header, the end
/// of the sent range is assumed.
///
/// Limit worth knowing: one background task per chunk means the *next* chunk is scheduled only
/// when the app runs again; `ChunkedUploadService.resume` picks up from the stored progress.
final class BackgroundUploadTransport: NSObject, UploadTransport, @unchecked Sendable {
    static let sessionIdentifier = "app.doonce.upload"
    static let infoPlistKey = "DoOnceUploadEndpoint"

    static var endpoint: URL? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: infoPlistKey) as? String, !raw.isEmpty else { return nil }
        return URL(string: raw)
    }
    static var isConfigured: Bool { endpoint != nil }

    /// Nil when no endpoint is configured, so the caller leaves uploads pending.
    static func make() -> BackgroundUploadTransport? {
        endpoint.map { BackgroundUploadTransport(endpoint: $0) }
    }

    let endpoint: URL
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.background(withIdentifier: Self.sessionIdentifier)
        config.isDiscretionary = false
        config.sessionSendsLaunchEvents = true
        config.waitsForConnectivity = true
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()
    private let lock = NSLock()
    private var pending: [Int: Pending] = [:]

    private struct Pending {
        var continuation: CheckedContinuation<Int64, any Error>
        var fallbackOffset: Int64
        var tempFile: URL
        var body = Data()
    }

    init(endpoint: URL) {
        self.endpoint = endpoint
        super.init()
    }

    // MARK: UploadTransport

    func send(sessionID: String, localURL: URL, range: Range<Int64>, totalBytes: Int64) async throws -> Int64 {
        guard FileManager.default.fileExists(atPath: localURL.path) else { throw UploadError.localFileMissing(localURL) }
        let chunk = try Self.slice(localURL, range: range)
        var request = URLRequest(url: endpoint.appendingPathComponent(sessionID))
        request.httpMethod = "PUT"
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.setValue("bytes \(range.lowerBound)-\(range.upperBound - 1)/\(totalBytes)", forHTTPHeaderField: "Content-Range")
        request.setValue(sessionID, forHTTPHeaderField: "Upload-Session")

        return try await withCheckedThrowingContinuation { continuation in
            let task = session.uploadTask(with: request, fromFile: chunk)
            lock.lock()
            pending[task.taskIdentifier] = Pending(continuation: continuation, fallbackOffset: range.upperBound, tempFile: chunk)
            lock.unlock()
            task.resume()
        }
    }

    /// Copies one byte range into a temporary file; background upload tasks need a file, not data.
    private static func slice(_ url: URL, range: Range<Int64>) throws -> URL {
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        try handle.seek(toOffset: UInt64(range.lowerBound))
        let data = try handle.read(upToCount: Int(range.upperBound - range.lowerBound)) ?? Data()
        let temp = FileManager.default.temporaryDirectory.appending(path: "upload-\(UUID().uuidString).chunk")
        try data.write(to: temp, options: .atomic)
        return temp
    }

    private func complete(taskID: Int, _ body: (Pending) -> Result<Int64, any Error>) {
        lock.lock()
        guard let entry = pending.removeValue(forKey: taskID) else { lock.unlock(); return }
        lock.unlock()
        try? FileManager.default.removeItem(at: entry.tempFile)
        switch body(entry) {
        case .success(let offset): entry.continuation.resume(returning: offset)
        case .failure(let error): entry.continuation.resume(throwing: error)
        }
    }
}

extension BackgroundUploadTransport: URLSessionDataDelegate {
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        lock.lock()
        pending[dataTask.taskIdentifier]?.body.append(data)
        lock.unlock()
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: (any Error)?) {
        complete(taskID: task.taskIdentifier) { entry in
            if let error { return .failure(UploadError.transport(error.localizedDescription)) }
            guard let http = task.response as? HTTPURLResponse else { return .failure(UploadError.transport("No response")) }
            guard (200..<300).contains(http.statusCode) else { return .failure(UploadError.transport("HTTP \(http.statusCode)")) }
            if let header = http.value(forHTTPHeaderField: "Upload-Offset"), let offset = Int64(header) { return .success(offset) }
            return .success(entry.fallbackOffset)
        }
    }
}
