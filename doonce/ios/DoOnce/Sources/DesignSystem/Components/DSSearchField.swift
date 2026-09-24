import SwiftUI

/// "Find anything": text, voice and camera entry in one control.
struct DSSearchField: View {
    var placeholder: String
    var onTap: () -> Void
    var onVoice: () -> Void
    var onCamera: () -> Void

    var body: some View {
        HStack(spacing: 2) {
            Button(action: onTap) {
                HStack {
                    Text(placeholder).font(.system(size: 17)).foregroundStyle(DSColor.textTertiary)
                    Spacer()
                }
                .padding(.leading, 18)
                .frame(minHeight: DS.Size.touchComfort)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            Button(action: onVoice) { Image(systemName: "mic").font(.system(size: 18, weight: .medium)) }
                .buttonStyle(.ds(.ghost, size: .icon)).foregroundStyle(DSColor.textSecondary)
                .accessibilityLabel("Search by voice")
            Button(action: onCamera) { Image(systemName: "camera").font(.system(size: 18, weight: .medium)) }
                .buttonStyle(.ds(.ghost, size: .icon)).foregroundStyle(DSColor.textSecondary)
                .accessibilityLabel("Search with the camera")
                .padding(.trailing, 4)
        }
        .background(DSColor.fillSubtle, in: Capsule())
    }
}
