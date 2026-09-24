import DoOnceCore
import SwiftUI

/// The sheet that expands under a recognised object: the object, its most relevant memory with a
/// signal Start, and the rest as rows. Everything here is one tap from doing.
@MainActor
struct RecognisedObjectSheet: View {
    let object: PhysicalObject
    var onViewObject: () -> Void
    var onStart: (UUID) -> Void
    var onOpenMemory: (UUID) -> Void

    @Environment(AppState.self) private var app

    private var memories: [Memory] {
        app.memories(for: object).sorted { ($0.lastConfirmedAt ?? $0.createdAt) > ($1.lastConfirmedAt ?? $1.createdAt) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                titleRow
                if let first = memories.first {
                    DSEyebrow(text: L10n.string("look.mostRelevant")).padding(.top, 22).padding(.bottom, 6)
                    relevantCard(first)
                }
                let rest = memories.dropFirst()
                if !rest.isEmpty {
                    DSEyebrow(text: L10n.string("look.otherMemories")).padding(.top, 20).padding(.bottom, 4)
                    ForEach(Array(rest)) { memory in
                        Button { onOpenMemory(memory.id) } label: { memoryRow(memory) }
                            .buttonStyle(.dsRowPressable)
                        if memory.id != rest.last?.id { DSSeparator() }
                    }
                }
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.top, DS.Space.s4)
            .padding(.bottom, DS.Space.s10)
        }
        .background(DSColor.backgroundElevated)
    }

    private var titleRow: some View {
        Button(action: onViewObject) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(object.name).dsText(.title1).foregroundStyle(DSColor.textPrimary)
                    Text([object.makeAndModel == object.name ? nil : object.makeAndModel, app.space(object.spaceID)?.name].compactMap { $0 }.joined(separator: " · "))
                        .dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
                }
                Spacer(minLength: 8)
                DSChip(text: L10n.plural("object.procedures", n: memories.count), systemImage: "checkmark", tone: .signal)
                DSChevron()
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.dsRowPressable)
        .accessibilityLabel(L10n.string("look.viewObject"))
    }

    private func relevantCard(_ memory: Memory) -> some View {
        Button { onStart(memory.id) } label: {
            HStack(spacing: 14) {
                MediaView(ref: app.thumbnail(for: memory) ?? app.heroMedia(for: object))
                    .frame(width: 72, height: 72)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(memory.title).font(.system(size: 19, weight: .bold)).tracking(-0.38).foregroundStyle(DSColor.textPrimary).multilineTextAlignment(.leading)
                    Text(subtitle(for: memory)).font(.system(size: 14)).foregroundStyle(DSColor.textSecondary)
                }
                Spacer(minLength: 8)
                Text(L10n.string("look.start"))
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(DSColor.textOnSignal)
                    .padding(.horizontal, DS.Space.s4).frame(minHeight: 40)
                    .background(DSColor.signal, in: Capsule())
            }
            .padding(12)
            .background(DSColor.fillSubtle, in: RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
        }
        .buttonStyle(.dsPressable)
    }

    private func memoryRow(_ memory: Memory) -> some View {
        DSRow(title: memory.title, subtitle: rowSubtitle(for: memory), leading: {
            MediaView(ref: app.thumbnail(for: memory) ?? app.heroMedia(for: object))
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: DS.Radius.small, style: .continuous))
        }, trailing: {
            HStack(spacing: 10) {
                if memory.riskLevel == .high { DSChip(text: L10n.string("do.warning"), systemImage: "exclamationmark.triangle", tone: .danger) }
                DSChevron()
            }
        })
    }

    private func subtitle(for memory: Memory) -> String {
        [taughtBy(memory), DSFormat.duration(memory.duration), L10n.plural("procedure.steps", n: memory.stepCount)]
            .compactMap { $0 }.joined(separator: " · ")
    }

    private func rowSubtitle(for memory: Memory) -> String {
        [taughtBy(memory), memory.createdAt.formatted(.dateTime.day().month(.abbreviated))].compactMap { $0 }.joined(separator: " · ")
    }

    private func taughtBy(_ memory: Memory) -> String? {
        app.person(memory.demonstratorID).map { L10n.string("people.taughtBy", ["person": $0.displayName.components(separatedBy: " ").first ?? $0.displayName]) }
    }
}
