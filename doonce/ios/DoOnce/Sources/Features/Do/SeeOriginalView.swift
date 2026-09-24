import SwiftUI
import AVKit
import DoOnceCore

/// "See original": the source recording at the exact moment a step or answer came from.
///
/// When the file is on this phone it plays from `at`. When it is not (sample content, or a recording
/// still syncing), the step's key frame stands in with a play glyph, a scrubber at `at` / duration and
/// the words spoken there, so the provenance is still visible even without the video.
@MainActor
struct SeeOriginalView: View {
    let memoryID: UUID
    let at: TimeInterval

    @Environment(AppState.self) private var app
    @State private var recording: Recording?
    @State private var player: AVPlayer?
    @State private var loaded = false

    private var memory: Memory? { app.memory(memoryID) }
    private var person: Person? { app.person(memory?.demonstratorID) }
    /// The step this moment belongs to, for its key frame and remembered words.
    private var step: Step? {
        memory?.orderedSteps.first { $0.sourceRange?.contains(at) == true } ?? memory?.orderedSteps.first
    }
    private var duration: TimeInterval { recording?.duration ?? memory?.duration ?? 0 }
    private var quote: String? {
        recording?.transcript?.segments.last { $0.start <= at + 2 }?.text ?? step?.sourceTranscript
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DS.Space.s4) {
            media
                .frame(height: 220)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            if let quote, !quote.isEmpty {
                Text("“\(quote)”").font(.ds(.body)).lineSpacing(4).fixedSize(horizontal: false, vertical: true)
            }
            if loaded, player == nil {
                Text(L10n.string("seeOriginal.missing")).dsText(.footnote).foregroundStyle(DSColor.textTertiary)
            }
            Text("\(L10n.string("ask.source", ["time": DSFormat.clock(at)])) · \(DSFormat.firstName(person))")
                .dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.top, DS.Space.s8)
        .background(DSColor.backgroundElevated)
        .task { await load() }
        .onDisappear { player?.pause() }
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
                    .background(DSGlass(style: .onMedia), in: Circle())
                    .frame(maxHeight: .infinity, alignment: .center)
                    .accessibilityLabel(L10n.string("seeOriginal.play"))
                scrubber.padding(DS.Space.s3)
            }
            .background(DSColor.backgroundSunken)
        }
    }

    private var scrubber: some View {
        HStack(spacing: DS.Space.s2) {
            Text(DSFormat.clock(at)).monospacedDigit()
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(DSColor.textOnMedia.opacity(0.3))
                    Capsule().fill(DSColor.signal).frame(width: geo.size.width * fraction)
                }
            }
            .frame(height: 2)
            Text(DSFormat.clock(duration)).monospacedDigit()
        }
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(DSColor.textOnMedia)
        .accessibilityElement(children: .combine)
    }

    private var fraction: CGFloat { duration > 0 ? CGFloat(min(1, at / duration)) : 0 }

    /// Plays only a file that is actually here; a path that never existed on this phone falls back.
    private func load() async {
        defer { loaded = true }
        guard let id = memory?.sourceRecordingID, let recording = try? await app.services.recordings.recording(id: id) else { return }
        self.recording = recording
        let url = recording.localURL
        guard url.isFileURL, FileManager.default.fileExists(atPath: url.path) else { return }
        let player = AVPlayer(url: url)
        _ = await player.seek(to: CMTime(seconds: at, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
        player.play()
        self.player = player
    }
}
