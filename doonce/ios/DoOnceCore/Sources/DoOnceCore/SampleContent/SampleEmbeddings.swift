import Foundation

/// Deterministic 16-dimension embeddings for sample objects. Each object sits in its own region;
/// `camera(near:noise:)` produces a query that lands close to it.
public enum SampleEmbeddings {
    public static let dimension = 16

    public static let boilerFront = unit(seed: 1)
    /// A second view of the same boiler: mostly the same direction, a little different.
    public static let boilerGauge = blend(unit(seed: 1), unit(seed: 11), weight: 0.9)
    public static let espressoMachine = unit(seed: 2)
    public static let thermostat = unit(seed: 3)
    public static let washingMachine = unit(seed: 4)
    public static let router = unit(seed: 5)
    public static let car = unit(seed: 6)

    /// What the camera might produce when looking at an object: the object's embedding pulled towards noise.
    /// `noise` of 0 returns the object exactly; 1 returns pure noise.
    public static func camera(near embedding: Embedding, noise: Double, seed: Int = 99) -> Embedding {
        blend(embedding, unit(seed: seed), weight: 1 - noise)
    }

    /// A unit vector from a tiny deterministic generator (no Foundation randomness, same on every platform).
    static func unit(seed: Int) -> Embedding {
        var state = UInt64(seed &* 2_654_435_761 + 12_345)
        var values: [Float] = []
        for _ in 0..<dimension {
            state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
            let fraction = Double(state >> 11) / Double(1 << 53)
            values.append(Float(fraction * 2 - 1))
        }
        return normalised(Embedding(values))
    }

    static func blend(_ a: Embedding, _ b: Embedding, weight: Double) -> Embedding {
        let w = Float(weight)
        return normalised(Embedding(zip(a.values, b.values).map { $0 * w + $1 * (1 - w) }))
    }

    static func normalised(_ embedding: Embedding) -> Embedding {
        let magnitude = embedding.magnitude
        guard magnitude > 0 else { return embedding }
        return Embedding(embedding.values.map { $0 / magnitude })
    }
}
