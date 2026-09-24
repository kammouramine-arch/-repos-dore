import SwiftUI

/// A tick on the timeline: a detected step, an important statement, or a user marker.
struct RibbonTick: Identifiable, Equatable {
    enum Kind { case step, important, marked }
    let id: UUID
    let at: TimeInterval
    let kind: Kind

    init(id: UUID = UUID(), at: TimeInterval, kind: Kind) {
        self.id = id
        self.at = at
        self.kind = kind
    }
}

/// The thin line that time draws while recording and processing. Its fill is always tied to a
/// real quantity (elapsed time, transcript progress); ticks drop in where something happened.
/// Colours are parameters because it sits on camera in Teach and on paper in Processing.
@MainActor
struct TimelineRibbon: View {
    var progress: Double
    var ticks: [RibbonTick]
    /// The time the full width represents.
    var duration: TimeInterval
    var lineColor: Color = DSColor.textOnMedia.opacity(0.28)
    var fillColor: Color = DSColor.textOnMedia
    var markedColor: Color = DSColor.textOnMedia

    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            ZStack(alignment: .leading) {
                Capsule().fill(lineColor).frame(height: 2)
                Capsule().fill(fillColor).frame(width: max(0, min(1, progress)) * width, height: 2)
                    .animation(.linear(duration: 0.4), value: progress)
                ForEach(ticks) { tick in
                    TickMark(kind: tick.kind, markedColor: markedColor)
                        .position(x: x(for: tick.at, width: width), y: 1)
                        .transition(.scale(scale: 0.01, anchor: .bottom).combined(with: .opacity))
                }
            }
            .frame(height: 2)
        }
        .frame(height: 2)
        .dsAnimation(DSMotion.snappy, value: ticks)
        .accessibilityHidden(true)
    }

    private func x(for time: TimeInterval, width: CGFloat) -> CGFloat {
        guard duration > 0 else { return 0 }
        return max(0, min(1, time / duration)) * width
    }
}

@MainActor
private struct TickMark: View {
    let kind: RibbonTick.Kind
    let markedColor: Color
    var body: some View {
        Capsule()
            .fill(color)
            .frame(width: 2, height: kind == .marked ? 14 : 10)
    }
    private var color: Color {
        switch kind {
        case .step: DSColor.signal
        case .important: DSColor.warning
        case .marked: markedColor
        }
    }
}
