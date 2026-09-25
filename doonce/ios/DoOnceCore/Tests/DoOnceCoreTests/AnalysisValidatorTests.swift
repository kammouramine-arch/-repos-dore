import XCTest
@testable import DoOnceCore

final class AnalysisValidatorTests: XCTestCase {
    let transcript = SampleTranscripts.boilerRepressurise
    let moments = SampleTranscripts.boilerRepressuriseAnalysis.moments

    private func request(moments: [DetectedMoment]? = nil, transcript: Transcript? = nil) -> ProcedureAnalysisRequest {
        ProcedureAnalysisRequest(recordingID: SampleIDs.boilerRecording, duration: 118, transcript: transcript ?? self.transcript, moments: moments ?? self.moments, keyFrames: [KeyFrameReference(id: "kf-1", time: 1)])
    }

    private func step(_ order: Int, _ instruction: String, start: TimeInterval? = nil, end: TimeInterval? = nil, spoken: String? = nil, confidence: Double = 0.9, provenance: Provenance = .observed, keyFrame: String? = nil) -> AnalyzedStep {
        AnalyzedStep(order: order, instruction: instruction, sourceStart: start, sourceEnd: end, sourceTranscript: spoken, keyFrameReference: keyFrame, confidence: confidence, provenance: provenance)
    }

    private func validate(_ steps: [AnalyzedStep], title: String = "Boiler", warnings: [String] = [], risk: RiskLevel = .low, request: ProcedureAnalysisRequest? = nil) -> (response: ProcedureAnalysisResponse, adjustments: [AnalysisValidator.Adjustment]) {
        AnalysisValidator.validate(ProcedureAnalysisResponse(title: title, warnings: warnings, riskLevel: risk, steps: steps), request: request ?? self.request())
    }

    func testCleanOutputPassesUntouched() {
        let steps = [step(1, "Open the black valve.", start: 14, end: 35, spoken: "open this black valve"), step(2, "Turn the blue valve slowly.", start: 35, end: 58, spoken: "Turn the blue valve slowly")]
        let (response, adjustments) = validate(steps, risk: .medium)
        XCTAssertEqual(response.steps, steps)
        XCTAssertTrue(adjustments.isEmpty, "\(adjustments)")
    }

    func testSourceRangesAreClampedAndOrdered() {
        let (response, adjustments) = validate([step(1, "Find the loop.", start: -3, end: 14, spoken: "x"), step(2, "Close it.", start: 130, end: 90, spoken: "y"), step(3, "Wait.", start: 58, spoken: "z")])
        XCTAssertEqual(response.steps.map(\.sourceStart), [0, 58, 90])
        XCTAssertEqual(response.steps.map(\.sourceEnd), [14, 58, 118])
        XCTAssertEqual(adjustments.filter { $0.rule == .clampedSourceRange }.map(\.stepOrder), [1, 2, 3])
    }

    func testStepWithoutSpeechIsInferredAndCapped() {
        let unsupported = step(1, "Wipe the gauge.", start: 200, end: 210, confidence: 0.95)
        let silent = Transcript(segments: [TranscriptSegment(start: 0, end: 10, text: "Open the lid and take the filter out now.")])
        let (response, adjustments) = validate([unsupported], request: request(moments: [DetectedMoment(time: 0, kind: .actionDetected), DetectedMoment(time: 20, kind: .actionDetected)], transcript: silent))
        XCTAssertEqual(response.steps[0].provenance, .inferred)
        XCTAssertEqual(response.steps[0].confidence, 0.5)
        XCTAssertTrue(adjustments.contains { $0.rule == .markedInferred && $0.stepOrder == 1 })

        let supportedByWindow = step(1, "Open the lid.", start: 2, end: 8, confidence: 0.9)
        XCTAssertEqual(validate([supportedByWindow], request: request(transcript: silent)).response.steps[0].provenance, .observed, "speech inside the window counts even without a quoted transcript")
    }

    func testLowConfidenceOrEmptyInstructionBecomesUnclear() {
        let (response, adjustments) = validate([
            step(1, "Probably turn something.", start: 0, end: 14, spoken: "Right, so first find the filling loop", confidence: 0.2),
            step(2, "   ", start: 14, end: 35, spoken: "open this black valve", confidence: 0.9),
            step(3, "Hands on the dial", start: 35, end: 58, confidence: 0.2, provenance: .unclear),
        ])
        XCTAssertEqual(response.steps.map(\.provenance), [.unclear, .unclear, .unclear])
        XCTAssertEqual(response.steps[0].instruction, AnalysisValidator.unclearInstruction)
        XCTAssertEqual(response.steps[1].instruction, "This part wasn't clearly captured.")
        XCTAssertEqual(response.steps[2].instruction, "Hands on the dial", "an already-unclear step keeps the moment's label")
        XCTAssertEqual(adjustments.filter { $0.rule == .markedUnclear }.map(\.stepOrder), [1, 2])
    }

