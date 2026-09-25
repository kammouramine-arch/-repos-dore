import SwiftUI

/// Privacy, in plain words: what leaves the phone, what never does, who can see it, that nothing
/// trains a model, and how to delete. The delete actions are one confirmation away.
@MainActor
struct PrivacyView: View {
    @State private var pendingDelete: String?

    private let explanations: [(String, String)] = [
        ("settings.privacy.upload", "settings.privacy.upload.value"),
        ("settings.privacy.private", "settings.privacy.private.value"),
        ("settings.privacy.who", "settings.privacy.who.value"),
        ("settings.privacy.training", "settings.privacy.training.value"),
        ("settings.privacy.delete", "settings.privacy.delete.value"),
    ]
    private let deletions = ["settings.deleteSource", "settings.deleteGuide", "privacy.removePerson", "privacy.removeHousehold"]

    var body: some View {
        PushedScreen {
            VStack(alignment: .leading, spacing: 0) {
                PageTitle(text: L10n.string("settings.privacy")).padding(.top, DS.Space.s2)
                Text(L10n.string("privacy.intro")).dsText(.body).foregroundStyle(DSColor.textSecondary).lineSpacing(3).padding(.top, DS.Space.s2)
                DSList {
                    ForEach(Array(explanations.enumerated()), id: \.offset) { index, pair in
                        if index > 0 { DSSeparator() }
                        ExplanationRow(title: L10n.string(pair.0), text: L10n.string(pair.1))
                    }
                }
                .padding(.top, 28)
                DSList {
                    ForEach(Array(deletions.enumerated()), id: \.offset) { index, key in
                        if index > 0 { DSSeparator() }
                        ActionRow(title: L10n.string(key), tone: DSColor.danger) { pendingDelete = key }
                    }
                }
                .padding(.top, DS.Space.s4)
            }
            .padding(.horizontal, DS.Space.gutter)
        }
        .confirmationDialog(pendingDelete.map { L10n.string($0) } ?? "", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }), titleVisibility: .visible) {
            Button(L10n.string("common.delete"), role: .destructive) { HapticsService.shared.play(.warning); pendingDelete = nil }
            Button(L10n.string("common.cancel"), role: .cancel) { pendingDelete = nil }
        } message: {
            Text(L10n.string("privacy.delete.message"))
        }
    }
}
