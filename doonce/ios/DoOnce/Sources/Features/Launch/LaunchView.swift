import SwiftUI

/// The first frame of every cold launch: the mark forms (one gesture enters, travels once around,
/// nearly closes), the loop closes with a rigid tick, the echo settles and the background lifts as
/// the world comes alive. Full on first launch and one in five, short otherwise. A tap skips.
@MainActor
struct LaunchView: View {
    var full: Bool
    var onFinished: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var progress: CGFloat = 0
    @State private var scale: CGFloat = 1
    @State private var echo: Double = 0
    @State private var lifted = false
    @State private var markOpacity: Double = 1
    @State private var exiting = false
    @State private var finished = false

    private let markSize: CGFloat = 120

    var body: some View {
        ZStack {
            Rectangle().fill(lifted ? DSColor.backgroundPrimary : DSColor.backgroundSunken).ignoresSafeArea()
            ZStack {
                DSLoopEchoShape()
                    .stroke(DSColor.textPrimary.opacity(echo), style: StrokeStyle(lineWidth: markSize * 0.12, lineCap: .round))
                DSLoopShape(progress: progress)
                    .stroke(DSColor.textPrimary, style: StrokeStyle(lineWidth: markSize * 0.12, lineCap: .round, lineJoin: .round))
            }
            .frame(width: markSize, height: markSize)
            .scaleEffect(scale)
            .opacity(markOpacity)
            .scaleEffect(exiting ? 0.6 : 1)
            .offset(y: exiting ? -40 : 0)
            .opacity(exiting ? 0 : 1)
            .accessibilityLabel(L10n.string("app.name"))
        }
        .contentShape(Rectangle())
        .onTapGesture { skip() }
        .task { await run() }
    }

    // MARK: Sequence (motion-spec §1)

    private func run() async {
        if reduceMotion {
            markOpacity = 0
            progress = 1
            echo = 0.32
            withAnimation(DSMotion.crossfade) { markOpacity = 1; lifted = true }
            try? await Task.sleep(for: .milliseconds(500))
            finish()
            return
        }
        let draw: Double = full ? 0.78 : 0.42
        withAnimation(DSMotion.standard(draw)) { progress = 1 }
        try? await Task.sleep(for: .milliseconds(Int(draw * 1000)))
        guard !finished else { return }
        close()
        if full {
            try? await Task.sleep(for: .milliseconds(40))
            withAnimation(.easeOut(duration: 0.32)) { echo = 0.32 }
            try? await Task.sleep(for: .milliseconds(340))
        } else {
            try? await Task.sleep(for: .milliseconds(120))
        }
        finish()
    }

    /// The loop closes: haptic, scale snap, the background lifts.
    private func close() {
        HapticsService.shared.playLoopClose()
        withAnimation(DSMotion.lively) { scale = 1.035 }
        withAnimation(DSMotion.lively.delay(0.11)) { scale = 1 }
        withAnimation(DSMotion.standard(DSMotion.hero)) { lifted = true }
    }

    /// Tap anywhere: jump to the final frame and hand over.
    private func skip() {
        guard !finished else { return }
        withAnimation(DSMotion.crossfade) { progress = 1; echo = 0.32; lifted = true; markOpacity = 1 }
        finish()
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        withAnimation(reduceMotion ? DSMotion.crossfade : DSMotion.emphasized(DSMotion.standard)) { exiting = true }
        onFinished()
    }
}
