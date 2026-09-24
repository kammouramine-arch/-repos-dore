import ActivityKit
import Foundation
import DoOnceCore

/// Starts, updates and ends the procedure Live Activity from Do mode.
///
/// The activity exists so the user can lock the phone, put it on the boiler and still see "3 / 5 · Wait
/// until gauge reaches 1.5 bar" in the Dynamic Island. Every failure here is silent: a missing
/// entitlement or a user who turned Live Activities off must never stop Do mode itself.
@MainActor
final class ProcedureActivityController {
    private var activity: Activity<ProcedureActivityAttributes>?

    var isRunning: Bool { activity != nil }

    func start(memory: Memory, step: Step, index: Int, total: Int) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled, activity == nil else {
            update(step: step, index: index, total: total)
            return
        }
        let attributes = ProcedureActivityAttributes(memoryID: memory.id, memoryTitle: memory.title, stepLabel: L10n.string("activity.step", ["i": "{i}"]))
        let content = ActivityContent(state: Self.state(step: step, index: index, total: total), staleDate: nil)
        activity = try? Activity.request(attributes: attributes, content: content, pushType: nil)
    }

    func update(step: Step, index: Int, total: Int) {
        guard let activity else { return }
        let content = ActivityContent(state: Self.state(step: step, index: index, total: total), staleDate: nil)
        Task { await activity.update(content) }
    }

    func end() {
        guard let activity else { return }
        self.activity = nil
        Task { await activity.end(nil, dismissalPolicy: .immediate) }
    }

    static func state(step: Step, index: Int, total: Int) -> ProcedureActivityAttributes.ContentState {
        var hint: String?
        if case let .gaugeReaches(value, unit) = step.completionRule {
            hint = MeasuredValue(value: value, unit: unit, raw: "").formatted
        }
        return .init(stepIndex: index + 1, total: total, instruction: step.instruction, targetHint: hint)
    }
}
