import XCTest
import DoOnceCore
@testable import DoOnce

final class TranscriptGroundedAnswererTests: XCTestCase {
    private let memory = SampleMemories.repressuriseBoiler
    private let transcript = SampleTranscripts.boilerRepressurise
    private var answerer: TranscriptGroundedAnswerer { TranscriptGroundedAnswerer(transcript: transcript, speaker: "Julien") }

    func testWhatPressureQuotesTheTargetSegmentWithItsStartTime() async throws {
        let answer = await answerer.answer("what pressure?", memory: memory, currentStep: nil)
        XCTAssertEqual(answer.sourceTime, 58.0)
        XCTAssertEqual(answer.speaker, "Julien")
        let segment = try XCTUnwrap(transcript.segments.first { $0.start == 58.0 })
        XCTAssertTrue(segment.text.contains("1.5 bar"))
        XCTAssertEqual(answer.text, L10n.string("ask.said", ["person": "Julien", "quote": segment.text]))
        XCTAssertTrue(answer.isGrounded)
    }

    func testCurrentStepWeightsWhatWasSaidThen() async throws {
        let step3 = memory.orderedSteps[2] // "Turn the blue valve slowly." 35…58
        let answer = await answerer.answer("which valve?", memory: memory, currentStep: step3)
        let time = try XCTUnwrap(answer.sourceTime)
        XCTAssertTrue((35.0...58.0).contains(time), "expected a segment from step 3, got \(time)")
        XCTAssertTrue(answer.text.lowercased().contains("blue valve"), answer.text)
    }

    func testUnknownQuestionGetsTheCalmFallbackWithNoTime() async {
        let answer = await answerer.answer("how do I bake bread?", memory: memory, currentStep: nil)
        XCTAssertNil(answer.sourceTime)
        XCTAssertNil(answer.speaker)
        XCTAssertFalse(answer.isGrounded)
        XCTAssertEqual(answer.text, L10n.string("ask.nothing", ["person": "Julien"]))
    }

    func testFallsBackToStepTranscriptsWithoutARecording() async {
        let local = TranscriptGroundedAnswerer(transcript: nil, speaker: "Julien")
        let answer = await local.answer("what if there is a leak?", memory: memory, currentStep: nil)
        XCTAssertEqual(answer.sourceTime, 86.0, "step 5's words are placed at its source range")
    }

    func testSuggestionsComeFromTheTranscript() {
        let chips = AskSuggestions.chips(for: memory, transcript: transcript)
        XCTAssertEqual(chips.count, 3)
        XCTAssertEqual(chips[0], L10n.string("ask.suggest.pressure"))
        XCTAssertEqual(chips[1], L10n.string("ask.suggest.which", ["object": "valve"]))
        XCTAssertEqual(chips[2], L10n.string("ask.suggest.howLong"))
    }
}
