import SwiftUI
import DoOnceCore

/// Provenance, always visible: who showed you this, when, how long it took and how many steps.
/// Sits under a procedure hero and on a search "best answer".
@MainActor
struct TaughtByLine: View {
    var memory: Memory
    var avatarSize: CGFloat = 36

    @Environment(AppState.self) private var app

    var body: some View {
        let name = app.demonstratorName(for: memory)
        HStack(spacing: DS.Space.s3) {
            DSAvatar(initials: name.initials, size: avatarSize)
            VStack(alignment: .leading, spacing: 2) {
                Text(L10n.string("people.taughtBy", ["person": name])).dsText(.headline).foregroundStyle(DSColor.textPrimary)
                Text(detail).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var detail: String {
        [DSFormat.longDay(memory.createdAt), DSFormat.duration(memory.duration), L10n.plural("procedure.steps", n: memory.stepCount)]
            .joined(separator: " · ")
    }
}
