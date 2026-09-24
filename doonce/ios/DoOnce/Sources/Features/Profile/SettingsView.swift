import SwiftUI
import DoOnceCore

/// Settings: feel (haptics, sounds, appearance), capture (recording quality, language), data
/// (privacy, export, download) and the way out.
@MainActor
struct SettingsView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @AppStorage("appearance") private var appearance = "auto"
    @State private var confirmSignOut = false

    var body: some View {
        @Bindable var app = app
        PushedScreen {
            VStack(alignment: .leading, spacing: DS.Space.s4) {
                PageTitle(text: L10n.string("settings.title")).padding(.top, DS.Space.s2).padding(.bottom, DS.Space.s2)
                DSList {
                    NavRow(title: L10n.string("settings.haptics"), subtitle: HapticsService.shared.policy.displayName) { router.push(.haptics) }
                    DSSeparator()
                    ToggleRow(title: L10n.string("settings.sounds"), isOn: $app.soundsEnabled)
                    DSSeparator()
                    appearanceRow
                    DSSeparator()
                    ValueRow(title: L10n.string("settings.quality"), value: L10n.string("settings.quality.value"))
                    DSSeparator()
                    ValueRow(title: L10n.string("settings.language"), value: languageName)
                }
                DSList {
                    NavRow(title: L10n.string("settings.privacy")) { router.push(.privacy) }
                    DSSeparator()
                    ShareLink(item: exportJSON) {
                        DSRow(title: L10n.string("settings.export"), leading: { EmptyView() }, trailing: { EmptyView() }).foregroundStyle(DSColor.textPrimary)
                    }
                    .buttonStyle(.dsRowPressable)
                    DSSeparator()
                    ShareLink(item: exportJSON) {
                        DSRow(title: L10n.string("settings.download"), leading: { EmptyView() }, trailing: { EmptyView() }).foregroundStyle(DSColor.textPrimary)
                    }
                    .buttonStyle(.dsRowPressable)
                }
                DSList {
                    ActionRow(title: L10n.string("settings.signOut"), tone: DSColor.danger) { confirmSignOut = true }
                }
            }
            .padding(.horizontal, DS.Space.gutter)
        }
        .confirmationDialog(L10n.string("settings.signOut.confirm"), isPresented: $confirmSignOut, titleVisibility: .visible) {
            Button(L10n.string("settings.signOut"), role: .destructive) { signOut() }
            Button(L10n.string("common.cancel"), role: .cancel) {}
        } message: {
            Text(L10n.string("settings.signOut.message"))
        }
    }

    private var appearanceRow: some View {
        Menu {
            ForEach([("auto", "settings.appearance.auto"), ("light", "settings.appearance.light"), ("dark", "settings.appearance.dark")], id: \.0) { value, key in
                Button { appearance = value; HapticsService.shared.play(.selection) } label: {
                    if appearance == value { Label(L10n.string(key), systemImage: "checkmark") } else { Text(L10n.string(key)) }
                }
            }
        } label: {
            DSRow(title: L10n.string("settings.appearance"), subtitle: L10n.string("settings.appearance." + appearance), leading: { EmptyView() })
                .foregroundStyle(DSColor.textPrimary)
        }
        .menuStyle(.button)
        .buttonStyle(.dsRowPressable)
    }

    private var languageName: String {
        let code = Locale.current.language.languageCode?.identifier ?? "en"
        return Locale.current.localizedString(forLanguageCode: code)?.capitalized ?? code
    }

    /// Everything the household knows, as JSON: the export and "download my data" are the same file.
    private var exportJSON: String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        return (try? encoder.encode(app.snapshot)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
    }

    /// Mock sign-out: back to the auth page. Household data stays put.
    private func signOut() {
        router.popToRoot()
        withDSAnimation(DSMotion.gentle) {
            app.isOnboarded = false
            app.phase = .onboarding
        }
    }
}
