import XCTest
@testable import DoOnceCore

final class VoiceCommandParserTests: XCTestCase {
    let parser = VoiceCommandParser()

    func testCoreCommands() {
        XCTAssertEqual(parser.parse("next"), .next)
        XCTAssertEqual(parser.parse("back"), .back)
        XCTAssertEqual(parser.parse("repeat"), .repeatStep)
        XCTAssertEqual(parser.parse("show me"), .showMe)
        XCTAssertEqual(parser.parse("pause"), .pause)
        XCTAssertEqual(parser.parse("what did he say?"), .whatDidHeSay)
        XCTAssertEqual(parser.parse("play original"), .playOriginal)
        XCTAssertEqual(parser.parse("done"), .done)
    }

    func testToleratesFillerAndPoliteness() {
        XCTAssertEqual(parser.parse("um, could you go to the next one please"), .next)
        XCTAssertEqual(parser.parse("okay so, uh, go back a step"), .back)
        XCTAssertEqual(parser.parse("hey DoOnce, say that again"), .repeatStep)
        XCTAssertEqual(parser.parse("erm what did she say there?"), .whatDidHeSay)
        XCTAssertEqual(parser.parse("can you just show me"), .showMe)
        XCTAssertEqual(parser.parse("hold on a second"), .pause)
        XCTAssertEqual(parser.parse("I'm all done, thanks"), .done)
        XCTAssertEqual(parser.parse("let me see the original"), .playOriginal)
    }

    func testValueQuestionsCarryTheUnit() {
        XCTAssertEqual(parser.parse("what pressure did he say?"), .whatDidHeSay)
        XCTAssertEqual(parser.parse("what pressure?"), .whatValue(unit: nil))
        XCTAssertEqual(parser.parse("how many bar?"), .whatValue(unit: "bar"))
        XCTAssertEqual(parser.parse("what's the value in bar"), .whatValue(unit: "bar"))
        XCTAssertEqual(parser.parse("what temperature"), .whatValue(unit: "°C"))
    }

    func testMoreSpecificPhrasesWinOverGenericWords() {
        XCTAssertEqual(parser.parse("what's next"), .next)
        XCTAssertEqual(parser.parse("what?"), .repeatStep)
        XCTAssertEqual(parser.parse("show me the original clip"), .playOriginal)
    }

    func testUnrecognisedSpeechIsNil() {
        XCTAssertNil(parser.parse("the weather is lovely today"))
        XCTAssertNil(parser.parse(""))
        XCTAssertNil(parser.parse("um, uh"))
    }
}
