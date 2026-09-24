import SwiftUI
import WidgetKit

/// The widget extension: the procedure Live Activity and the Continue widget.
///
/// Styling here uses `DSColor` (the token files are compiled into this target too) and system fonts;
/// the extension has no design-system components, so layouts stay deliberately plain.
@main
struct DoOnceWidgetsBundle: WidgetBundle {
    var body: some Widget {
        ProcedureLiveActivity()
        ContinueMemoryWidget()
    }
}
