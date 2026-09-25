import XCTest
@testable import DoOnceCore

final class ProcedureAssemblerTests: XCTestCase {
    let assembler = ProcedureAssembler()
    let transcript = SampleTranscripts.boilerRepressurise
    let moments = SampleTranscripts.boilerRepressuriseAnalysis.moments

    func testOneStepPerDetectedMomentAndNeverMore() {
        let result = assembler.assemble(transcript: transcript, moments: moments)
        XCTAssertEqual(result.steps.count, moments.count)
        XCTAssertEqual(result.steps.map(\.order), [1, 2, 3, 4, 5])
    }

    func testEveryStepKeepsProvenanceIntoTheRecording() throws {
        let result = assembler.assemble(transcript: transcript, moments: moments)
        for step in result.steps {
            XCTAssertNotNil(step.sourceRange, "step \(step.order) lost its source range")
            let spoken = try XCTUnwrap(step.sourceTranscript, "step \(step.order) lost its transcript")
            XCTAssertTrue(transcript.fullText.contains(spoken), "step \(step.order) transcript is not from the recording")
            XCTAssertEqual(step.provenance, .observed)
        }
        XCTAssertEqual(result.steps[0].sourceRange, 0...14)
        XCTAssertEqual(result.steps[4].sourceRange, 86...118)
    }

    func testInstructionsAreTidyImperatives() {
        let steps = assembler.assemble(transcript: transcript, moments: moments).steps
        XCTAssertEqual(steps[2].instruction, "Turn the blue valve slowly.")
        XCTAssertEqual(steps[3].instruction, "Stop when the pressure reaches 1.5 bar.")
        XCTAssertEqual(steps[1].instruction, "Open this black valve on the left.")
        XCTAssertEqual(steps[4].instruction, "Close the blue valve first, and then the black one.")
    }

    func testGaugeCompletionRuleIsExtractedOnlyWhereSpoken() {
        let steps = assembler.assemble(transcript: transcript, moments: moments).steps
        XCTAssertEqual(steps[3].completionRule, .gaugeReaches(value: 1.5, unit: "bar"))
        for step in steps where step.order != 4 {
            XCTAssertEqual(step.completionRule, .manual, "step \(step.order) should be manual")
        }
    }

    func testImportantStatementsBecomeStepWarnings() {
        let steps = assembler.assemble(transcript: transcript, moments: moments).steps
        XCTAssertEqual(steps[2].warning?.trigger, "never")
        XCTAssertTrue(steps[2].warning?.text.hasPrefix("Never open it fast") ?? false)
        XCTAssertEqual(steps[4].warning?.text, "Blue first, always.")
        XCTAssertNil(steps[0].warning)
    }

    func testRiskAndValuesAreReported() {
        let result = assembler.assemble(transcript: transcript, moments: moments)
        XCTAssertEqual(result.riskLevel, .medium)
        XCTAssertTrue(result.measuredValues.contains { $0.value == 1.5 && $0.unit == "bar" })
        XCTAssertEqual(result.importantStatements.count, 4)
    }

    func testSpeechOnlyMomentsAreInferred() {
        let cues = moments.map { DetectedMoment(time: $0.time, kind: .speechCue, confidence: 0.5) }
        let steps = assembler.assemble(transcript: transcript, moments: cues).steps
        XCTAssertEqual(steps.count, cues.count)
        XCTAssertTrue(steps.allSatisfy { $0.provenance == .inferred })
    }

    func testMomentWithoutSpeechIsMarkedUnclearNotInvented() {
        let silentTranscript = Transcript(segments: [
            TranscriptSegment(start: 0, end: 10, text: "Open the lid and take the filter out."),
        ])
        let twoMoments = [
            DetectedMoment(time: 0, kind: .actionDetected),
            DetectedMoment(time: 10, kind: .actionDetected, label: "Hands on the dial"),
        ]
        let steps = assembler.assemble(transcript: silentTranscript, moments: twoMoments).steps
        XCTAssertEqual(steps.count, 2)
        XCTAssertEqual(steps[0].provenance, .observed)
        XCTAssertEqual(steps[1].provenance, .unclear)
        XCTAssertEqual(steps[1].instruction, "Hands on the dial")
        XCTAssertNil(steps[1].sourceTranscript)
    }

    func testWithoutMomentsOnlyInstructionLikeSpeechBecomesSteps() {
        let steps = assembler.assemble(transcript: transcript, moments: []).steps
        XCTAssertFalse(steps.isEmpty)
        XCTAssertLessThanOrEqual(steps.count, transcript.segments.count)
        XCTAssertTrue(steps.allSatisfy { $0.provenance == .inferred })
        for step in steps {
            XCTAssertTrue(transcript.segments.contains { $0.text == step.sourceTranscript })
        }
    }

    func testEmptyTranscriptProducesNoSteps() {
        let result = assembler.assemble(transcript: Transcript(segments: []), moments: [])
        XCTAssertTrue(result.steps.isEmpty)
        XCTAssertEqual(result.riskLevel, .low)
    }
}
