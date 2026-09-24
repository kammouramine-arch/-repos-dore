import XCTest
import DoOnceCore
@testable import DoOnce

@MainActor
final class DoModeViewModelTests: XCTestCase {
    private let memory = SampleMemories.repressuriseBoiler
    private let user = SampleIDs.amine

    /// Records what Do mode persists.
    @MainActor final class ProgressRecorder: DoProgressStore {
        var saved: [MemoryProgress] = []
        var cleared: [UUID] = []
        func setProgress(_ p: MemoryProgress) { saved.append(p) }
        func clearProgress(memoryID: UUID) { cleared.append(memoryID) }
    }

    /// A monitor that "sees" the gauge the instant a gauge step appears.
    @MainActor final class ImmediateGaugeMonitor: StepCompletionMonitor {
        var fired = 0
        func start(step: Step, onComplete: @escaping @MainActor (String) -> Void) {
            guard case let .gaugeReaches(value, unit) = step.completionRule else { return }
            fired += 1
            onComplete(MeasuredValue(value: value, unit: unit, raw: "").formatted)
        }
        func stop() {}
    }

    private func makeModel(startStep: Int = 1, recorder: ProgressRecorder? = nil, monitor: StepCompletionMonitor = ManualCompletionMonitor()) -> DoModeViewModel {
        let vm = DoModeViewModel(memory: memory, userID: user, startStep: startStep, progressStore: recorder, monitor: monitor)
        vm.appear()
        return vm
    }

    func testStartStepClamps() {
        XCTAssertEqual(makeModel(startStep: 1).index, 0)
        XCTAssertEqual(makeModel(startStep: 0).index, 0)
        XCTAssertEqual(makeModel(startStep: -4).index, 0)
        XCTAssertEqual(makeModel(startStep: 3).index, 2)
        XCTAssertEqual(makeModel(startStep: 99).index, memory.steps.count - 1)
    }

    func testNextAndBackStayInBounds() {
        let vm = makeModel()
        vm.back()
        XCTAssertEqual(vm.index, 0, "back on the first step is a no-op")
        for _ in 0..<(memory.steps.count - 1) { vm.next() }
        XCTAssertEqual(vm.index, memory.steps.count - 1)
        XCTAssertTrue(vm.isLast)
        XCTAssertFalse(vm.isComplete)
        vm.next()
        XCTAssertTrue(vm.isComplete, "next on the last step finishes")
        XCTAssertEqual(vm.index, memory.steps.count - 1)
        vm.next(); vm.back()
        XCTAssertEqual(vm.index, memory.steps.count - 1, "nothing moves after completion")
    }

    func testProgressIsPersistedOnEveryStep() throws {
        let recorder = ProgressRecorder()
        let vm = makeModel(recorder: recorder)
        XCTAssertEqual(recorder.saved.count, 1, "opening persists where the user is")
        vm.next()
        vm.next()
        XCTAssertEqual(recorder.saved.count, 3)
        let latest = try XCTUnwrap(recorder.saved.last)
        XCTAssertEqual(latest.memoryID, memory.id)
        XCTAssertEqual(latest.userID, user)
        XCTAssertEqual(latest.completedStepOrders, [1, 2])
        XCTAssertEqual(latest.totalSteps, memory.steps.count)
        XCTAssertEqual(latest.nextStepOrder, 3, "the Continue card reopens on the step showing")
        XCTAssertTrue(recorder.cleared.isEmpty)
    }

    func testFinishClearsProgress() {
        let recorder = ProgressRecorder()
        let vm = makeModel(startStep: memory.steps.count, recorder: recorder)
        vm.next()
        XCTAssertTrue(vm.isComplete)
        XCTAssertEqual(recorder.cleared, [memory.id])
    }

    func testVoiceIntentsMapToActions() {
        let vm = makeModel(startStep: 2)
        vm.handle(.next)
        XCTAssertEqual(vm.index, 2)
        vm.handle(.back)
        XCTAssertEqual(vm.index, 1)

        let replays = vm.replayToken
        vm.handle(.showMe)
        XCTAssertEqual(vm.replayToken, replays + 1)

        vm.handle(.pause)
        XCTAssertTrue(vm.isPaused)

        vm.handle(.whatDidHeSay)
        XCTAssertEqual(vm.pendingQuestion, L10n.string("ask.voice.whatDidHeSay"))
        vm.handle(.whatValue(unit: "bar"))
        XCTAssertEqual(vm.pendingQuestion, L10n.string("ask.voice.whatValue", ["unit": "bar"]))

        vm.handle(.playOriginal)
        XCTAssertEqual(vm.pendingOriginalAt, memory.orderedSteps[1].sourceRange?.lowerBound)

        vm.handle(.done)
        XCTAssertTrue(vm.isComplete)
        vm.handle(.back)
        XCTAssertEqual(vm.index, 1, "voice does nothing after completion")
    }

    func testAutomaticCompletionOffersButNeverAdvances() {
        let monitor = ImmediateGaugeMonitor()
        let vm = makeModel(startStep: 3, monitor: monitor)
        XCTAssertNil(vm.autoCompletedValue, "step 3 has no gauge rule")
        vm.next() // step 4: "Stop when pressure reaches 1.5 bar."
        XCTAssertEqual(monitor.fired, 1)
        XCTAssertEqual(vm.autoCompletedValue, "1.5 bar")
        XCTAssertTrue(vm.isDoneHighlighted)
        XCTAssertEqual(vm.index, 3, "the monitor highlights Done; the user still decides")
        XCTAssertFalse(vm.isComplete)
        vm.next()
        XCTAssertEqual(vm.index, 4)
        XCTAssertNil(vm.autoCompletedValue, "the chip belongs to the step it was seen on")
        XCTAssertFalse(vm.isDoneHighlighted)
    }

    func testHandsFreeWithoutAListenerFallsBackQuietly() {
        let vm = makeModel()
        vm.setHandsFree(true)
        XCTAssertTrue(vm.isHandsFree)
        vm.setHandsFree(false)
        XCTAssertFalse(vm.isHandsFree)
    }
}
