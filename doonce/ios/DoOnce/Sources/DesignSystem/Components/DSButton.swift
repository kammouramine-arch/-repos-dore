import SwiftUI

/// Button styles. Every style compresses on press (scale 0.985) and commits with a light haptic.
///
///     Button("Remember") { … }.buttonStyle(.dsSignal)
///     Button { … } label: { Label("Start", systemImage: "play.fill") }.buttonStyle(.dsPrimary)
enum DSButtonKind {
    /// Ink on light, bone on dark. The one primary action per screen.
    case primary
    /// Signal fill. Reserved for "DoOnce knows this" actions: Remember, Show DoOnce, Start (from recognition).
    case signal
    /// Quiet fill for secondary actions.
    case secondary
    /// Text only.
    case ghost
    /// Material over content (navigation, floating controls).
    case glass
    /// Dark material over photos and camera.
    case onMedia
}

struct DSButtonStyle: ButtonStyle {
    var kind: DSButtonKind
    var size: Size = .regular
    var fullWidth = false

    enum Size { case regular, small, icon }

    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: size == .small ? 15 : 17, weight: .semibold))
            .tracking(-0.17)
            .foregroundStyle(foreground)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .frame(minWidth: size == .icon ? DS.Size.touchMin : nil, minHeight: minHeight)
            .padding(.horizontal, size == .icon ? 0 : (size == .small ? DS.Space.s4 : 22))
            .background(background)
            .clipShape(Capsule())
            .opacity(isEnabled ? 1 : 0.4)
            .scaleEffect(configuration.isPressed ? Tokens.Press.scale : 1)
            .opacity(configuration.isPressed ? Tokens.Press.opacity : 1)
            .animation(DSMotion.snappy, value: configuration.isPressed)
            .contentShape(Capsule())
            .onChange(of: configuration.isPressed) { _, pressed in
                if !pressed { HapticsService.shared.play(.light) }
            }
    }

    private var minHeight: CGFloat {
        switch size { case .regular: DS.Size.touchComfort; case .small: 40; case .icon: DS.Size.touchMin }
    }

    private var foreground: Color {
        switch kind {
        case .primary: DSColor.textOnInverse
        case .signal: DSColor.textOnSignal
        case .secondary, .glass: DSColor.textPrimary
        case .ghost: DSColor.textSecondary
        case .onMedia: DSColor.textOnMedia
        }
    }

    @ViewBuilder private var background: some View {
        switch kind {
        case .primary: DSColor.backgroundInverse
        case .signal: DSColor.signal
        case .secondary: DSColor.fillMedium
        case .ghost: Color.clear
        case .glass: DSGlass(style: .control)
        case .onMedia: DSGlass(style: .onMedia)
        }
    }
}

extension ButtonStyle where Self == DSButtonStyle {
    static var dsPrimary: DSButtonStyle { DSButtonStyle(kind: .primary, fullWidth: true) }
    static var dsSignal: DSButtonStyle { DSButtonStyle(kind: .signal, fullWidth: true) }
    static var dsSecondary: DSButtonStyle { DSButtonStyle(kind: .secondary) }
    static var dsGhost: DSButtonStyle { DSButtonStyle(kind: .ghost) }
    static var dsSmall: DSButtonStyle { DSButtonStyle(kind: .secondary, size: .small) }
    static var dsGlassIcon: DSButtonStyle { DSButtonStyle(kind: .glass, size: .icon) }
    static var dsOnMediaIcon: DSButtonStyle { DSButtonStyle(kind: .onMedia, size: .icon) }
    static var dsOnMediaSmall: DSButtonStyle { DSButtonStyle(kind: .onMedia, size: .small) }
    static func ds(_ kind: DSButtonKind, size: DSButtonStyle.Size = .regular, fullWidth: Bool = false) -> DSButtonStyle {
        DSButtonStyle(kind: kind, size: size, fullWidth: fullWidth)
    }
}

/// Press feedback for cards and rows: scale 0.97, no haptic (the destination provides it).
struct DSPressableStyle: ButtonStyle {
    var scale: CGFloat = Tokens.Press.cardScale
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .opacity(configuration.isPressed ? 0.96 : 1)
            .animation(DSMotion.snappy, value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == DSPressableStyle {
    static var dsPressable: DSPressableStyle { DSPressableStyle() }
    static var dsRowPressable: DSPressableStyle { DSPressableStyle(scale: 0.99) }
}
