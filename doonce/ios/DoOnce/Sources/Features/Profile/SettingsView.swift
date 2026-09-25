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
    @State private var confirmDelete = false
    @State private var deleteMessage: String?
    @State private var working = false

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
                    NavRow(title: L10n.string("settings.services"), subtitle: servicesSummary) { router.push(.services) }
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
                    DSSeparator()
                    ActionRow(title: L10n.string("settings.deleteAccount"), tone: DSColor.danger) { confirmDelete = true }
                }
                .disabled(working)
            }
            .padding(.horizontal, DS.Space.gutter)
        }
        .confirmationDialog(L10n.string("settings.signOut.confirm"), isPresented: $confirmSignOut, titleVisibility: .visible) {
            Button(L10n.string("settings.signOut"), role: .destructive) { signOut() }
            Button(L10n.string("common.cancel"), role: .cancel) {}
        } message: {
            Text(L10n.string("settings.signOut.message"))
        }
        .confirmationDialog(L10n.string("settings.deleteAccount.confirm"), isPresented: $confirmDelete, titleVisibility: .visible) {
            Button(L10n.string("settings.deleteAccount"), role: .destructive) { deleteAccount() }
            Button(L10n.string("common.cancel"), role: .cancel) {}
        } message: {
            Text(L10n.string("settings.deleteAccount.message"))
        }
        .alert(L10n.string("settings.deleteAccount"), isPresented: Binding(get: { deleteMessage != nil }, set: { if !$0 { deleteMessage = nil } })) {
            Button(L10n.string("common.close"), role: .cancel) {}
        } message: {
            Text(deleteMessage ?? "")
        }
    }

    /// How many services are live on this build, so the row is honest before it is opened.
    private var servicesSummary: String {
        let live = app.serviceStatus.filter { $0.mode == .live }.count
        return L10n.string("settings.services.sub", ["live": String(live), "total": String(app.serviceStatus.count)])
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

    /// Signs out through the auth service (Keychain session cleared in live mode) and lands on
    /// the auth page. Household data stays put.
    private func signOut() {
        working = true
        Task {
            await app.signOut()
            working = false
            router.popToRoot()
            withDSAnimation(DSMotion.gentle) { app.phase = .auth }
        }
    }

    /// Deletes the account on the gateway, then signs out. Without a gateway the auth service
    /// refuses and the alert says the backend is needed; nothing local is touched.
    private func deleteAccount() {
        working = true
        Task {
            defer { working = false }
            do {
                try await app.deleteAccount()
                HapticsService.shared.play(.success)
                router.popToRoot()
                withDSAnimation(DSMotion.gentle) { app.phase = .auth }
            } catch {
                HapticsService.shared.play(.error)
                if case GatewayError.notConfigured = error {
                    deleteMessage = L10n.string("settings.deleteAccount.unavailable")
                } else if case AuthError.unsupported = error {
                    deleteMessage = L10n.string("settings.deleteAccount.unavailable")
                } else {
                    deleteMessage = L10n.string("settings.deleteAccount.failed")
                }
            }
        }
    }
}
