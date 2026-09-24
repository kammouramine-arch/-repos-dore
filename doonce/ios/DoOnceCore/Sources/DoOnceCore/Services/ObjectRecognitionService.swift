import Foundation

/// Produces embeddings for images and matches them against the household's objects.
public protocol ObjectRecognitionService: Sendable {
    /// A visual embedding for an image.
    func embed(_ image: MediaRef) async throws -> Embedding
    /// Which of the given objects the image shows, if any.
    func recognise(_ image: MediaRef, among objects: [PhysicalObject]) async throws -> RecognitionResult
}
