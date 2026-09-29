import SwiftUI

/// Scene 2, "DoOnce remembers.": the recording becomes a memory in three layers, landing one after
/// another on glass — the step (what to do), what the person said (their exact words), and the way
/// back to the original moment. The whole idea of a memory, in one card.
@MainActor
struct OnboardingTeachDemo: View {
    var isActive: Bool
    var size: CGSize

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = 0
    @State private var ran = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            layer(1) {
                VStack(alignment: .leading, spacing: 4) {
                    eyebrow(L10n.fill("do.of", ["i": "1", "n": "4"]))
                    Text(L10n.string("onboarding.demo.do.instruction")).font(.ds(.title3)).fontWeight(.bold)
                }
            }
            layer(2) {
                VStack(alignment: .leading, spacing: 4) {
                    eyebrow(L10n.fill("said.person", ["person": L10n.string("onboarding.demo.do.person")]))
                    MarkedText.text("\u{201C}" + L10n.string("onboarding.demo.transcript") + "\u{201D}")
                        .font(.ds(.callout)).fontWeight(.medium)
                }
            }
            layer(3) {
                Label(L10n.fill("seeOriginal.at", ["time": "0:24–0:31"]), systemImage: "play.fill")
                    .font(.system(size: 14, weight: .semibold)).monospacedDigit()
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(DSColor.textOnMedia.opacity(0.16), in: Capsule())
            }
        }
        .foregroundStyle(DSColor.textOnMedia)
        .padding(18)
        .frame(width: min(size.width - 56, 360), alignment: .leading)
        .background { DSGlass(style: .onMedia).clipShape(RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous)) }
        .opacity(shown > 0 ? 1 : 0)
        .frame(maxWidth: .infinity)
        .offset(y: size.height * 0.2)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task(id: isActive) { await run() }
    }

    private func eyebrow(_ text: String) -> some View {
        Text(text.uppercased()).font(.system(size: 11, weight: .semibold)).tracking(0.66).opacity(0.75)
    }

    private func layer<Content: View>(_ index: Int, @ViewBuilder content: () -> Content) -> some View {
        content()
            .opacity(index <= shown ? 1 : 0)
            .offset(y: index <= shown || reduceMotion ? 0 : 8)
    }

    private func run() async {
        guard isActive, !ran else { return }
        ran = true
        for index in 1...3 {
            withAnimation(reduceMotion ? DSMotion.crossfade : DSMotion.standard(0.26)) { shown = index }
            if !reduceMotion { try? await Task.sleep(for: .milliseconds(380)) }
        }
    }
}

/// Four thin corner brackets: "DoOnce is watching this area".
@MainActor
struct CornerFrame: View {
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width, h = geo.size.height, l: CGFloat = 22, r: CGFloat = 10
            Path { p in
                p.move(to: CGPoint(x: 0, y: l)); p.addLine(to: CGPoint(x: 0, y: r)); p.addQuadCurve(to: CGPoint(x: r, y: 0), control: .zero); p.addLine(to: CGPoint(x: l, y: 0))
                p.move(to: CGPoint(x: w - l, y: 0)); p.addLine(to: CGPoint(x: w - r, y: 0)); p.addQuadCurve(to: CGPoint(x: w, y: r), control: CGPoint(x: w, y: 0)); p.addLine(to: CGPoint(x: w, y: l))
                p.move(to: CGPoint(x: w, y: h - l)); p.addLine(to: CGPoint(x: w, y: h - r)); p.addQuadCurve(to: CGPoint(x: w - r, y: h), control: CGPoint(x: w, y: h)); p.addLine(to: CGPoint(x: w - l, y: h))
                p.move(to: CGPoint(x: l, y: h)); p.addLine(to: CGPoint(x: r, y: h)); p.addQuadCurve(to: CGPoint(x: 0, y: h - r), control: CGPoint(x: 0, y: h)); p.addLine(to: CGPoint(x: 0, y: h - l))
            }
            .stroke(DSColor.textOnMedia.opacity(0.85), style: StrokeStyle(lineWidth: 2, lineCap: .round))
        }
    }
}

/// Scene 4: Do mode, one step at a time, with provenance under the instruction.
@MainActor
struct OnboardingDoDemo: View {
    var isActive: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(L10n.fill("do.of", ["i": "2", "n": "5"])).dsText(.subheadline).fontWeight(.bold).monospacedDigit().opacity(0.8)
            Text(L10n.string("onboarding.demo.do.instruction")).dsText(.title1).fontWeight(.heavy).padding(.top, DS.Space.s2)
            Text(L10n.fill("do.taughtBy", ["person": L10n.string("onboarding.demo.do.person"), "date": L10n.string("onboarding.demo.do.date")]))
                .dsText(.footnote).opacity(0.7).padding(.top, 10)
        }
        .foregroundStyle(DSColor.textOnMedia)
        .padding(.horizontal, 28)
        .padding(.top, 120)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .opacity(shown ? 1 : 0)
        .offset(y: shown || reduceMotion ? 0 : 10)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .onChange(of: isActive, initial: true) { _, active in
            guard active, !shown else { return }
            withAnimation(reduceMotion ? DSMotion.crossfade : DSMotion.standard(DSMotion.navigation)) { shown = true }
        }
    }
}
