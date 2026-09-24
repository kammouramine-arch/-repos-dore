import Foundation

/// Recognises objects from deterministic embeddings keyed by the image's file name.
///
/// An image named `boiler-front.jpg` embeds to the boiler; an unknown name embeds to noise.
/// `noise` pulls every embedding away from its object so previews can show the "Is this your…?" state.
public struct MockObjectRecognitionService: ObjectRecognitionService {
    public var matcher: RecognitionMatcher
    /// 0 = exact, 1 = pure noise.
    public var noise: Double

    public init(matcher: RecognitionMatcher = RecognitionMatcher(), noise: Double = 0.05) {
        self.matcher = matcher
        self.noise = noise
    }

    /// File-name prefix → embedding.
    static let knownImages: [(prefix: String, embedding: Embedding)] = [
        ("boiler", SampleEmbeddings.boilerFront),
        ("linea", SampleEmbeddings.espressoMachine),
        ("espresso", SampleEmbeddings.espressoMachine),
        ("nest", SampleEmbeddings.thermostat),
        ("thermostat", SampleEmbeddings.thermostat),
        ("washing", SampleEmbeddings.washingMachine),
        ("router", SampleEmbeddings.router),
        ("car", SampleEmbeddings.car),
    ]

    public func embed(_ image: MediaRef) async throws -> Embedding {
        let name = (image.localURL ?? image.remoteURL)?.lastPathComponent.lowercased() ?? ""
        let seed = abs(name.hashValue % 1000) + 1000
        guard let known = Self.knownImages.first(where: { name.hasPrefix($0.prefix) }) else {
            return SampleEmbeddings.unit(seed: seed)
        }
        return SampleEmbeddings.camera(near: known.embedding, noise: noise, seed: seed)
    }

    public func recognise(_ image: MediaRef, among objects: [PhysicalObject]) async throws -> RecognitionResult {
        matcher.match(try await embed(image), against: objects)
    }
}
