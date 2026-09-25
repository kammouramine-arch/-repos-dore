import Foundation
import DoOnceCore

/// Watches the world for a step's `CompletionRule` and reports when it is met.
///
/// A monitor only ever *offers* completion: Do mode highlights Done and plays a success haptic, it never
/// advances on its own, because a mis-read gauge must cost the user a glance, not a wrong step.
@MainActor
protocol StepCompletionMonitor: AnyObject {
    /// Begins watching `step`. `onComplete` is called at most once, on the main actor, with the value
    /// that satisfied the rule formatted for display ("1.5 bar").
    func start(step: Step, onComplete: @escaping @MainActor (String) -> Void)
    func stop()
}

/// The default: nothing is watched, the user taps Done or says "next".
@MainActor
final class ManualCompletionMonitor: StepCompletionMonitor {
    func start(step: Step, onComplete: @escaping @MainActor (String) -> Void) {}
    func stop() {}
}

/// Completes `.gaugeReaches(value:unit:)` steps by reading the gauge through the camera.
///
/// MOCKED. The real monitor plugs in at `startReading`: run a Vision request (`VNRecognizeTextRequest`
/// on the gauge face, or a small needle-angle model) on frames from `CameraService`, convert the reading
/// to the rule's unit, and call `onComplete` once the reading has held at or above the target for ~1 s
/// at confidence ≥ 0.8. Until that exists, sample mode fires after `simulatedDelay` so the interaction
/// (chip, haptic, highlighted Done) can be felt and tested; non-gauge steps never fire.
@MainActor
final class GaugeCompletionMonitor: StepCompletionMonitor {
    /// Seconds before the simulated reading "arrives". Nil disables the simulation entirely.
    var simulatedDelay: TimeInterval?
    private var task: Task<Void, Never>?

    init(simulatedDelay: TimeInterval? = 2.2) {
        self.simulatedDelay = simulatedDelay
    }

    func start(step: Step, onComplete: @escaping @MainActor (String) -> Void) {
        stop()
        guard case let .gaugeReaches(value, unit) = step.completionRule else { return }
        startReading(target: MeasuredValue(value: value, unit: unit, raw: ""), onComplete: onComplete)
    }

    func stop() {
        task?.cancel()
        task = nil
    }

    /// Where the Vision reading would go. Currently a timer standing in for the camera.
    private func startReading(target: MeasuredValue, onComplete: @escaping @MainActor (String) -> Void) {
        guard let simulatedDelay else { return }
        task = Task { [weak self] in
            try? await Task.sleep(for: .seconds(simulatedDelay))
            guard let self, !Task.isCancelled, self.task != nil else { return }
            self.task = nil
            onComplete(target.formatted)
        }
    }
}
