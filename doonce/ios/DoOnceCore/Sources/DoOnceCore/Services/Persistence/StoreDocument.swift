import Foundation
#if canImport(Glibc)
import Glibc
#elseif canImport(Musl)
import Musl
#elseif canImport(Darwin)
import Darwin
#endif

/// The on-disk shape of `store.json`: a schema version around the household snapshot.
///
/// The version lets a newer app refuse nothing and an older app refuse a document it cannot
/// understand, instead of decoding half of it and writing the half back.
public struct StoreDocument: Codable, Hashable, Sendable {
    public var schemaVersion: Int
    public var snapshot: MemoryStoreSnapshot

    public init(schemaVersion: Int = FileStore.schemaVersion, snapshot: MemoryStoreSnapshot) {
        self.schemaVersion = schemaVersion
        self.snapshot = snapshot
    }

    /// Only the version, so a document can be checked before it is decoded in full.
    struct Header: Decodable {
        var schemaVersion: Int
    }
}

/// JSON coding shared by every file this package writes.
///
/// Dates are ISO-8601 with millisecond precision (so a round trip keeps what the UI shows) and
/// keys are sorted with indentation, so two saves of the same state produce byte-identical files
/// and backups or sync diffs stay readable.
public enum StoreCoding {
    public static func encoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .prettyPrinted]
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(fractionalFormatter().string(from: date))
        }
        return encoder
    }

    public static func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            if let date = fractionalFormatter().date(from: text) ?? plainFormatter().date(from: text) {
                return date
            }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Not an ISO-8601 date: \(text)"))
        }
        return decoder
    }

    /// Dates are millisecond precision on disk; values compared after a round trip must match.
    public static func normalised(_ date: Date) -> Date {
        Date(timeIntervalSince1970: (date.timeIntervalSince1970 * 1000).rounded() / 1000)
    }

    // Formatters are not Sendable, so they are made per call rather than shared; saves are rare.
    private static func fractionalFormatter() -> ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }

    private static func plainFormatter() -> ISO8601DateFormatter {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }
}

/// Writes a file so that readers see either the old contents or the new, never a mix.
///
/// The data goes to a temporary sibling first, then a POSIX `rename` swaps it in; on both Linux
/// and Darwin that is a single atomic directory operation. (`FileManager.replaceItemAt` is not
/// usable here: swift-corelibs-foundation removes the destination before failing.)
enum AtomicFile {
    /// The prefix temporary files carry, so a crash leaves nothing a loader mistakes for the real file.
    static let temporaryPrefix = ".tmp-"

    static func write(_ data: Data, to destination: URL) throws {
        let directory = destination.deletingLastPathComponent()
        let temporary = directory.appendingPathComponent(temporaryPrefix + destination.lastPathComponent + "-" + UUID().uuidString)
        try data.write(to: temporary, options: [])
        guard rename(temporary.path, destination.path) == 0 else {
            let code = errno
            try? FileManager.default.removeItem(at: temporary)
            throw NSError(domain: NSPOSIXErrorDomain, code: Int(code), userInfo: [NSFilePathErrorKey: destination.path])
        }
    }

    /// Removes leftovers from writes that never finished.
    static func removeStaleTemporaries(in directory: URL) {
        let names = (try? FileManager.default.contentsOfDirectory(atPath: directory.path)) ?? []
        for name in names where name.hasPrefix(temporaryPrefix) {
            try? FileManager.default.removeItem(at: directory.appendingPathComponent(name))
        }
    }
}
