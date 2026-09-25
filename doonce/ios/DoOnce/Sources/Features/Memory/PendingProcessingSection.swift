import DoOnceCore
import SwiftUI

/// "Finish remembering": recordings whose processing did not reach review (the app was closed,
/// the network dropped, transcription failed). One quiet row each, with the recording's last
/// frame; tapping reopens Processing, which resumes from the job's last checkpoint.
@MainActor
struct PendingProcessingSection: View {
    var jobs: [ProcessingJob]

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: L10n.string("memory.pending"))
            VStack(spacing: 0) {
                ForEach(Array(jobs.enumerated()), id: \.element.id) { index, job in
                    if index > 0 { DSSeparator() }
                    PendingProcessingRow(job: job) {
                        router.present(.processing(recordingID: job.recordingID))
                    }
                }
            }
        }
        .padding(.horizontal, DS.Space.gutter)
    }
}

@MainActor
private struct PendingProcessingRow: View {
    var job: ProcessingJob
    var action: () -> Void

    @Environment(AppState.self) private var app

    var body: some View {
        Button(action: action) {
            DSRow(title: L10n.string("memory.pending.title"), subtitle: subtitle) {
                MediaView(ref: thumbnail)
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            } trailing: {
                HStack(spacing: DS.Space.s2) {
                    if job.stage == .failed {
                        Image(systemName: "arrow.counterclockwise").font(.system(size: 15, weight: .semibold)).foregroundStyle(DSColor.textSecondary)
                    }
                    DSChevron()
                }
            }
            .foregroundStyle(DSColor.textPrimary)
        }
        .buttonStyle(.dsRowPressable)
        .accessibilityLabel([L10n.string("memory.pending.title"), subtitle].joined(separator: ", "))
        .accessibilityIdentifier("memory.pending")
    }

    private var subtitle: String {
        if job.stage == .failed { return L10n.string("memory.pending.failed") }
        return L10n.string("memory.pending.sub", ["when": DSFormat.shortDay(job.updatedAt)])
    }

    /// The recording's last frame, when Processing already wrote it; the object's photo otherwise.
    private var thumbnail: MediaRef? {
        let url = RecordingFiles.lastFrameURL(job.recordingID)
        if FileManager.default.fileExists(atPath: url.path) { return MediaRef(kind: .image, localURL: url) }
        return app.object(job.objectID).flatMap { app.heroMedia(for: $0) }
    }
}
