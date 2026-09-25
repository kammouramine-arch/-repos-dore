import Foundation
import Observation
import DoOnceCore

/// Where Do mode writes "2 of 7 steps done". `AppState` conforms; tests use a recorder.
@MainActor
protocol DoProgressStore: AnyObject {
    func setProgress(_ p: MemoryProgress)
    func clearProgress(memoryID: UUID)
}

extension AppState: DoProgressStore {}

/// Everything Do mode decides: which step is showing, what hands-free is doing, what a voice command
/// means, and what to persist. The view only renders and routes.
///
/// Invariants: the index never leaves `0..<steps.count`; progress is persisted on every step change and
/// cleared on finish; an automatic completion never changes the index (it sets `autoCompletedValue` and
/// `isDoneHighlighted` and waits for the user).
@MainActor
@Observable
final class DoModeViewModel {
    enum Direction: Int { case back = -1, none = 0, forward = 1 }

    let memory: Memory
    let steps: [Step]
    let userID: UUID

    private(set) var index: Int
    private(set) var direction: Direction = .none
    private(set) var isComplete = false
    private(set) var isHandsFree = false
    private(set) var isPaused = false
    /// The formatted value a monitor saw ("1.5 bar"); drives the "Looks good" chip.
    private(set) var autoCompletedValue: String?
    private(set) var isDoneHighlighted = false
    /// Bumped whenever the clip should restart from the beginning (Replay, "show me").
    private(set) var replayToken = 0
    /// A question the view should open the Ask sheet with (voice: "what did he say?").
    var pendingQuestion: String?
    /// A time the view should open See original at (voice: "play original").
    var pendingOriginalAt: TimeInterval?

    private let progressStore: DoProgressStore?
    private let monitor: StepCompletionMonitor
    private let listener: VoiceIntentSource?
    private let speaker: StepSpeaking?
    private let activity: ProcedureActivityController?
    private let continueStore: ContinueMemoryStore
    private var listeningTask: Task<Void, Never>?

    /// - Parameter startStep: 1-based order to open on (a `MemoryProgress.nextStepOrder`); clamped.
    init(
        memory: Memory,
        userID: UUID,
        startStep: Int = 1,
        handsFree: Bool = false,
        progressStore: DoProgressStore? = nil,
        monitor: StepCompletionMonitor? = nil,
        listener: VoiceIntentSource? = nil,
        speaker: StepSpeaking? = nil,
        activity: ProcedureActivityController? = nil,
        continueStore: ContinueMemoryStore = .shared
    ) {
        self.memory = memory
        self.steps = memory.orderedSteps
        self.userID = userID
        self.index = max(0, min(startStep - 1, max(steps.count - 1, 0)))
        self.progressStore = progressStore
        // Resolved here rather than as a default argument: the monitor is main-actor isolated and
        // default arguments are not (Swift 5 mode).
        self.monitor = monitor ?? GaugeCompletionMonitor()
        self.listener = listener
        self.speaker = speaker
        self.activity = activity
        self.continueStore = continueStore
        self.isHandsFree = handsFree
    }

    var step: Step? { steps.indices.contains(index) ? steps[index] : nil }
    var total: Int { steps.count }
    var isLast: Bool { index >= steps.count - 1 }
    var isFirst: Bool { index == 0 }

    // MARK: Lifecycle

    func appear() {
        guard let step else { return }
        persistProgress()
        activity?.start(memory: memory, step: step, index: index, total: total)
        watch(step)
        if isHandsFree { startListening(); speakCurrentStep() }
    }

    func disappear() {
        monitor.stop()
        stopListening()
        speaker?.stop()
        activity?.end()
    }

    // MARK: Navigation

    func next() {
        guard !isComplete else { return }
        if isLast { finish(); return }
        move(to: index + 1, direction: .forward)
    }

    func back() {
        guard !isComplete, !isFirst else { return }
        move(to: index - 1, direction: .back)
    }

    func finish() {
        guard !isComplete else { return }
        isComplete = true
        monitor.stop()
        stopListening()
        speaker?.stop()
        activity?.end()
        progressStore?.clearProgress(memoryID: memory.id)
        continueStore.clear(memoryID: memory.id)
    }

    func replay() {
        replayToken += 1
        isPaused = false
    }

    private func move(to newIndex: Int, direction: Direction) {
        guard steps.indices.contains(newIndex) else { return }
        self.direction = direction
        index = newIndex
        autoCompletedValue = nil
        isDoneHighlighted = false
        isPaused = false
        persistProgress()
        if let step {
            activity?.update(step: step, index: index, total: total)
            watch(step)
            if isHandsFree { speakCurrentStep() }
        }
    }

    /// Completed orders are every step before the one showing; `nextStepOrder` then reopens here.
    /// The Continue widget gets the same fact through the app group.
    private func persistProgress() {
        let completed = Set(steps.prefix(index).map(\.order))
        progressStore?.setProgress(MemoryProgress(memoryID: memory.id, userID: userID, completedStepOrders: completed, totalSteps: total))
        continueStore.save(.init(memoryID: memory.id, title: memory.title, nextStep: index + 1, total: total, updatedAt: .now))
    }

    // MARK: Automatic completion (offered, never forced)

    private func watch(_ step: Step) {
        monitor.stop()
        let stepID = step.id
        monitor.start(step: step) { [weak self] value in
            guard let self, self.step?.id == stepID, !self.isComplete else { return }
            self.autoCompletedValue = value
            self.isDoneHighlighted = true
        }
    }

    // MARK: Hands-free

    func setHandsFree(_ on: Bool) {
        guard on != isHandsFree else { return }
        isHandsFree = on
        if on { startListening(); speakCurrentStep() } else { stopListening(); speaker?.stop() }
    }

    func speakCurrentStep() {
        guard let step else { return }
        speaker?.speak(instruction: step.instruction, detail: step.details)
    }

    private func startListening() {
        guard let listener, listeningTask == nil else { return }
        listeningTask = Task { [weak self] in
            guard let stream = await listener.start() else {
                await MainActor.run { self?.isHandsFree = false }
                return
            }
            for await intent in stream {
                guard let self, !Task.isCancelled else { break }
                self.handle(intent)
            }
        }
    }

    private func stopListening() {
        listeningTask?.cancel()
        listeningTask = nil
        listener?.stop()
    }

    /// Maps a spoken intent to the same actions the buttons take.
    func handle(_ intent: DoIntent) {
        guard !isComplete else { return }
        switch intent {
        case .next: next()
        case .back: back()
        case .done: finish()
        case .repeatStep: speakCurrentStep()
        case .showMe: replay()
        case .pause:
            isPaused = true
            speaker?.stop()
        case .whatDidHeSay:
            pendingQuestion = L10n.string("ask.voice.whatDidHeSay")
        case .whatValue(let unit):
            pendingQuestion = unit.map { L10n.string("ask.voice.whatValue", ["unit": $0]) } ?? L10n.string("ask.voice.whatValueGeneric")
        case .playOriginal:
            pendingOriginalAt = step?.sourceRange?.lowerBound ?? 0
        }
    }
}
