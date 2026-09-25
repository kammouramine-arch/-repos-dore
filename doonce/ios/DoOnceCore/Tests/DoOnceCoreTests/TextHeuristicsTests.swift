import XCTest
@testable import DoOnceCore

final class NumericValueExtractorTests: XCTestCase {
    func testExtractsDecimalBar() {
        let values = NumericValueExtractor.extract(from: "Stop when the pressure reaches 1.5 bar.")
        XCTAssertEqual(values.count, 1)
        XCTAssertEqual(values.first?.value, 1.5)
        XCTAssertEqual(values.first?.unit, "bar")
        XCTAssertEqual(values.first?.formatted, "1.5 bar")
    }

    func testAcceptsCommaDecimalsAndCanonicalisesUnits() {
        XCTAssertEqual(NumericValueExtractor.first(in: "it should be 1,4 bar")?.value, 1.4)
        XCTAssertEqual(NumericValueExtractor.first(in: "set it to 93 degrees")?.unit, "°C")
        XCTAssertEqual(NumericValueExtractor.first(in: "hold it 30 seconds")?.unit, "s")
        XCTAssertEqual(NumericValueExtractor.first(in: "eighteen, 18 grams in")?.unit, "g")
    }

    func testIgnoresNumbersWithoutUnits() {
        XCTAssertNil(NumericValueExtractor.first(in: "if it goes past 1.6 you've gone too far"))
        XCTAssertNil(NumericValueExtractor.first(in: "press it 3 times"))
    }

    func testFindsAllValuesInOrder() {
        let values = NumericValueExtractor.extract(from: "between 1 bar and 1.5 bar, never 2 bar")
        XCTAssertEqual(values.map(\.value), [1, 1.5, 2])
    }
}

final class ImportantStatementDetectorTests: XCTestCase {
    func testDetectsKeywordSentencesOnly() {
        let text = "Turn it slowly. Never open it fast. It takes a minute. Remember to close both valves."
        let statements = ImportantStatementDetector.detect(in: text)
        XCTAssertEqual(statements.map(\.text), ["Never open it fast.", "Remember to close both valves."])
        XCTAssertEqual(statements.map(\.keyword), ["never", "remember"])
    }

    func testAllSpecKeywordsTrigger() {
        for keyword in ["important", "never", "remember", "careful", "always"] {
            XCTAssertTrue(ImportantStatementDetector.isImportant("This is \(keyword) stuff."), keyword)
        }
        XCTAssertFalse(ImportantStatementDetector.isImportant("Turn the valve."))
    }

    func testKeywordMustBeAWholeWord() {
        XCTAssertFalse(ImportantStatementDetector.isImportant("The carefully-labelled box."))
    }
}

final class RiskClassifierTests: XCTestCase {
    func testHighRiskKeywords() {
        XCTAssertEqual(RiskClassifier.classify("Turn the gas off at the meter."), .high)
        XCTAssertEqual(RiskClassifier.classify("Switch it off at the mains first."), .high)
        XCTAssertEqual(RiskClassifier.classify("Mind the blade when you lift it."), .high)
        XCTAssertEqual(RiskClassifier.classify("Pump the brakes twice."), .high)
        XCTAssertEqual(RiskClassifier.classify("It's an electric hob."), .high)
        XCTAssertEqual(RiskClassifier.classify("Wear gloves, it's a chemical descaler."), .high)
    }

    func testMediumRiskKeywords() {
        XCTAssertEqual(RiskClassifier.classify("The boiler needs topping up."), .medium)
        XCTAssertEqual(RiskClassifier.classify("Careful, it's hot."), .medium)
    }

    func testKeywordsMatchWholeWordsOnly() {
        XCTAssertEqual(RiskClassifier.classify("Take a photo of the shot."), .low)
        XCTAssertEqual(RiskClassifier.classify("Plug it into the router."), .low)
    }

    func testHighestLevelWinsAcrossTexts() {
        XCTAssertEqual(RiskClassifier.classify(["press the button", "boiler", "gas"]), .high)
        XCTAssertEqual(RiskClassifier.triggers(in: "gas boiler, gas again"), ["gas", "boiler"])
    }
}

final class TextTokenizerTests: XCTestCase {
    func testKeepsDecimalsAndDropsPunctuation() {
        XCTAssertEqual(TextTokenizer.words("Stop at 1.5 bar, okay?"), ["stop", "at", "1.5", "bar", "okay"])
    }

    func testSearchTokensDropStopWordsAndStem() {
        XCTAssertEqual(TextTokenizer.searchTokens("the thing dad showed me for the boiler"), ["dad", "boiler"])
        XCTAssertEqual(TextTokenizer.stem("settings"), "setting")
        XCTAssertEqual(TextTokenizer.stem("valves"), "valve")
        XCTAssertEqual(TextTokenizer.stem("pressure"), "pressure")
    }

    func testSentencesKeepDecimalPoints() {
        XCTAssertEqual(TextTokenizer.sentences("Stop at 1.5 bar. Then close it."), ["Stop at 1.5 bar.", "Then close it."])
    }
}
