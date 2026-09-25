import SwiftUI

/// The soft hull drawn around a recognised object. A closed Catmull-Rom spline through the hull
/// points, emitted as cubic Béziers, so the contour reads as a shape that resolved rather than
/// a box that was drawn (motion spec §5).
enum ContourPath {
    /// One cubic segment per point; the path is closed. Fewer than three points give an empty path.
    static func smoothed(_ points: [CGPoint]) -> Path {
        var path = Path()
        let n = points.count
        guard n >= 3 else { return path }
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

    /// Eight hull points around a salient box: corners pulled in, edge midpoints pushed out, so the
    /// spline bulges like an object outline instead of a rounded rectangle.
    static func hull(around rect: CGRect) -> [CGPoint] {
        let inset = CGSize(width: rect.width * 0.14, height: rect.height * 0.14)
        let bulge = CGSize(width: rect.width * 0.04, height: rect.height * 0.04)
        return [
            CGPoint(x: rect.minX + inset.width, y: rect.minY + inset.height * 0.6),
            CGPoint(x: rect.midX, y: rect.minY - bulge.height),
            CGPoint(x: rect.maxX - inset.width, y: rect.minY + inset.height * 0.6),
            CGPoint(x: rect.maxX + bulge.width, y: rect.midY),
            CGPoint(x: rect.maxX - inset.width, y: rect.maxY - inset.height * 0.6),
            CGPoint(x: rect.midX, y: rect.maxY + bulge.height),
            CGPoint(x: rect.minX + inset.width, y: rect.maxY - inset.height * 0.6),
            CGPoint(x: rect.minX - bulge.width, y: rect.midY),
        ]
    }
}

/// Maps normalised frame rectangles (top-left origin) onto an aspect-fill preview.
enum PreviewGeometry {
    static func rect(for normalized: CGRect, frameSize: CGSize, in viewSize: CGSize) -> CGRect {
        guard frameSize.width > 0, frameSize.height > 0 else { return .zero }
        let scale = max(viewSize.width / frameSize.width, viewSize.height / frameSize.height)
        let shown = CGSize(width: frameSize.width * scale, height: frameSize.height * scale)
        let offset = CGPoint(x: (viewSize.width - shown.width) / 2, y: (viewSize.height - shown.height) / 2)
        return CGRect(
            x: offset.x + normalized.minX * shown.width,
            y: offset.y + normalized.minY * shown.height,
            width: normalized.width * shown.width,
            height: normalized.height * shown.height
        )
    }
}

/// A `Shape` so the contour can be trimmed for the draw-on.
struct ContourShape: Shape {
    var points: [CGPoint]
    func path(in rect: CGRect) -> Path { ContourPath.smoothed(points) }
}

/// The recognition sequence (motion spec §5): anchors settle → contour resolves → pulse + lock
/// haptic → label rises. `onLocked` fires at 640 ms so the caller can expand the sheet.
@MainActor
struct RecognitionOverlay: View {
    let region: CGRect
    /// The overlay's own size, so the pulse scales about the object rather than the origin.
    let canvasSize: CGSize
    let title: String
    let subtitle: String
    var uncertain = false
    var dots: [RecognitionDot] = []
    var onLocked: () -> Void
    var onDotTap: (UUID) -> Void = { _ in }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var anchorsVisible = false
    @State private var anchorsSettled = false
    @State private var anchorsGone = false
    @State private var drawn: CGFloat = 0
    @State private var contourShown = false
    @State private var pulsing = false
    @State private var labelShown = false

    private var hull: [CGPoint] { ContourPath.hull(around: region) }
    private var contourOpacity: Double { uncertain ? 0.5 : 1 }

