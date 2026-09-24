import SwiftUI
import DoOnceCore

/// Everything remembered, newest first, grouped by month. Rows show the object so the list reads
/// on its own.
@MainActor
struct TimelineSection: View {
    var memories: [Memory]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: L10n.string("memory.timeline"))
            ForEach(TimelineGrouping.groups(memories)) { group in
                VStack(alignment: .leading, spacing: 2) {
                    DSEyebrow(text: group.label)
                        .accessibilityAddTraits(.isHeader)
                    MemoryRowList(memories: group.memories, showObject: true)
                }
                .padding(.top, 14)
            }
        }
        .padding(.horizontal, DS.Space.gutter)
    }
}