    func testValuesNobodySaidAreFlagged() {
        let (response, adjustments) = validate([
            step(1, "Stop when the pressure reaches 1.5 bar.", start: 58, end: 86, spoken: "Stop when the pressure reaches 1.5 bar."),
            step(2, "Set it to 2.5 bar and wait 30 seconds.", start: 86, end: 118, spoken: "Takes 30 seconds once you've done it once."),
        ])
        XCTAssertEqual(response.steps[0].provenance, .observed)
        XCTAssertEqual(response.steps[1].provenance, .inferred)
        XCTAssertEqual(response.uncertainties, ["Value 2.5 bar was not heard in the demonstration"])
        XCTAssertEqual(adjustments.filter { $0.rule == .unheardValue }.map(\.detail), ["2.5 bar"])
    }

    func testStepsAreRenumberedInTimeOrder() {
        let (response, adjustments) = validate([step(7, "Close.", start: 86, end: 118, spoken: "close"), step(2, "Open.", start: 14, end: 35, spoken: "open"), step(9, "Untimed.", spoken: "Right, so first")])
        XCTAssertEqual(response.steps.map(\.order), [1, 2, 3])
        XCTAssertEqual(response.steps.map(\.instruction), ["Open.", "Close.", "Untimed."])
        XCTAssertEqual(adjustments.filter { $0.rule == .renumbered }.count, 3)
    }

    func testRiskIsRaisedToWhatTheWordsSay() {
        let (medium, adjustments) = validate([step(1, "Open the valve.", start: 0, end: 14, spoken: "x")], risk: .low)
        XCTAssertEqual(medium.riskLevel, .medium, "the transcript mentions the boiler and pressure")
        XCTAssertEqual(adjustments.filter { $0.rule == .raisedRiskLevel }.map(\.detail), ["low → medium"])

        let high = validate([step(1, "Turn the gas off first.", start: 0, end: 14, spoken: "x")], risk: .low).response
        XCTAssertEqual(high.riskLevel, .high, "instructions count too")
        XCTAssertEqual(validate([step(1, "Open the valve.", start: 0, end: 14, spoken: "x")], risk: .high).response.riskLevel, .high, "never lowered")
    }

    func testNeverMoreStepsThanMomentsAndSegments() {
        let tiny = Transcript(segments: [TranscriptSegment(start: 0, end: 10, text: "Open the lid.")])
        let one = request(moments: [DetectedMoment(time: 0, kind: .userMarked)], transcript: tiny)
        let steps = [step(1, "Open the lid.", start: 0, end: 5, spoken: "Open the lid.", confidence: 0.9), step(2, "Take the filter out.", start: 5, end: 8, confidence: 0.6), step(3, "Rinse it.", start: 8, end: 10, confidence: 0.6)]
        let (response, adjustments) = validate(steps, request: one)
        XCTAssertEqual(response.steps.count, 2)
        XCTAssertEqual(response.steps.map(\.instruction), ["Open the lid.", "Take the filter out."], "the least confident, latest step goes first")
        XCTAssertEqual(adjustments.filter { $0.rule == .droppedExtraStep }.map(\.stepOrder), [3])

        let nothing = request(moments: [], transcript: Transcript(segments: []))
        XCTAssertTrue(validate(steps, request: nothing).response.steps.isEmpty)
    }

    func testWarningsAreDeduplicatedAndTitleFallsBack() {
        let (response, adjustments) = validate([], title: "  \n", warnings: ["Blue first, always.", "blue first,  always.", "", "Never open it fast."])
        XCTAssertEqual(response.warnings, ["Blue first, always.", "Never open it fast."])
        XCTAssertEqual(response.title, "Untitled memory")
        XCTAssertEqual(adjustments.filter { $0.rule == .droppedDuplicateWarning }.count, 2)
        XCTAssertTrue(adjustments.contains { $0.rule == .titleFallback })
        XCTAssertEqual(AnalysisValidator.validate(ProcedureAnalysisResponse(title: ""), request: request(), untitledFallback: "Sans titre").response.title, "Sans titre")
    }

    func testUnknownKeyFramesAreDropped() {
        let (response, adjustments) = validate([step(1, "Open.", start: 0, end: 14, spoken: "x", keyFrame: "kf-1"), step(2, "Close.", start: 14, end: 35, spoken: "y", keyFrame: "kf-404")])
        XCTAssertEqual(response.steps.map(\.keyFrameReference), ["kf-1", nil])
        XCTAssertEqual(adjustments.filter { $0.rule == .droppedUnknownKeyFrame }.map(\.detail), ["kf-404"])
    }

    func testDeterministicProviderOutputNeedsNoCorrection() async throws {
        let request = request()
        let response = try await DeterministicProcedureAnalysisService().analyze(request)
        let adjustments = AnalysisValidator.validate(response, request: request).adjustments
        XCTAssertTrue(adjustments.isEmpty, "\(adjustments)")
    }
}