    var body: some View {
        ZStack {
            anchors
            contour
            label
            ForEach(dots) { dot in
                Button { onDotTap(dot.id) } label: {
                    Circle().fill(DSColor.signal).frame(width: 10, height: 10)
                        .overlay(Circle().strokeBorder(DSColor.signal.opacity(0.18), lineWidth: 4).frame(width: 18, height: 18))
                        .frame(width: DS.Size.touchMin, height: DS.Size.touchMin)
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(L10n.string("look.retarget", ["object": dot.name]))
                .position(dot.point)
                .opacity(0.8)
            }
        }
        .allowsHitTesting(!dots.isEmpty)
        .task(id: region) { await run() }
    }

    private var anchors: some View {
        ForEach(Array(hull.enumerated()), id: \.offset) { index, point in
            Circle().fill(DSColor.textOnMedia)
                .frame(width: 4, height: 4)
                .opacity(anchorsGone ? 0 : (anchorsVisible ? 0.55 : 0))
                .position(anchorsSettled ? point : jitter(point, index))
                .animation(DSMotion.standard(0.2).delay(Double(index) * 0.014), value: anchorsVisible)
                .animation(DSMotion.standard(0.2).delay(Double(index) * 0.014), value: anchorsSettled)
                .animation(DSMotion.standard(0.2), value: anchorsGone)
        }
    }

    private var contour: some View {
        ZStack {
            ContourShape(points: hull).fill(DSColor.signal.opacity(0.06))
            ContourShape(points: hull).trim(from: 0, to: drawn)
                .stroke(DSColor.signal, style: StrokeStyle(lineWidth: 3, lineJoin: .round))
                .blur(radius: 10).opacity(0.55)
            ContourShape(points: hull).trim(from: 0, to: drawn)
                .stroke(DSColor.signal, style: StrokeStyle(lineWidth: pulsing ? 3 : 1.6, lineJoin: .round))
        }
        .opacity(contourShown ? (pulsing ? 0.6 : contourOpacity) : 0)
        .scaleEffect(pulsing ? 1.015 : 1, anchor: UnitPoint(x: region.midX / max(1, canvasSize.width), y: region.midY / max(1, canvasSize.height)))
        .allowsHitTesting(false)
    }

    private var label: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(title).font(.system(size: 17, weight: .bold)).tracking(-0.34).foregroundStyle(DSColor.textOnMedia)
            Text(subtitle).font(.system(size: 13, weight: .semibold)).foregroundStyle(DSColor.signal)
        }
        .padding(.leading, 12).padding(.trailing, 14).padding(.vertical, 8)
        .background { DSGlass(style: .onMedia).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)) }
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(DSColor.textOnMedia.opacity(0.18), lineWidth: 0.5))
        .fixedSize()
        .position(x: region.midX, y: region.maxY + 28)
        .offset(y: labelShown ? 0 : 8)
        .opacity(labelShown ? 1 : 0)
        .accessibilityElement(children: .combine)
        .allowsHitTesting(false)
    }

    /// Anchors start up to 3 pt off their point and drift in (spec: "drift ≤ 3 pt to settle").
    private func jitter(_ point: CGPoint, _ index: Int) -> CGPoint {
        let dx: CGFloat = [2, -3, 1, -2, 3, -1, 2, -2][index % 8]
        let dy: CGFloat = [-2, 1, -3, 2, -1, 3, -2, 1][index % 8]
        return CGPoint(x: point.x + dx, y: point.y + dy)
    }

    private func run() async {
        anchorsVisible = false; anchorsSettled = false; anchorsGone = false; drawn = 0; contourShown = false; pulsing = false; labelShown = false
        let ms: (Int) async -> Void = { try? await Task.sleep(for: .milliseconds($0)) }
        if reduceMotion {
            await ms(420)
            withAnimation(DSMotion.crossfade) { drawn = 1; contourShown = true; labelShown = true }
            if !uncertain { HapticsService.shared.playRecognitionLock() }
            await ms(220)
            onLocked()
            return
        }
        anchorsVisible = true
        anchorsSettled = true
        await ms(220)
        contourShown = true
        withAnimation(DSMotion.standard(0.24)) { drawn = 1 }
        Task { await ms(120); anchorsGone = true }
        await ms(240)
        if !uncertain {
            HapticsService.shared.playRecognitionLock()
            withAnimation(.easeInOut(duration: 0.09)) { pulsing = true }
            await ms(90)
            withAnimation(DSMotion.lively) { pulsing = false }
            await ms(60)
        }
        withAnimation(DSMotion.standard(0.22)) { labelShown = true }
        await ms(180)
        onLocked()
    }
}

/// A second known object seen recently, shown as a small signal dot the user can retarget to.
struct RecognitionDot: Identifiable, Equatable {
    let id: UUID
    let name: String
    let point: CGPoint
}
