import SwiftUI
import AVKit
import DoOnceCore

/// "See original": the exact moment a step or an answer came from, not the whole recording.
///
/// It plays the source recording from the moment's start and pauses at its end — the end of the
/// step's source range, or of the transcript segment an answer quoted — then offers "Replay this
/// moment" or "Keep watching". When the file is not on this phone (sample content, or a recording
/// still syncing) the step's key frame stands in with the moment marked on a scrubber and the words
/// spoken there, so the provenance stays visible without the video.
@MainActor
struct SeeOriginalView: View {
    let memoryID: UUID
    let at: TimeInterval

    @Environment(AppState.self) private var app
    @State private var recording: Recording?
    @State private var player: AVPlayer?
    @State private var boundary: Any?
    @State private var loaded = false
    @State private var ended = false

    private var memory: Memory? { app.memory(memoryID) }
    /// The step this moment belongs to, for its range, key frame and remembered words.
    private var step: Step? {
        let steps = memory?.orderedSteps ?? []
        return steps.first { $0.sourceRange?.lowerBound == at }
            ?? steps.first { $0.sourceRange?.contains(at) == true }
            ?? steps.first
    }
    private var duration: TimeInterval { recording?.duration ?? memory?.duration ?? 0 }
    /// The transcript segment spoken at `at`, when the recording's transcript is here.
    private var segment: TranscriptSegment? {
        recording?.transcript?.segments.first { $0.start <= at + 0.25 && at < $0.end }
    }
    /// Where the moment ends: the step's own range, else the quoted segment, else a short window.
    private var end: TimeInterval {
        let candidate: TimeInterval
        if let range = step?.sourceRange, range.contains(at), range.upperBound > at + 0.5 {
            candidate = range.upperBound
        } else if let segment, segment.end > at + 0.5 {
            candidate = segment.end
        } else {
            candidate = at + 8
        }
        return duration > 0 ? min(candidate, duration) : candidate
    }
    private var quote: String? {
        if let range = step?.sourceRange, range.contains(at), let words = step?.sourceTranscript, !words.isEmpty { return words }
        return segment?.text ?? step?.sourceTranscript
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DS.Space.s4) {
            media
                .frame(height: 220)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            Text(L10n.fill("seeOriginal.segment", ["from": DSFormat.clock(at), "to": DSFormat.clock(end)]))
                .dsText(.subheadline).fontWeight(.semibold).monospacedDigit()
                .foregroundStyle(DSColor.textSecondary)
                .accessibilityIdentifier("seeOriginal.segment")
            if let memory {
                OriginalWordsBlock(label: app.saidLabel(for: memory), quote: quote, range: nil)
            }
            if player != nil, ended {
                HStack(spacing: DS.Space.s2) {
                    Button { replay() } label: {
                        Label(L10n.string("seeOriginal.replay"), systemImage: "arrow.counterclockwise").frame(maxWidth: .infinity, minHeight: DS.Size.touchMin)
                    }
                    .buttonStyle(.dsSmall)
                    .accessibilityIdentifier("seeOriginal.replay")
                    Button { keepWatching() } label: {
                        Text(L10n.string("seeOriginal.keepWatching")).frame(maxWidth: .infinity, minHeight: DS.Size.touchMin)
                    }
                    .buttonStyle(.dsSmall)
                }
                .transition(.opacity)
            }
            if loaded, player == nil {
                Text(L10n.string("seeOriginal.missing")).dsText(.footnote).foregroundStyle(DSColor.textTertiary)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.top, DS.Space.s8)
        .background(DSColor.backgroundElevated)
        .dsAnimation(DSMotion.standard(0.2), value: ended)
        .task { await load() }
        .onDisappear { stop() }
    }

    @ViewBuilder private var media: some View {
        if let player {
            VideoPlayer(player: player)
        } else {
            ZStack(alignment: .bottom) {
                MediaView(ref: step?.keyFrame ?? step?.clip).opacity(0.85)
                Image(systemName: "play.fill")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(DSColor.textOnMedia)
                    .frame(width: 64, height: 64)
                    .background { DSGlass(style: .onMedia).clipShape(Circle()) }
                    .frame(maxHeight: .infinity, alignment: .center)
                    .accessibilityLabel(L10n.string("seeOriginal.play"))
                scrubber.padding(DS.Space.s3)
            }
            .background(DSColor.backgroundSunken)
        }
    }

    /// The whole recording, with the moment highlighted as a segment of it.
    private var scrubber: some View {
        HStack(spacing: DS.Space.s2) {
            Text(DSFormat.clock(at)).monospacedDigit()
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(DSColor.textOnMedia.opacity(0.3))
                    Capsule().fill(DSColor.signal)
                        .frame(width: max(4, geo.size.width * (fraction(end) - fraction(at))))
                        .offset(x: geo.size.width * fraction(at))
                }
            }
            .frame(height: 3)
            Text(DSFormat.clock(duration)).monospacedDigit()
        }
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(DSColor.textOnMedia)
        .accessibilityElement(children: .combine)
    }

    private func fraction(_ t: TimeInterval) -> CGFloat { duration > 0 ? CGFloat(min(1, max(0, t / duration))) : 0 }

    // MARK: Playback

    /// Plays only a file that is actually here: the recording's own path, or the media library's
    /// original for it (the container path moves between installs). Anything else falls back.
    private func load() async {
        defer { loaded = true }
        guard let id = memory?.sourceRecordingID, let recording = try? await app.services.recordings.recording(id: id) else { return }
        self.recording = recording
        guard let url = app.media.playableOriginalURL(for: recording) else { return }
        let player = AVPlayer(url: url)
        self.player = player
        replay()
    }

    private func replay() {
        guard let player else { return }
        ended = false
        if let boundary { player.removeTimeObserver(boundary) }
        let stopAt = CMTime(seconds: end, preferredTimescale: 600)
        boundary = player.addBoundaryTimeObserver(forTimes: [NSValue(time: stopAt)], queue: .main) {
            MainActor.assumeIsolated {
                player.pause()
                ended = true
            }
        }
        Task {
            _ = await player.seek(to: CMTime(seconds: at, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
            player.play()
        }
    }

    private func keepWatching() {
        guard let player else { return }
        if let boundary { player.removeTimeObserver(boundary); self.boundary = nil }
        ended = false
        player.play()
    }

    private func stop() {
        guard let player else { return }
        player.pause()
        if let boundary { player.removeTimeObserver(boundary); self.boundary = nil }
    }
}
