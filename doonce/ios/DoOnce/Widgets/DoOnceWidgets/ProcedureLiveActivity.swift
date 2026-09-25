import ActivityKit
import SwiftUI
import WidgetKit

/// The procedure in progress, on the Lock Screen and in the Dynamic Island.
///
/// Compact: a signal dot and "3 / 5". Expanded: "Step 3 · Wait until gauge reaches 1.5 bar" with the
/// instruction beneath, so a phone resting on the boiler still shows what to do.
struct ProcedureLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ProcedureActivityAttributes.self) { context in
            lockScreen(context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    signalDot.padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(headline(context)).font(.system(size: 15, weight: .semibold)).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.instruction).font(.system(size: 17, weight: .bold)).lineLimit(2)
                        .padding(.top, 2)
                }
            } compactLeading: {
                signalDot.padding(.leading, 4)
            } compactTrailing: {
                Text(counter(context)).font(.system(size: 14, weight: .semibold)).monospacedDigit()
            } minimal: {
                signalDot
            }
            .widgetURL(deepLink(context))
        }
    }

    private func lockScreen(_ context: ActivityViewContext<ProcedureActivityAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                signalDot
                Text(headline(context)).font(.system(size: 13, weight: .semibold)).foregroundStyle(DSColor.textSecondary)
                Spacer()
                Text(counter(context)).font(.system(size: 13, weight: .semibold)).monospacedDigit().foregroundStyle(DSColor.textSecondary)
            }
            Text(context.state.instruction).font(.system(size: 20, weight: .bold)).lineLimit(2)
                .foregroundStyle(DSColor.textPrimary)
        }
        .padding(16)
        .activityBackgroundTint(DSColor.backgroundElevated)
        .activitySystemActionForegroundColor(DSColor.textPrimary)
        .widgetURL(deepLink(context))
    }

    private var signalDot: some View {
        Circle().fill(DSColor.signal).frame(width: 8, height: 8).accessibilityHidden(true)
    }

    private func counter(_ context: ActivityViewContext<ProcedureActivityAttributes>) -> String {
        "\(context.state.stepIndex) / \(context.state.total)"
    }

    /// "Step 3 · 1.5 bar" when the step has a target, else "Step 3".
    private func headline(_ context: ActivityViewContext<ProcedureActivityAttributes>) -> String {
        let step = context.attributes.stepLabel.replacingOccurrences(of: "{i}", with: String(context.state.stepIndex))
        if let hint = context.state.targetHint { return "\(step) · \(hint)" }
        return step
    }

    private func deepLink(_ context: ActivityViewContext<ProcedureActivityAttributes>) -> URL? {
        URL(string: "doonce://do/\(context.attributes.memoryID.uuidString)")
    }
}
