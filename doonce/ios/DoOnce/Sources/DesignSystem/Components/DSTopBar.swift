import SwiftUI

/// Floating top bar: a glass back/close control and an optional trailing control. Overlays content
/// (photos run edge to edge underneath). Pair with `.dsTopBarInset()` on scroll content.
struct DSTopBar<Trailing: View>: View {
    enum Leading { case back, close, none }
    var leading: Leading = .back
    var title: String = ""
    var onMedia = false
    var onLeading: () -> Void
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack {
            switch leading {
            case .back:
                Button(action: onLeading) { Image(systemName: "chevron.left").font(.system(size: 18, weight: .semibold)) }
                    .buttonStyle(onMedia ? .dsOnMediaIcon : .dsGlassIcon)
                    .accessibilityLabel(L10n.string("common.back"))
            case .close:
                Button(action: onLeading) { Image(systemName: "xmark").font(.system(size: 17, weight: .semibold)) }
                    .buttonStyle(onMedia ? .dsOnMediaIcon : .dsGlassIcon)
                    .accessibilityLabel(L10n.string("common.close"))
            case .none:
                Color.clear.frame(width: DS.Size.touchMin, height: DS.Size.touchMin)
            }
            Spacer()
            if !title.isEmpty {
                Text(title).dsText(.headline).foregroundStyle(onMedia ? DSColor.textOnMedia : DSColor.textPrimary)
                Spacer()
            }
            trailing()
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.top, DS.Space.s2)
    }
}

extension DSTopBar where Trailing == EmptyView {
    init(leading: Leading = .back, title: String = "", onMedia: Bool = false, onLeading: @escaping () -> Void) {
        self.init(leading: leading, title: title, onMedia: onMedia, onLeading: onLeading, trailing: { EmptyView() })
    }
}

extension View {
    /// Top inset for scroll content that sits under a `DSTopBar` (safe area + bar height).
    func dsTopBarInset() -> some View { padding(.top, DS.Size.touchMin + DS.Space.s4) }
}
