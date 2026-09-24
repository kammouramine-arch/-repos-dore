import Foundation

/// A reference to an image, video or audio file, stored locally, remotely, or both.
public struct MediaRef: Codable, Hashable, Sendable {
    public enum Kind: String, Codable, Hashable, Sendable {
        case image
        case video
        case audio
    }

    public var kind: Kind
    public var localURL: URL?
    public var remoteURL: URL?
    /// For clips: where the clip starts inside its source recording.
    public var sourceOffset: TimeInterval?
    public var duration: TimeInterval?

    public init(
        kind: Kind,
        localURL: URL? = nil,
        remoteURL: URL? = nil,
        sourceOffset: TimeInterval? = nil,
        duration: TimeInterval? = nil
    ) {
        precondition(localURL != nil || remoteURL != nil, "A MediaRef needs at least one URL")
        self.kind = kind
        self.localURL = localURL
        self.remoteURL = remoteURL
        self.sourceOffset = sourceOffset
        self.duration = duration
    }

    /// True when the media can be shown without a network connection.
    public var isAvailableOffline: Bool { localURL != nil }
}
