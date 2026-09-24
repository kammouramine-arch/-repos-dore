import SwiftUI

/// The DoOnce mark as a `Shape`: one gesture enters, travels once around, and nearly closes.
/// Geometry matches design/brand/logo.svg (100 × 100 viewBox).
struct DSLoopShape: Shape {
    /// 0…1 draws the stroke progressively (launch animation, completion, pull-to-refresh).
    var progress: CGFloat = 1
    var animatableData: CGFloat { get { progress } set { progress = newValue } }

    func path(in rect: CGRect) -> Path {
        let s = min(rect.width, rect.height) / 100
        let ox = rect.midX - 50 * s, oy = rect.midY - 50 * s
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x * s, y: oy + y * s) }
        var path = Path()
        path.move(to: p(21, 51.5))
        path.addCurve(to: p(37.6, 64.4), control1: p(27, 53.5), control2: p(32.5, 58.5))
        // Ring: centre (56,46) r 26, from 135° sweeping 290° counter-clockwise (screen coords) to 205°.
        path.addArc(center: p(56, 46), radius: 26 * s, startAngle: .degrees(135), endAngle: .degrees(135 - 290), clockwise: true)
        return progress >= 1 ? path : path.trimmedPath(from: 0, to: progress)
    }
}

/// The echo: a short trail just past the stroke end, drawn at low opacity after the loop closes.
struct DSLoopEchoShape: Shape {
    func path(in rect: CGRect) -> Path {
        let s = min(rect.width, rect.height) / 100
        let ox = rect.midX - 50 * s, oy = rect.midY - 50 * s
        var path = Path()
        path.addArc(center: CGPoint(x: ox + 56 * s, y: oy + 46 * s), radius: 26 * s, startAngle: .degrees(-155), endAngle: .degrees(-167), clockwise: true)
        return path
    }
}

/// The mark, ready to place. `size` is the bounding box; stroke scales with it.
struct DSLoopMark: View {
    var size: CGFloat = 28
    var progress: CGFloat = 1
    var showEcho = false
    var color: Color = DSColor.textPrimary

    var body: some View {
        ZStack {
            if showEcho {
                DSLoopEchoShape()
                    .stroke(color.opacity(0.32), style: StrokeStyle(lineWidth: size * 0.12, lineCap: .round))
            }
            DSLoopShape(progress: progress)
                .stroke(color, style: StrokeStyle(lineWidth: size * 0.12, lineCap: .round, lineJoin: .round))
        }
        .frame(width: size, height: size)
        .accessibilityLabel("DoOnce")
    }
}

#Preview("Loop mark") {
    VStack(spacing: 24) {
        DSLoopMark(size: 120, showEcho: true)
        DSLoopMark(size: 60, color: DSColor.signal)
        DSLoopMark(size: 24)
    }
    .padding()
}
