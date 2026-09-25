import SwiftUI
import DoOnceCore

/// A memory, read end to end: its first frame as the hero, who taught it, every step with the
/// words that were said, and one action, Start. Editing belongs to the review flow.
@MainActor
struct ProcedureDetailView: View {
    var memoryID: UUID

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var editing = false

    var body: some View {
        if let memory = app.memory(memoryID) {
            PushedScreen(onMedia: true) {
                content(memory)
            } trailing: {
                Button { app.haptics.play(.light); editing = true } label: { Image(systemName: "pencil").font(.system(size: 17, weight: .semibold)) }
                    .buttonStyle(.dsOnMediaIcon)
                    .accessibilityLabel(L10n.string("common.edit"))
            }
            .safeAreaInset(edge: .bottom) { floatingActions(memory) }
            .sheet(isPresented: $editing) {
                ReviewView(memory: memory, mode: .edit)
                    .environment(app).environment(router)
                    .presentationDetents([.large]).presentationCornerRadius(DS.Radius.sheet)
            }
        } else {
            EmptyState(symbol: "questionmark.circle", title: L10n.string("look.unknown.title"))
                .padding(.top, DS.Space.s16)
        }
    }

    private func content(_ memory: Memory) -> some View {
        let object = app.object(memory.objectID)
        let steps = memory.orderedSteps
        return VStack(alignment: .leading, spacing: 0) {
            ProcedureHero(memory: memory, object: object, media: steps.first.flatMap { app.media(for: $0, in: memory) } ?? object.flatMap { app.heroMedia(for: $0) })
            VStack(alignment: .leading, spacing: 14) {
                TaughtByLine(memory: memory)
                if memory.riskLevel == .high {
                    DSCallout(.danger, systemImage: "exclamationmark.triangle", Text(L10n.string("procedure.takeCare")))
                }
                if !memory.summary.isEmpty {
                    Text(memory.summary).dsText(.body).foregroundStyle(DSColor.textPrimary).lineSpacing(3)
                }
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.top, 6)

            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                    if index > 0 { DSSeparator() }
                    ProcedureStepBlock(step: step, memory: memory)
                }
                Text([L10n.plural("procedure.version", n: memory.version), L10n.string("object.lastConfirmed", ["date": DSFormat.longDay(memory.lastKnownAccurateAt)])].joined(separator: " · "))
                    .dsText(.footnote).foregroundStyle(DSColor.textTertiary)
                    .padding(.top, DS.Space.s2)
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.top, DS.Space.s2)
        }
    }

    private func floatingActions(_ memory: Memory) -> some View {
        HStack(spacing: 10) {
            Button {
                router.present(.doMode(memoryID: memory.id, startStep: 1))
            } label: {
                Label(L10n.string("look.start"), systemImage: "play.fill")
            }
            .buttonStyle(.dsPrimary)
            .accessibilityIdentifier("procedure.start")
            .shadow(color: DSColor.shadow, radius: 16, y: 8)
            if let objectID = memory.objectID {
                Button {
                    router.show(.share(objectID: objectID, memoryID: memory.id))
                } label: {
                    Image(systemName: "square.and.arrow.up").font(.system(size: 18, weight: .semibold))
                }
                .buttonStyle(.dsGlassIcon)
                .frame(width: DS.Size.touchComfort, height: DS.Size.touchComfort)
                .shadow(color: DSColor.shadow, radius: 16, y: 8)
                .accessibilityLabel(L10n.string("share.title", ["thing": memory.title]))
            }
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.bottom, DS.Space.s3)
    }
}

/// The first key frame, 300 pt, with the memory's title and its object.
@MainActor
struct ProcedureHero: View {
    var memory: Memory
    var object: PhysicalObject?
    var media: MediaRef?

    var body: some View {
        PhotoHero(media: media, title: memory.title, subtitle: subtitle)
    }

    private var subtitle: String? {
        guard let object else { return nil }
        return object.makeAndModel == object.name ? object.name : [object.name, object.makeAndModel].joined(separator: " · ")
    }
}
