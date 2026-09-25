import SwiftUI
import UIKit

/// The explanation before any system permission prompt: why DoOnce needs it, in one line, with the
/// reassurance that matters. Nothing is asked at launch; this sheet appears at the moment of use.
@MainActor
struct PermissionEducationView: View {
    var kind: PermissionKind
    var then: FullScreenRoute?

    @Environment(Router.self) private var router
    @Environment(\.dismiss) private var dismiss
    @State private var denied = false
    @State private var requesting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Image(systemName: symbol)
                .font(.system(size: 26, weight: .medium))
                .foregroundStyle(DSColor.signalText)
                .frame(width: 64, height: 64)
                .background(DSColor.signalSoft, in: RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
                .accessibilityHidden(true)
            Text(L10n.string(titleKey)).dsText(.title1).foregroundStyle(DSColor.textPrimary)
                .padding(.top, DS.Space.s5)
                .accessibilityAddTraits(.isHeader)
            if let sub = subtitle {
                Text(sub).dsText(.body).foregroundStyle(DSColor.textSecondary).padding(.top, DS.Space.s2)
            }
            Spacer(minLength: DS.Space.s5)
            if denied {
                Button(L10n.string("permission.settings")) { openSettings() }.buttonStyle(.dsPrimary)
            } else {
                Button(L10n.string("permission.allow")) { allow() }.buttonStyle(.dsPrimary).disabled(requesting)
            }
            Button(L10n.string("permission.notNow")) { dismiss() }
                .buttonStyle(.ds(.ghost, fullWidth: true))
                .padding(.top, DS.Space.s1)
            Text(L10n.string("permission.note")).dsText(.caption).foregroundStyle(DSColor.textTertiary)
                .multilineTextAlignment(.center).frame(maxWidth: .infinity)
                .padding(.top, DS.Space.s3)
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.top, DS.Space.s8)
        .padding(.bottom, DS.Space.s4)
        .background(DSColor.backgroundElevated.ignoresSafeArea())
        .task { denied = await PermissionsService.status(kind) == .denied }
    }

    private func allow() {
        requesting = true
        Task {
            let status = await PermissionsService.request(kind)
            requesting = false
            switch status {
            case .granted:
                dismiss()
                if let then {
                    // Let the sheet finish dismissing before the full-screen surface takes over.
                    try? await Task.sleep(for: .milliseconds(Int(DSMotion.navigation * 1000)))
                    router.present(then)
                }
            case .denied:
                HapticsService.shared.play(.warning)
                withDSAnimation(DSMotion.crossfade) { denied = true }
            case .undetermined:
                break
            }
        }
    }

    private func openSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    private var symbol: String {
        switch kind {
        case .camera: "camera"
        case .microphone: "mic"
        case .photos: "photo.on.rectangle"
        case .notifications: "bell"
        }
    }

    private var keyPrefix: String {
        switch kind {
        case .camera: "permission.camera"
        case .microphone: "permission.mic"
        case .photos: "permission.photos"
        case .notifications: "permission.notifications"
        }
    }

    private var titleKey: String { keyPrefix + ".title" }

    /// Photos has no second line in the copy deck; a missing key returns the key itself.
    private var subtitle: String? {
        let key = keyPrefix + ".sub"
        let value = L10n.string(key)
        return value == key ? nil : value
    }
}
