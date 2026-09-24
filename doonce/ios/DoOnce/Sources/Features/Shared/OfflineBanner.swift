import SwiftUI

/// Quiet notice at the top of Memory when the network is gone: saved memories still work.
@MainActor
struct OfflineBanner: View {
    var body: some View {
        HStack(spacing: DS.Space.s3) {
            Image(systemName: "wifi.slash").font(.system(size: 18, weight: .medium)).foregroundStyle(DSColor.textPrimary)
            VStack(alignment: .leading, spacing: 1) {
                Text(L10n.string("offline.title")).dsText(.headline).foregroundStyle(DSColor.textPrimary)
                Text(L10n.string("offline.sub")).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, DS.Space.s4)
        .padding(.vertical, DS.Space.s3)
        .background(DSColor.fillSubtle, in: RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}
