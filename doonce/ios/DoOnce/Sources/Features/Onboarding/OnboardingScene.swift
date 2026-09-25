import SwiftUI

/// One onboarding scene: a full-bleed photograph, a live demo layered on it, and the headline low
/// on the page. The photo is the UI; the demo shows the product doing its thing.
@MainActor
struct OnboardingScene: View {
    enum Demo { case plain, teach, look, `do` }

    struct Model {
        var photo: String
        var headlineKey: String
        var subKey: String
        var demo: Demo
    }

    var model: Model
    var isActive: Bool
    var parallax: CGFloat

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottomLeading) {
                Image(model.photo)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                    .offset(x: -parallax * 1.1)
                    .dsAnimation(DSMotion.emphasized(), value: parallax)
                    .accessibilityHidden(true)
                // Photographic scrim: always near-black regardless of appearance, like DSPhotoCard.
                LinearGradient(stops: [
                    .init(color: .black.opacity(0.92), location: 0),
                    .init(color: .black.opacity(0.55), location: 0.35),
                    .init(color: .black.opacity(0.05), location: 0.7),
                ], startPoint: .bottom, endPoint: .top)

                demo(in: geo.size)

                VStack(alignment: .leading, spacing: DS.Space.s3) {
                    Text(L10n.string(model.headlineKey)).dsText(.display)
                        .accessibilityAddTraits(.isHeader)
                    Text(L10n.string(model.subKey)).font(.ds(.body)).opacity(0.78)
                        .frame(maxWidth: 300, alignment: .leading)
                }
                .foregroundStyle(DSColor.textOnMedia)
                .padding(.horizontal, 28)
                .padding(.bottom, 150)
                .offset(x: parallax * 0.9)
                .dsAnimation(DSMotion.emphasized(), value: parallax)
            }
        }
        .ignoresSafeArea()
    }

    @ViewBuilder
    private func demo(in size: CGSize) -> some View {
        switch model.demo {
        case .plain: EmptyView()
        case .teach: OnboardingTeachDemo(isActive: isActive, size: size)
        case .look: OnboardingRecognitionDemo(isActive: isActive, size: size)
        case .do: OnboardingDoDemo(isActive: isActive)
        }
    }
}
