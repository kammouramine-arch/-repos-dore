import SwiftUI
import DoOnceCore

/// Provenance, always visible: who showed it ("Shown by Julien", "Shown by you"), when, how long it
/// took and how many steps. Nobody named yet: just the facts, no invented name.
/// Sits under a procedure hero and on a search "best answer".
@MainActor
struct TaughtByLine: View {
    var memory: Memory
    var avatarSize: CGFloat = 36

    @Environment(AppState.self) private var app

    var body: some View {
        HStack(spacing: DS.Space.s3) {
            if let initials { DSAvatar(initials: initials, size: avatarSize) }
            VStack(alignment: .leading, spacing: 2) {
                if let shownBy = app.shownBy(for: memory) {
                    Text(shownBy).dsText(.headline).foregroundStyle(DSColor.textPrimary)
                }
                Text(detail).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var initials: String? {
        switch app.demonstrator(for: memory) {
        case .you: app.currentUser.displayName.initials
        case .person(let name): name.initials
        case .unknown: nil
        }
    }

    private var detail: String {
        [DSFormat.longDay(memory.createdAt), DSFormat.duration(memory.duration), L10n.plural("procedure.steps", n: memory.stepCount)]
            .joined(separator: " · ")
    }
}
