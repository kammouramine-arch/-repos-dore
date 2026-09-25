import SwiftUI
import AVFoundation
import DoOnceCore

/// The top 54 % of Do mode: the step's clip looping silently, or its key frame drifting slowly
/// (Ken Burns 1 → 1.06 over 12 s). Under Reduce Motion the frame is still. A gradient into
/// `backgroundPrimary` covers the bottom 40 % so the instruction reads over it.
struct StepMediaView: View {
    var step: Step
    /// Change to restart the clip from the beginning.
    var replayToken: Int
    var isPaused = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drift = false

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                media
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
                LinearGradient(colors: [DSColor.backgroundPrimary, DSColor.backgroundPrimary.opacity(0)], startPoint: .bottom, endPoint: .top)
                    .frame(height: geo.size.height * 0.4)
            }
        }
        .background(DSColor.backgroundSunken)
        .accessibilityHidden(true)
    }

    @ViewBuilder private var media: some View {
        if let clip = step.clip, let url = Self.playableURL(clip) {
            LoopingClipView(url: url, replayToken: replayToken, isPaused: isPaused)
        } else {
            MediaView(ref: step.keyFrame ?? step.clip)
                .scaleEffect(drift && !reduceMotion ? 1.06 : 1, anchor: .center)
                .animation(reduceMotion ? nil : .easeInOut(duration: 12).repeatForever(autoreverses: true), value: drift)
                .onAppear { drift = true }
        }
    }

    /// Only a file that exists can be looped; sample clips point at files that never existed on this
    /// phone, so they fall back to the key frame (which `MediaView` maps to bundled photographs).
    static func playableURL(_ ref: MediaRef) -> URL? {
        if let local = ref.localURL, local.isFileURL, FileManager.default.fileExists(atPath: local.path) { return local }
        if let remote = ref.remoteURL, remote.scheme?.hasPrefix("http") == true { return remote }
        return nil
    }
}

/// A muted `AVPlayer` + `AVPlayerLooper` in a `UIView`, so the clip never stops and never speaks over
/// the prompter or the user.
struct LoopingClipView: UIViewRepresentable {
    var url: URL
    var replayToken: Int
    var isPaused: Bool

    func makeUIView(context: Context) -> PlayerView {
        let view = PlayerView()
        view.load(url)
        return view
    }

    func updateUIView(_ view: PlayerView, context: Context) {
        if view.url != url { view.load(url) }
        if context.coordinator.lastReplay != replayToken {
            context.coordinator.lastReplay = replayToken
            view.restart()
        }
        isPaused ? view.player.pause() : view.player.play()
    }

    func makeCoordinator() -> Coordinator { Coordinator() }
    final class Coordinator { var lastReplay = 0 }

    final class PlayerView: UIView {
        override static var layerClass: AnyClass { AVPlayerLayer.self }
        let player = AVQueuePlayer()
        private var looper: AVPlayerLooper?
        private(set) var url: URL?

        override init(frame: CGRect) {
            super.init(frame: frame)
            (layer as? AVPlayerLayer)?.player = player
            (layer as? AVPlayerLayer)?.videoGravity = .resizeAspectFill
            player.isMuted = true
            player.preventsDisplaySleepDuringVideoPlayback = true
        }
        required init?(coder: NSCoder) { nil }

        func load(_ url: URL) {
            self.url = url
            looper = AVPlayerLooper(player: player, templateItem: AVPlayerItem(url: url))
            player.play()
        }

        func restart() {
            player.seek(to: .zero)
            player.play()
        }
    }
}
