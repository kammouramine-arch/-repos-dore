import CoreGraphics
import CoreVideo
import DoOnceCore
import Foundation
import UIKit
import Vision

/// Object recognition with Vision feature prints.
///
/// `VNGenerateImageFeaturePrintRequest` gives a fixed-length vector that describes how an image
/// looks; the household's objects carry one per reference image and `RecognitionMatcher` compares
/// by cosine similarity.
///
/// Honesty note: feature prints are a *first approximation* of "my boiler vs a boiler". They are
/// trained for whole-image similarity, so two boilers of the same model in similar rooms sit close
/// together, and the same boiler photographed from a new angle can drift. That is why the matcher
/// has an "is this your…?" band and why Look asks before it asserts. A learned, object-centric
/// embedding (a small metric-learning head over the same Vision features, fine-tuned on the
/// household's own confirmations) would plug in by replacing `embedding(for:)` and
/// `embed(_:)`; nothing else changes.
struct VisionRecognitionService: ObjectRecognitionService, FrameEmbeddingSource, Sendable {
    var matcher = RecognitionMatcher()

    // MARK: ObjectRecognitionService

    func embed(_ image: MediaRef) async throws -> Embedding {
        guard let url = image.localURL else { throw Failure.noLocalFile }
        let handler = VNImageRequestHandler(url: url, options: [:])
        return try Self.embedding(with: handler)
    }

    func recognise(_ image: MediaRef, among objects: [PhysicalObject]) async throws -> RecognitionResult {
        matcher.match(try await embed(image), against: objects)
    }

    // MARK: FrameEmbeddingSource (camera frames)

    func embedding(for frame: CVPixelBuffer) throws -> Embedding {
        try Self.embedding(with: VNImageRequestHandler(cvPixelBuffer: frame, orientation: .up, options: [:]))
    }

    /// The most attention-grabbing region, normalised with a top-left origin, or nil when Vision
    /// finds nothing salient enough to draw a contour around.
    func salientRegion(in frame: CVPixelBuffer) throws -> CGRect? {
        let request = VNGenerateAttentionBasedSaliencyImageRequest()
        try VNImageRequestHandler(cvPixelBuffer: frame, orientation: .up, options: [:]).perform([request])
        guard let observation = request.results?.first as? VNSaliencyImageObservation,
              let box = observation.salientObjects?.max(by: { $0.confidence < $1.confidence }) else { return nil }
        return Self.flipped(box.boundingBox)
    }

    // MARK: Helpers

    static func embedding(with handler: VNImageRequestHandler) throws -> Embedding {
        let request = VNGenerateImageFeaturePrintRequest()
        try handler.perform([request])
        guard let print = request.results?.first as? VNFeaturePrintObservation else { throw Failure.noFeaturePrint }
        return embedding(from: print)
    }

    /// Vision hands back raw bytes; the element type says whether they are floats or doubles.
    static func embedding(from print: VNFeaturePrintObservation) -> Embedding {
        let count = print.elementCount
        let values: [Float] = print.data.withUnsafeBytes { raw in
            switch print.elementType {
            case .float: Array(raw.bindMemory(to: Float.self).prefix(count))
            case .double: raw.bindMemory(to: Double.self).prefix(count).map(Float.init)
            case .unknown: []
            @unknown default: []
            }
        }
        return Embedding(values)
    }

    /// Vision rectangles have their origin bottom-left; the UI wants top-left.
    static func flipped(_ box: CGRect) -> CGRect {
        CGRect(x: box.minX, y: 1 - box.maxY, width: box.width, height: box.height)
    }

    enum Failure: Error {
        case noLocalFile
        case noFeaturePrint
    }
}

/// Anything that can turn a camera frame into an embedding and, optionally, a salient region.
/// `LiveRecogniser` depends on this so tests can feed it deterministic embeddings.
protocol FrameEmbeddingSource: Sendable {
    func embedding(for frame: CVPixelBuffer) throws -> Embedding
    func salientRegion(in frame: CVPixelBuffer) throws -> CGRect?
}
