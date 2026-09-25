import Foundation

// The wire contract between the app and any procedure-analysis provider (the DoOnce gateway, an
// on-device model, or the deterministic assembler). Keys are camelCase exactly as the properties
// are named and dates are ISO-8601; the backend contract document mirrors these types.

/// A key frame the app extracted, sent inline as JPEG or by URL once uploaded.
public struct KeyFrameReference: Codable, Sendable, Hashable, Identifiable {
    /// Stable within one request; steps refer back to it through `AnalyzedStep.keyFrameReference`.
    public var id: String
    public var time: TimeInterval
    public var jpegBase64: String?
    public var url: URL?

    public init(id: String, time: TimeInterval, jpegBase64: String? = nil, url: URL? = nil) {
        self.id = id
        self.time = time
        self.jpegBase64 = jpegBase64
        self.url = url
    }
}

/// What the app already knows about the object being demonstrated.
public struct ObjectHint: Codable, Sendable, Hashable {
    public var name: String?
    public var category: String?
    public var brand: String?
    public var model: String?

    public init(name: String? = nil, category: String? = nil, brand: String? = nil, model: String? = nil) {
        self.name = name
        self.category = category
        self.brand = brand
        self.model = model
    }

    public init(_ object: PhysicalObject) {
        self.init(name: object.name, category: object.category, brand: object.brand, model: object.model)
    }
}

/// Everything a provider gets. Nothing else about the household leaves the device.
public struct ProcedureAnalysisRequest: Codable, Sendable, Hashable {
    public var recordingID: UUID
    public var duration: TimeInterval
    /// BCP-47 language of the transcript and the copy to produce.
    public var locale: String
    public var transcript: Transcript
    /// "Remember this" taps.
    public var markers: [TimeInterval]
    public var moments: [DetectedMoment]
    public var keyFrames: [KeyFrameReference]
    public var objectHint: ObjectHint?
    public var demonstratorName: String?

    public init(
        recordingID: UUID,
        duration: TimeInterval,
        locale: String = "en",
        transcript: Transcript,
        markers: [TimeInterval] = [],
        moments: [DetectedMoment] = [],
        keyFrames: [KeyFrameReference] = [],
        objectHint: ObjectHint? = nil,
        demonstratorName: String? = nil
    ) {
        self.recordingID = recordingID
        self.duration = duration
        self.locale = locale
        self.transcript = transcript
        self.markers = markers
        self.moments = moments
        self.keyFrames = keyFrames
        self.objectHint = objectHint
        self.demonstratorName = demonstratorName
    }
}

/// The object the provider thinks it saw.
public struct ObjectCandidate: Codable, Sendable, Hashable {
    public var name: String
    public var category: String
    public var brand: String?
    public var model: String?
    public var confidence: Double

    public init(name: String, category: String, brand: String? = nil, model: String? = nil, confidence: Double) {
        self.name = name
        self.category = category
        self.brand = brand
        self.model = model
        self.confidence = confidence
    }
}

/// One step as a provider proposes it. `AnalysisValidator` decides what the app may show.
public struct AnalyzedStep: Codable, Sendable, Hashable, Identifiable {
    public var id: String { "\(order)" }
    public var order: Int
    public var instruction: String
    public var detail: String?
    public var sourceStart: TimeInterval?
    public var sourceEnd: TimeInterval?
    /// The words spoken in the source range, verbatim.
    public var sourceTranscript: String?
    /// `KeyFrameReference.id` of the frame that shows this step.
    public var keyFrameReference: String?
    public var warning: String?
    /// The provider's own confidence in `0...1`.
    public var confidence: Double
    public var provenance: Provenance

    public init(
        order: Int,
        instruction: String,
        detail: String? = nil,
        sourceStart: TimeInterval? = nil,
        sourceEnd: TimeInterval? = nil,
        sourceTranscript: String? = nil,
        keyFrameReference: String? = nil,
        warning: String? = nil,
        confidence: Double,
        provenance: Provenance
    ) {
        self.order = order
        self.instruction = instruction
        self.detail = detail
        self.sourceStart = sourceStart
        self.sourceEnd = sourceEnd
        self.sourceTranscript = sourceTranscript
        self.keyFrameReference = keyFrameReference
        self.warning = warning
        self.confidence = confidence
        self.provenance = provenance
    }

    /// The source range when both ends are known, or the one known end as a point.
    public var sourceRange: ClosedRange<TimeInterval>? {
        switch (sourceStart, sourceEnd) {
        case (let start?, let end?): min(start, end)...max(start, end)
        case (let start?, nil): start...start
        case (nil, let end?): end...end
        case (nil, nil): nil
        }
    }
}

/// What a provider returns. Never shown to the user before `AnalysisValidator` has run.
public struct ProcedureAnalysisResponse: Codable, Sendable, Hashable {
    public var title: String
    public var shortDescription: String
    public var objectCandidate: ObjectCandidate?
    public var durationEstimate: TimeInterval?
    public var tools: [String]
    public var warnings: [String]
    public var riskLevel: RiskLevel
    public var steps: [AnalyzedStep]
    /// Things the provider was not sure about, shown in the review screen.
    public var uncertainties: [String]

    public init(
        title: String,
        shortDescription: String = "",
        objectCandidate: ObjectCandidate? = nil,
        durationEstimate: TimeInterval? = nil,
        tools: [String] = [],
        warnings: [String] = [],
        riskLevel: RiskLevel = .low,
        steps: [AnalyzedStep] = [],
        uncertainties: [String] = []
    ) {
        self.title = title
        self.shortDescription = shortDescription
        self.objectCandidate = objectCandidate
        self.durationEstimate = durationEstimate
        self.tools = tools
        self.warnings = warnings
        self.riskLevel = riskLevel
        self.steps = steps
        self.uncertainties = uncertainties
    }
}
