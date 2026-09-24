import SwiftUI
import DoOnceCore

/// Knowledge a professional left behind: point at their code and the object, its memories and
/// their contact arrive together. The scanner is a placeholder frame until the camera feature
/// lands; the import row is real and seeds the sample boiler if it is missing.
@MainActor
struct QRImportView: View {
    /// Opened from Share: show the code for a customer to scan instead of the scanner.
    var leaveBehind: Bool = false

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        PushedScreen(close: leaveBehind) {
            VStack(spacing: 0) {
                if leaveBehind { leaveBehindContent } else { importContent }
            }
            .padding(.horizontal, DS.Space.gutter)
        }
    }

    private var importContent: some View {
        VStack(spacing: 0) {
            Text(L10n.string("qr.title")).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary).multilineTextAlignment(.center)
                .padding(.top, DS.Space.s2)
                .accessibilityAddTraits(.isHeader)
            Text(L10n.string("qr.sub")).dsText(.body).foregroundStyle(DSColor.textSecondary).multilineTextAlignment(.center).padding(.top, 6)
            ZStack {
                Image("hands-tools").resizable().aspectRatio(contentMode: .fill).opacity(0.7)
                CornerFrame().frame(width: 220, height: 190)
            }
            .frame(height: 340)
            .frame(maxWidth: .infinity)
            .background(DSColor.backgroundInverse)
            .clipShape(RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
            .padding(.top, DS.Space.s5)
            .accessibilityHidden(true)
            DSList { importRow }.padding(.top, DS.Space.s4)
        }
    }

    private var importRow: some View {
        let boiler = SampleData.objects.first { $0.id == SampleIDs.boiler }
        let julien = SampleData.people.first { $0.id == SampleIDs.julien }
        return HStack(spacing: 14) {
            MediaView(ref: boiler?.images.first)
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: DS.Radius.small, style: .continuous))
            VStack(alignment: .leading, spacing: 1) {
                Text([boiler?.name ?? "", L10n.plural("object.procedures", n: SampleMemories.boiler.count)].joined(separator: " · "))
                    .dsText(.headline).foregroundStyle(DSColor.textPrimary)
                Text(L10n.fill("qr.from", ["person": julien?.displayName ?? "", "role": julien?.relationship ?? ""]))
                    .dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            }
            Spacer(minLength: DS.Space.s2)
            Button(L10n.string("qr.import")) { importBoiler() }
                .buttonStyle(.ds(.signal, size: .small))
        }
        .padding(.vertical, DS.Space.s3)
    }

    private var leaveBehindContent: some View {
        VStack(spacing: DS.Space.s3) {
            Text(L10n.string("share.import.title")).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary).multilineTextAlignment(.center)
                .padding(.top, DS.Space.s2)
            Text([app.object(SampleIDs.boiler)?.name ?? "", L10n.plural("share.preview", n: 3)].joined(separator: " · "))
                .dsText(.body).foregroundStyle(DSColor.textSecondary)
            QRCodeImage(string: "https://doonce.app/s/\(SampleIDs.boiler.uuidString.lowercased())").padding(.vertical, DS.Space.s6)
            Text(L10n.string("share.import.hint", ["person": app.person(SampleIDs.julien)?.displayName ?? ""]))
                .dsText(.subheadline).foregroundStyle(DSColor.textTertiary).multilineTextAlignment(.center)
        }
    }

    private func importBoiler() {
        Task {
            if app.object(SampleIDs.boiler) == nil, let boiler = SampleData.objects.first(where: { $0.id == SampleIDs.boiler }) {
                if app.person(SampleIDs.julien) == nil, let julien = SampleData.people.first(where: { $0.id == SampleIDs.julien }) { try? await app.save(julien) }
                try? await app.save(boiler)
                for memory in SampleMemories.boiler where app.memory(memory.id) == nil { try? await app.save(memory) }
            }
            HapticsService.shared.playSaveSettle()
            router.push(.object(SampleIDs.boiler))
        }
    }
}
