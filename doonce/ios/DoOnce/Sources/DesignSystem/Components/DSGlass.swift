import SwiftUI

/// Functional glass for layers above content: navigation, floating controls, camera controls.
/// Never for content cards. Uses Liquid Glass on iOS 26 and system materials before.
struct DSGlass: View {
    enum Style { case navigation, control, onMedia }
    var style: Style

    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        if reduceTransparency {
            solid
        } else {
            switch style {
            case .navigation: Rectangle().fill(.regularMaterial).overlay(DSColor.glassNavigation.opacity(0.5))
            case .control: Rectangle().fill(.thinMaterial).overlay(DSColor.glassControl.opacity(0.4))
            case .onMedia: Rectangle().fill(.ultraThinMaterial.opacity(0.7)).overlay(DSColor.glassOnMedia).environment(\.colorScheme, .dark)
            }
        }
    }

    private var solid: some View {
        switch style {
        case .navigation: DSColor.backgroundElevated
        case .control: DSColor.backgroundElevated
        case .onMedia: DSColor.scrimMedia
        }
    }
}

extension View {
    /// Liquid Glass where available (iOS 26), otherwise the material fallback above.
    @ViewBuilder
    func dsGlassCapsule(_ style: DSGlass.Style = .navigation) -> some View {
        if #available(iOS 26.0, *) {
            self.glassEffect(.regular, in: Capsule())
        } else {
            self.background(DSGlass(style: style)).clipShape(Capsule())
                .overlay(Capsule().strokeBorder(DSColor.separator, lineWidth: 0.5))
                .shadow(color: DSColor.shadow, radius: 20, y: 8)
        }
    }
}
