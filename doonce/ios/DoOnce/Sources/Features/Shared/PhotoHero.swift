import SwiftUI
import DoOnceCore

/// A page that opens on a photograph: the media runs edge to edge under the status bar and fades
/// into the page background, with the title and one line of context at its foot.
@MainActor
struct PhotoHero: View {
    var media: MediaRef?
    var title: String
    var subtitle: String?
    var height: CGFloat = 300

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            MediaView(ref: media)
                .frame(height: height)
                .frame(maxWidth: .infinity)
                .accessibilityHidden(true)
            LinearGradient(stops: [
                .init(color: DSColor.backgroundPrimary, location: 0),
                .init(color: DSColor.backgroundPrimary.opacity(0), location: 0.45),
            ], startPoint: .bottom, endPoint: .top)
            VStack(alignment: .leading, spacing: 6) {
                Text(title).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle).dsText(.callout).foregroundStyle(DSColor.textSecondary)
                }
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.bottom, 18)
        }
        .frame(height: height)
        .clipped()
    }
}
