import SwiftUI

/// Scene 2: live intelligence around the object while someone explains. A corner frame, observation
/// chips that land one after another, and the transcript with the value that matters in signal.
@MainActor
struct OnboardingTeachDemo: View {
    var isActive: Bool
    var size: CGSize

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = 0
    @State private var ran = false

    private struct Chip { let label: String; let x: CGFloat; let y: CGFloat }
    private var chips: [Chip] {
        let labels = L10n.list("onboarding.demo.chips")
        let positions: [(CGFloat, CGFloat)] = [(0.24, 0.40), (0.56, 0.26), (0.60, 0.36)]
        return zip(labels, positions).map { Chip(label: $0, x: $1.0, y: $1.1) }
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            CornerFrame()
                .frame(width: size.width * 0.6, height: size.height * 0.42)
                .offset(x: size.width * 0.2, y: size.height * 0.18)
            ForEach(Array(chips.enumerated()), id: \.offset) { index, chip in
                ObservationChip(text: chip.label)
                    .offset(x: size.width * chip.x, y: size.height * chip.y)
                    .opacity(index < shown ? 1 : 0)
                    .offset(y: index < shown || reduceMotion ? 0 : 8)
                    .scaleEffect(index < shown || reduceMotion ? 1 : 0.96, anchor: .leading)
            }
            MarkedText.text(L10n.string("onboarding.demo.transcript"))
                .font(.ds(.callout)).fontWeight(.medium)
                .foregroundStyle(DSColor.textOnMedia)
                .shadow(color: DSColor.shadow, radius: 8, y: 1)
                .padding(.horizontal, DS.Space.gutter)
                .offset(y: size.height * 0.51)
                .opacity(shown > 0 ? 1 : 0)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task(id: isActive) { await run() }
    }

    private func run() async {
        guard isActive, !ran else { return }
        ran = true
        for index in 1...max(chips.count, 1) {
            withAnimation(reduceMotion ? DSMotion.crossfade : DSMotion.standard(0.22)) { shown = index }
            if !reduceMotion { try? await Task.sleep(for: .milliseconds(90)) }
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

/// A live observation: signal dot plus label on glass.
@MainActor
struct ObservationChip: View {
    var text: String
    var body: some View {
        HStack(spacing: DS.Space.s2) {
            Circle().fill(DSColor.signal).frame(width: 8, height: 8)
            Text(text).font(.ds(.subheadline)).fontWeight(.semibold).foregroundStyle(DSColor.textOnMedia)
        }
        .padding(.leading, 10).padding(.trailing, 12)
        .frame(height: 36)
        .background(DSGlass(style: .onMedia))
        .clipShape(Capsule())
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
