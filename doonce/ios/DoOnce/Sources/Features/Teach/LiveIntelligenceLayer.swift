import SwiftUI

/// Something DoOnce noticed while recording, shown briefly as a chip before it drops as a tick.
struct LiveObservation: Identifiable, Equatable {
    enum Kind: Equatable { case step, important, value, marked }
    let id: UUID
    let text: String
    let kind: Kind
    let at: TimeInterval
    /// Where the chip sits, as a fraction of the camera view; kept in the bottom third.
    let anchor: UnitPoint

    init(id: UUID = UUID(), text: String, kind: Kind, at: TimeInterval, anchor: UnitPoint) {
        self.id = id
        self.text = text
        self.kind = kind
        self.at = at
        self.anchor = anchor
    }

    var tickKind: RibbonTick.Kind {
        switch kind {
        case .important: .important
        case .marked: .marked
        case .step, .value: .step
        }
    }
}

/// Transient observation chips over the camera. They appear near the bottom third and, when the
/// owner removes them ~1.5 s later, drop away as if falling onto the ribbon.
@MainActor
struct LiveIntelligenceLayer: View {
    var observations: [LiveObservation]
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(observations) { observation in
                    chip(observation)
                        .position(x: geo.size.width * observation.anchor.x, y: geo.size.height * observation.anchor.y)
                        .transition(reduceMotion ? .opacity : .asymmetric(
                            insertion: .opacity.combined(with: .offset(y: 6)).combined(with: .scale(scale: 0.96)),
                            removal: .opacity.combined(with: .offset(y: 30)).combined(with: .scale(scale: 0.8))
                        ))
                }
            }
            .animation(reduceMotion ? DSMotion.crossfade : DSMotion.standard(0.22), value: observations)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func chip(_ observation: LiveObservation) -> some View {
        HStack(spacing: 8) {
            Circle().fill(observation.kind == .important ? DSColor.warning : DSColor.signal).frame(width: 8, height: 8)
            Text(observation.text).font(.system(size: 14, weight: .semibold)).foregroundStyle(DSColor.textOnMedia).lineLimit(1)
        }
        .padding(.leading, 10).padding(.trailing, 12).frame(height: 36)
        .background(DSGlass(style: .onMedia)).clipShape(Capsule())
        .fixedSize()
    }
}
