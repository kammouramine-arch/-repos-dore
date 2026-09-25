import SwiftUI
import DoOnceCore

/// An object as a photograph you can tap: the "Recently around you" card. Opens the passport with a
/// zoom on iOS 18, a plain push before that.
@MainActor
struct ObjectCardView: View {
    var object: PhysicalObject
    var width: CGFloat? = 236
    var height: CGFloat = 316

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        Button {
            router.push(.object(object.id))
        } label: {
            DSPhotoCard(title: object.name, subtitle: subtitle, titleSize: 20) {
                MediaView(ref: app.heroMedia(for: object))
            }
            .frame(width: width, height: height)
        }
        .buttonStyle(.dsPressable)
        .zoomSource(id: object.id)
        .accessibilityIdentifier("object.card")
        .accessibilityLabel(object.name)
        .accessibilityValue(subtitle)
    }

    private var subtitle: String {
        var parts = [L10n.plural("object.procedures", n: app.memories(for: object).count)]
        if let last = object.lastUsedAt { parts.append(L10n.string("object.lastUsed", ["when": DSFormat.shortDay(last)])) }
        return parts.joined(separator: " · ")
    }
}
