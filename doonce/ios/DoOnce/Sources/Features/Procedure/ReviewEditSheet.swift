import DoOnceCore
import SwiftUI
import UIKit

/// Rename the memory.
@MainActor
struct ReviewTitleSheet: View {
    @Binding var title: String
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: DS.Space.s4) {
            Text(L10n.string("review.editTitle")).dsText(.title2).foregroundStyle(DSColor.textPrimary)
            TextField(L10n.string("review.editTitle.placeholder"), text: $title)
                .dsText(.body).foregroundStyle(DSColor.textPrimary)
                .padding(.horizontal, 18).frame(minHeight: DS.Size.touchComfort)
                .background(DSColor.fillSubtle, in: Capsule())
                .focused($focused)
                .submitLabel(.done)
                .onSubmit { dismiss() }
            Button(L10n.string("common.save")) { dismiss() }.buttonStyle(.dsPrimary)
        }
        .padding(.horizontal, DS.Space.gutter).padding(.top, DS.Space.s6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DSColor.backgroundElevated)
        .onAppear { focused = true }
    }
}

/// Replace a step's frame: scrub inside the step's own clip range and keep the frame that shows
/// it best. Frames come from the real recording through `AVAssetImageGenerator`.
@MainActor
struct ReviewFrameSheet: View {
    let memory: Memory
    let step: Step
    var onReplace: (Step) -> Void

    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var time: TimeInterval = 0
    @State private var preview: UIImage?
    @State private var recording: Recording?
    @State private var loader: Task<Void, Never>?

    private var range: ClosedRange<TimeInterval> { step.sourceRange ?? 0...max(1, memory.duration) }

    var body: some View {
        VStack(alignment: .leading, spacing: DS.Space.s4) {
            Text(L10n.string("review.replaceFrame.title")).dsText(.title2).foregroundStyle(DSColor.textPrimary)
            Text(L10n.string("review.replaceFrame.hint")).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            ZStack {
                DSColor.backgroundSunken
                if let preview { Image(uiImage: preview).resizable().aspectRatio(contentMode: .fill) }
                else { MediaView(ref: step.keyFrame) }
            }
            .frame(height: 260).frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            Slider(value: $time, in: range) { _ in load() }
                .tint(DSColor.signal)
                .accessibilityLabel(DSFormat.clock(time))
            HStack {
                Text(DSFormat.clock(range.lowerBound)); Spacer(); Text(DSFormat.clock(time)).foregroundStyle(DSColor.textPrimary); Spacer(); Text(DSFormat.clock(range.upperBound))
            }
            .font(.system(size: 13, weight: .semibold)).monospacedDigit().foregroundStyle(DSColor.textTertiary)
            Spacer()
            Button(L10n.string("common.save")) { commit() }.buttonStyle(.dsPrimary).disabled(recording == nil)
        }
        .padding(.horizontal, DS.Space.gutter).padding(.top, DS.Space.s6).padding(.bottom, DS.Space.s8)
        .background(DSColor.backgroundElevated)
        .task {
            time = step.keyFrame?.sourceOffset ?? min(range.lowerBound + 1, range.upperBound)
            if let id = memory.sourceRecordingID { recording = try? await app.services.recordings.recording(id: id) }
            load()
        }
    }

    private func load() {
        loader?.cancel()
        guard let recording else { return }
        let at = time
        loader = Task {
            let image = try? await KeyFrames.image(from: recording.localURL, at: at)
            if !Task.isCancelled, let image { preview = image }
        }
    }

    private func commit() {
        guard let recording else { return }
        Task {
            if let ref = try? await KeyFrames.frame(of: recording, at: time) {
                var updated = step
                updated.keyFrame = ref
                onReplace(updated)
                app.haptics.play(.success)
            }
            dismiss()
        }
    }
}
