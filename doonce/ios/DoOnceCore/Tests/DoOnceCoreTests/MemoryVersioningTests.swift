import XCTest
@testable import DoOnceCore

final class MemoryVersioningTests: XCTestCase {
    let original = SampleMemories.repressuriseBoiler
    let editor = SampleIDs.alex
    let when = SampleDates.date(2026, 9, 1)

    func testUpdatingAStepKeepsTheOldStepsInHistory() throws {
        var step = original.steps[3]
        step.instruction = "Stop when pressure reaches 1.4 bar."
        step.completionRule = .gaugeReaches(value: 1.4, unit: "bar")

        let updated = try MemoryVersioning.updateStep(step, in: original, by: editor, at: when)

        XCTAssertEqual(updated.version, 2)
        XCTAssertEqual(updated.steps[3].instruction, "Stop when pressure reaches 1.4 bar.")
        XCTAssertEqual(updated.steps[3].order, 4)
        XCTAssertEqual(updated.versionHistory.count, 1)
        XCTAssertEqual(updated.versionHistory[0].version, 1)
        XCTAssertEqual(updated.versionHistory[0].steps, original.steps)
        XCTAssertEqual(updated.versionHistory[0].editedBy, editor)
        XCTAssertEqual(updated.versionHistory[0].editedAt, when)
        XCTAssertEqual(updated.versionHistory[0].note, "Edited step 4")
        // Provenance survives the edit.
        XCTAssertEqual(updated.steps[3].sourceRange, original.steps[3].sourceRange)
    }

    func testUnknownStepIsRejected() {
        let stray = Step(order: 9, instruction: "x", provenance: .inferred)
        XCTAssertThrowsError(try MemoryVersioning.updateStep(stray, in: original, by: editor)) { error in
            XCTAssertEqual(error as? MemoryVersioning.Error, .stepNotFound(stray.id))
        }
    }

    func testReplacingStepsRenumbersAndRecords() {
        let combined = MemoryVersioning.replaceSteps(Array(original.steps.dropLast()), in: original, by: editor, note: "Combined 4 and 5", at: when)
        XCTAssertEqual(combined.steps.count, 4)
        XCTAssertEqual(combined.steps.map(\.order), [1, 2, 3, 4])
        XCTAssertEqual(combined.version, 2)
        XCTAssertEqual(combined.versionHistory.last?.note, "Combined 4 and 5")
    }

    func testRevertRestoresWithoutLosingHistory() throws {
        let renamed = MemoryVersioning.rename(original, to: "Top up boiler", by: editor, at: when)
        let trimmed = MemoryVersioning.replaceSteps(Array(renamed.steps.prefix(2)), in: renamed, by: editor, at: when)
        XCTAssertEqual(trimmed.version, 3)

        let reverted = try MemoryVersioning.revert(trimmed, to: 1, by: editor, at: when)
        XCTAssertEqual(reverted.version, 4)
        XCTAssertEqual(reverted.title, original.title)
        XCTAssertEqual(reverted.steps, original.steps)
        XCTAssertEqual(reverted.versionHistory.map(\.version), [1, 2, 3])
        XCTAssertThrowsError(try MemoryVersioning.revert(reverted, to: 42, by: editor))
    }

    func testConfirmingAccuracyIsNotAVersion() {
        let confirmed = MemoryVersioning.confirmAccurate(original, at: when)
        XCTAssertEqual(confirmed.lastConfirmedAt, when)
        XCTAssertEqual(confirmed.version, original.version)
    }
}
