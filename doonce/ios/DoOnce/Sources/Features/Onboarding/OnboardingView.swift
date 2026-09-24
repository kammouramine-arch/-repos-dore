import SwiftUI

/// The product demo before any account: four photographic scenes (learn once, show it once, find
/// it by looking, do it without remembering) and then the auth page. Paged, with custom dots and
/// a Continue control on media. Parallax stays under 12 pt and disappears under Reduce Motion.
@MainActor
struct OnboardingView: View {
    var onFinished: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var page = 0
    @State private var advancedByButton = false

    private let scenes: [OnboardingScene.Model] = [
        .init(photo: "espresso-kitchen-person", headlineKey: "onboarding.1.headline", subKey: "onboarding.1.sub", demo: .plain),
        .init(photo: "pipes-gauges", headlineKey: "onboarding.2.headline", subKey: "onboarding.2.sub", demo: .teach),
        .init(photo: "pipes-gauges", headlineKey: "onboarding.3.headline", subKey: "onboarding.3.sub", demo: .look),
        .init(photo: "pipes-gauges", headlineKey: "onboarding.4.headline", subKey: "onboarding.4.sub", demo: .do),
    ]

    private var isLast: Bool { page == scenes.count }

    var body: some View {
        ZStack(alignment: .bottom) {
            DSColor.backgroundPrimary.ignoresSafeArea()
            TabView(selection: $page) {
                ForEach(Array(scenes.enumerated()), id: \.offset) { index, model in
                    OnboardingScene(model: model, isActive: page == index, parallax: parallax(for: index))
                        .tag(index)
                }
                AuthContent(onFinished: onFinished)
                    .padding(.bottom, DS.Space.s12)
                    .tag(scenes.count)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .ignoresSafeArea()
            .onChange(of: page) { _, _ in
                if advancedByButton { advancedByButton = false } else { HapticsService.shared.play(.selection) }
            }

            footer
        }
        .dsAnimation(DSMotion.gentle, value: page)
    }

    private var footer: some View {
        HStack {
            OnboardingDots(count: scenes.count + 1, current: page, onMedia: !isLast)
            Spacer()
            Button(L10n.string("onboarding.continue")) {
                advancedByButton = true
                withDSAnimation(DSMotion.gentle) { page = min(page + 1, scenes.count) }
            }
            .buttonStyle(.dsOnMediaSmall)
            .opacity(isLast ? 0 : 1)
            .disabled(isLast)
            .accessibilityHidden(isLast)
        }
        .padding(.horizontal, 28)
        .padding(.bottom, DS.Space.s5)
    }

    /// Photographs move at 1.1× the page, headlines at 0.9×: ±12 pt at most, none under Reduce Motion.
    private func parallax(for index: Int) -> CGFloat {
        reduceMotion ? 0 : CGFloat(index - page) * 12
    }
}

/// 6 × 6 dots, the active one 20 pt wide. Signal-free: the dots only say where you are.
@MainActor
struct OnboardingDots: View {
    var count: Int
    var current: Int
    var onMedia: Bool

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<count, id: \.self) { index in
                Capsule()
                    .fill(index == current ? activeColor : activeColor.opacity(0.35))
                    .frame(width: index == current ? 20 : 6, height: 6)
                    .dsAnimation(DSMotion.gentle, value: current)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.fill("do.of", ["i": String(current + 1), "n": String(count)]))
    }

    private var activeColor: Color { onMedia ? DSColor.textOnMedia : DSColor.textPrimary }
}
