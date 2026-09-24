import SwiftUI
import DoOnceCore

/// Share an object, or one memory: what they'll see, two clear choices about the link, and the
/// link itself. Original recordings stay out unless the sharer says otherwise.
@MainActor
struct ShareView: View {
    var objectID: UUID
    var memoryID: UUID?

    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var anyoneWithLink = true
    @State private var includeRecordings = false
    @State private var showQR = false

    var body: some View {
        ZStack(alignment: .top) {
            DSColor.backgroundElevated.ignoresSafeArea()
            if let object = app.object(objectID) {
                let memories = memoryID.flatMap { id in app.memory(id).map { [$0] } } ?? app.memories(for: object)
                let thing = memoryID.flatMap { app.memory($0)?.title } ?? object.name
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(L10n.string("share.title", ["thing": thing])).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary)
                            .accessibilityAddTraits(.isHeader)
                        Text(L10n.string("share.sub", ["memories": L10n.plural("share.preview", n: memories.count)]))
                            .dsText(.body).foregroundStyle(DSColor.textSecondary).padding(.top, 6)
                        preview(object: object, title: thing, count: memories.count).padding(.top, DS.Space.s5)
                        VStack(spacing: 0) {
                            ToggleRow(title: L10n.string("share.anyone"), subtitle: L10n.string("share.anyone.sub"), isOn: $anyoneWithLink)
                            DSSeparator()
                            ToggleRow(title: L10n.string("share.recordings"), subtitle: L10n.string(includeRecordings ? "share.recordings.on" : "share.recordings.off"), isOn: $includeRecordings)
                        }
                        .padding(.horizontal, DS.Space.s4)
                        .padding(.top, DS.Space.s5)
                        ShareLink(item: shareURL) {
                            Label(L10n.string("share.link"), systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(.dsPrimary)
                        .padding(.top, DS.Space.s5)
                        Button {
                            withDSAnimation(DSMotion.gentle) { showQR.toggle() }
                        } label: {
                            Label(L10n.string("share.qr"), systemImage: "qrcode")
                        }
                        .buttonStyle(.ds(.secondary, fullWidth: true))
                        .padding(.top, DS.Space.s2)
                        if showQR {
                            VStack(spacing: DS.Space.s3) {
                                QRCodeImage(string: shareURL.absoluteString)
                                Text(L10n.string("share.import.scan")).dsText(.footnote).foregroundStyle(DSColor.textTertiary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, DS.Space.s6)
                            .transition(.opacity)
                        }
                    }
                    .padding(.horizontal, DS.Space.gutter)
                    .padding(.top, 80)
                    .padding(.bottom, DS.Space.s10)
                }
            }
            DSTopBar(leading: .close, onLeading: { dismiss() })
        }
    }

    private func preview(object: PhysicalObject, title: String, count: Int) -> some View {
        HStack(spacing: 14) {
            MediaView(ref: app.heroMedia(for: object))
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).dsText(.title3).fontWeight(.bold).foregroundStyle(DSColor.textPrimary).lineLimit(2)
                Text([object.makeAndModel, L10n.plural("share.preview", n: count)].joined(separator: " · "))
                    .dsText(.subheadline).foregroundStyle(DSColor.textSecondary).lineLimit(1)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DSColor.backgroundSunken, in: RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    /// Placeholder link until the sharing backend exists.
    private var shareURL: URL {
        let id = (memoryID ?? objectID).uuidString.lowercased()
        return URL(string: "https://doonce.app/s/\(id)") ?? URL(string: "https://doonce.app")!
    }
}
