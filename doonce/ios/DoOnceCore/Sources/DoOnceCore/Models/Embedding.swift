import Foundation

/// A fixed-length vector describing what something looks like.
public struct Embedding: Codable, Hashable, Sendable {
    public var values: [Float]

    public init(_ values: [Float]) {
        self.values = values
    }

    public var dimension: Int { values.count }

    /// Euclidean length of the vector.
    public var magnitude: Float {
        values.reduce(0) { $0 + $1 * $1 }.squareRoot()
    }

    /// Dot product; zero when dimensions differ.
    public func dot(_ other: Embedding) -> Float {
        guard values.count == other.values.count else { return 0 }
        var total: Float = 0
        for index in values.indices {
            total += values[index] * other.values[index]
        }
        return total
    }

    /// Cosine similarity in `-1...1`; zero for empty, mismatched or zero-length vectors.
    public func cosineSimilarity(to other: Embedding) -> Double {
        let denominator = magnitude * other.magnitude
        guard denominator > 0, values.count == other.values.count else { return 0 }
        return Double(dot(other) / denominator)
    }
}
