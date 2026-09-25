import ActivityKit
import Foundation

/// The Live Activity for a procedure in progress: "3 / 5" in the Dynamic Island, the instruction on the
/// Lock Screen. Compiled into both the app and the widget extension (see `project.yml`), so the two
/// sides agree on the payload without a shared framework.
///
/// Privacy: the state carries the step's instruction text only, which the user chose to save; never
/// media or the transcript.
struct ProcedureActivityAttributes: ActivityAttributes {
    /// What changes as the user progresses.
    struct ContentState: Codable, Hashable {
        /// 1-based step number.
        var stepIndex: Int
        var total: Int
        var instruction: String
        /// The completion target when the step has one ("1.5 bar"), else nil.
        var targetHint: String?
    }

    var memoryID: UUID
    var memoryTitle: String
    /// Localised "Step {i}" template (the `{i}` is filled by the widget), passed in so the extension
    /// needs no copy table of its own.
    var stepLabel: String
}
