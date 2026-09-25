import SwiftUI
import DoOnceCore

/// Calm failure: what happened, that nothing is lost, and one action. `upload` shows how far the
/// resumable upload got; `generic` covers everything else after a recording.
@MainActor
struct ErrorStateView: View {
    enum Kind { case upload, generic }
    var kind: Kind
    var media: MediaRef? = nil
    var progress: Double = 0.62
    /// What exactly went wrong, when the pipeline knows (transcription, gateway); shown under the title.
    var detail: String? = nil
    var retry: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack(alignment: .top) {
            DSColor.backgroundPrimary.ignoresSafeArea()
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    MediaView(ref: media ?? .sample("pipes-gauges"))
                        .saturation(0.6)
                        .frame(height: 240)
                        .frame(maxWidth: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
                        .accessibilityHidden(true)
                    Text(L10n.string(kind == .upload ? "error.upload.title" : "error.generic.title"))
                        .dsText(.title1).foregroundStyle(DSColor.textPrimary)
                        .padding(.top, DS.Space.s6)
                    Text(detail ?? L10n.string(kind == .upload ? "error.upload.sub" : "error.generic.sub"))
                        .dsText(.body).foregroundStyle(DSColor.textSecondary)
                        .padding(.top, DS.Space.s2)
                    DSCallout(.neutral, systemImage: "lock", L10n.string("error.saved"))
                        .padding(.top, DS.Space.s5)
                    if kind == .upload { uploadProgress.padding(.top, DS.Space.s5) }
                }
                .padding(.horizontal, DS.Space.gutter)
                .dsTopBarInset()
                .padding(.bottom, DS.Size.tabBarClearance)
            }
            DSTopBar(leading: .close, onLeading: { dismiss() })
        }
        .safeAreaInset(edge: .bottom) {
            Button(L10n.string("error.retry"), action: retry)
                .buttonStyle(.dsPrimary)
                .padding(.horizontal, DS.Space.gutter)
                .padding(.bottom, DS.Space.s3)
        }
    }

    private var uploadProgress: some View {
        let percent = Int((progress * 100).rounded())
        return VStack(alignment: .leading, spacing: DS.Space.s2) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(DSColor.fillMedium)
                    Capsule().fill(DSColor.textSecondary).frame(width: geo.size.width * progress)
                }
            }
            .frame(height: 4)
            Text(L10n.plural("error.uploadProgress", n: percent)).dsText(.footnote).foregroundStyle(DSColor.textTertiary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(L10n.plural("error.uploadProgress", n: percent))
    }
}
