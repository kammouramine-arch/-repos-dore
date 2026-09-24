import SwiftUI

/// Scene 3: the recognition moment, months later. Anchor points settle, a soft contour resolves
/// around the object, a signal pulse locks it, the label rises and the memories list expands.
/// Self-contained so onboarding never depends on the camera feature.
@MainActor
struct OnboardingRecognitionDemo: View {
    var isActive: Bool
    var size: CGSize

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var phase: Phase = .idle
    @State private var contour: CGFloat = 0
    @State private var pulse = false
    @State private var ran = false

    private enum Phase: Int, Comparable {
        case idle, anchors, contour, locked, label, list
        static func < (lhs: Phase, rhs: Phase) -> Bool { lhs.rawValue < rhs.rawValue }
    }

    /// Object hull in % of the frame, scaled to 0.8 and lifted 8 % like the prototype.
    private static let rawHull: [(CGFloat, CGFloat)] = [(27, 8), (62, 6), (70, 20), (68, 48), (60, 60), (40, 62), (26, 50), (22, 24)]
    private let hull: [CGPoint] = OnboardingRecognitionDemo.rawHull.map { CGPoint(x: 50 + ($0.0 - 50) * 0.8, y: 50 + ($0.1 - 50) * 0.8 - 8) }
    private let labelAt = CGPoint(x: 50 + (46 - 50) * 0.8, y: 50 + (40 - 50) * 0.8 - 8)

    var body: some View {
        ZStack(alignment: .topLeading) {
            DSStatusPill(text: L10n.string("look.looking"))
                .position(x: size.width / 2, y: size.height * 0.09)
                .opacity(phase >= .anchors && phase < .label ? 1 : 0)

            ForEach(Array(anchorPoints.enumerated()), id: \.offset) { _, point in
                Circle().fill(DSColor.textOnMedia)
                    .frame(width: 4, height: 4)
                    .position(point)
                    .opacity(phase == .anchors ? 0.55 : 0)
            }

            HullShape(points: hull.map { CGPoint(x: $0.x / 100 * size.width, y: $0.y / 100 * size.height) })
                .trim(from: 0, to: contour)
                .stroke(DSColor.signal, style: StrokeStyle(lineWidth: pulse ? 3 : 1.6, lineJoin: .round))
                .shadow(color: DSColor.signal.opacity(0.55), radius: 10)
                .opacity(pulse ? 0.6 : (phase >= .contour ? 1 : 0))
                .scaleEffect(pulse ? 1.015 : 1)

            labelPill
                .position(x: labelAt.x / 100 * size.width, y: labelAt.y / 100 * size.height)
                .opacity(phase >= .label ? 1 : 0)
                .offset(y: phase >= .label || reduceMotion ? 0 : 8)

            memoriesList
                .padding(.horizontal, DS.Space.s6)
                .offset(y: size.height * 0.47)
                .opacity(phase >= .list ? 1 : 0)
                .scaleEffect(phase >= .list || reduceMotion ? 1 : 0.96, anchor: .top)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task(id: isActive) { await run() }
    }

    private var anchorPoints: [CGPoint] {
        var points = hull.map { CGPoint(x: $0.x / 100 * size.width, y: $0.y / 100 * size.height) }
        points += hull.prefix(3).map { CGPoint(x: ($0.x + 50) / 2 / 100 * size.width, y: ($0.y + 50) / 2 / 100 * size.height) }
        return points
    }

    private var labelPill: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(L10n.string("onboarding.demo.label")).dsText(.headline).foregroundStyle(DSColor.textOnMedia)
            Text(L10n.plural("object.procedures", n: 3)).dsText(.footnote).fontWeight(.semibold).foregroundStyle(DSColor.signal)
        }
        .padding(.vertical, DS.Space.s2).padding(.leading, 12).padding(.trailing, 14)
        .background(DSGlass(style: .onMedia))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var memoriesList: some View {
        VStack(spacing: 0) {
            ForEach(Array(L10n.list("onboarding.demo.memories").enumerated()), id: \.offset) { index, title in
                if index > 0 { Rectangle().fill(DSColor.textOnMedia.opacity(0.12)).frame(height: 1) }
                HStack {
                    Text(title).dsText(.body).foregroundStyle(DSColor.textOnMedia)
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(DSColor.textOnMedia.opacity(0.7))
                }
                .padding(.horizontal, DS.Space.s4)
                .frame(minHeight: DS.Size.touchMin)
            }
        }
        .padding(.vertical, 6)
        .background(DSGlass(style: .onMedia))
        .clipShape(RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
    }

    // MARK: Sequence (motion-spec §5 at 0.8×)

    private func run() async {
        guard isActive, !ran else { return }
        ran = true
        if reduceMotion {
            phase = .anchors
            try? await Task.sleep(for: .milliseconds(420))
            HapticsService.shared.playRecognitionLock()
            withAnimation(DSMotion.crossfade) { contour = 1; phase = .label }
            try? await Task.sleep(for: .milliseconds(200))
            withAnimation(DSMotion.crossfade) { phase = .list }
            return
        }
        withAnimation(.easeOut(duration: 0.2)) { phase = .anchors }
        try? await Task.sleep(for: .milliseconds(220))
        withAnimation(DSMotion.standard(0.24)) { phase = .contour; contour = 1 }
        try? await Task.sleep(for: .milliseconds(220))
        HapticsService.shared.playRecognitionLock()
        withAnimation(DSMotion.lively) { pulse = true; phase = .locked }
        withAnimation(DSMotion.lively.delay(0.09)) { pulse = false }
        try? await Task.sleep(for: .milliseconds(60))
        withAnimation(DSMotion.standard(0.22)) { phase = .label }
        try? await Task.sleep(for: .milliseconds(200))
        withAnimation(DSMotion.gentle) { phase = .list }
    }
}

/// Closed Catmull-Rom spline through the hull points, so the contour reads as a soft hull, not a box.
struct HullShape: Shape {
    var points: [CGPoint]

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard points.count > 2 else { return path }
        let n = points.count
        path.move(to: points[0])
        for i in 0..<n {
            let p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n]
            let c1 = CGPoint(x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6)
            let c2 = CGPoint(x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6)
            path.addCurve(to: p2, control1: c1, control2: c2)
        }
        path.closeSubpath()
        return path
    }
}
