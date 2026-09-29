import SwiftUI

/// Marks sample content shown as a demonstration, so it can never pass for the user's own memories.
@MainActor
struct ExampleChip: View {
    var onMedia = false
    var body: some View {
        DSChip(text: L10n.string("example.badge"), tone: onMedia ? .onMedia : .neutral)
            .accessibilityIdentifier("example.badge")
    }
}
