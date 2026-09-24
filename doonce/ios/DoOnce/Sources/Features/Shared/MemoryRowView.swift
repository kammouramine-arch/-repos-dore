import SwiftUI
import DoOnceCore

/// One memory in a list: key frame, title, provenance line, and a "Care" chip when getting it
/// wrong is dangerous. Used by the timeline, object passports, people pages and search.
@MainActor
struct MemoryRowView: View {
    var memory: Memory
    var showObject = false

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        Button {
            router.push(.procedure(memory.id))
        } label: {
            DSRow(title: memory.title, subtitle: subtitle) {
                MediaView(ref: app.thumbnail(for: memory))
                    .frame(width: 64, height: 64)
                    .clipShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            } trailing: {
                HStack(spacing: DS.Space.s2) {
                    if memory.riskLevel == .high {
                        DSChip(text: L10n.string("memory.care"), systemImage: "exclamationmark.triangle", tone: .danger)
                    }
                    DSChevron()
                }
            }
            .foregroundStyle(DSColor.textPrimary)
        }
        .buttonStyle(.dsRowPressable)
        .accessibilityLabel(accessibilityText)
    }

    private var subtitle: String {
        var parts: [String] = []
        if showObject, let object = app.object(memory.objectID) { parts.append(object.name) }
        parts.append(L10n.string("people.taughtBy", ["person": app.demonstratorName(for: memory)]))
        parts.append(DSFormat.shortDay(memory.createdAt))
        return parts.joined(separator: " · ")
    }

    private var accessibilityText: String {
        var parts = [memory.title, subtitle]
        if memory.riskLevel == .high { parts.append(L10n.string("do.warning")) }
        return parts.joined(separator: ", ")
    }
}

/// Rows separated by hairlines, never boxes.
@MainActor
struct MemoryRowList: View {
    var memories: [Memory]
    var showObject = false

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(memories.enumerated()), id: \.element.id) { index, memory in
                if index > 0 { DSSeparator() }
                MemoryRowView(memory: memory, showObject: showObject)
            }
        }
    }
}
