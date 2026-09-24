import SwiftUI
import DoOnceCore

/// The object passport: the photograph edge to edge, then everything the household knows about
/// this thing: its memories, whether they are still trusted, who services it, and its facts.
@MainActor
struct ObjectDetailView: View {
    var objectID: UUID

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var confirmDelete = false
    @State private var renaming = false
    @State private var newName = ""

    var body: some View {
        if let object = app.object(objectID) {
            PushedScreen(onMedia: true) {
                content(object)
            } trailing: {
                ObjectMenu(object: object, onRename: { newName = object.name; renaming = true }, onDelete: { confirmDelete = true })
            }
            .zoomDestination(id: objectID)
            .confirmationDialog(L10n.fill("object.delete.confirm", ["object": object.name]), isPresented: $confirmDelete, titleVisibility: .visible) {
                Button(L10n.string("common.delete"), role: .destructive) { delete(object) }
                Button(L10n.string("common.cancel"), role: .cancel) {}
            }
            .alert(L10n.string("common.rename"), isPresented: $renaming) {
                TextField(object.name, text: $newName)
                Button(L10n.string("common.save")) { rename(object, to: newName) }
                Button(L10n.string("common.cancel"), role: .cancel) {}
            }
        } else {
            EmptyState(symbol: "questionmark.circle", title: L10n.string("look.unknown.title"))
                .padding(.top, DS.Space.s16)
        }
    }

    private func content(_ object: PhysicalObject) -> some View {
        let memories = app.memories(for: object)
        return VStack(alignment: .leading, spacing: 0) {
            ObjectHero(object: object, spaceName: app.space(object.spaceID)?.name)
            VStack(alignment: .leading, spacing: 0) {
                memoriesHeader(object, count: memories.count)
                MemoryRowList(memories: memories)
                if let callout = FreshnessCallout(memories: memories) { callout.padding(.top, DS.Space.s4) }
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.top, DS.Space.s4)

            if let contact = object.serviceContacts.first {
                NeedAgainCard(contact: contact).padding(.horizontal, DS.Space.gutter).padding(.top, 28)
            }
            AboutList(object: object).padding(.horizontal, DS.Space.gutter).padding(.top, 28)
            actions(object).padding(.horizontal, DS.Space.gutter).padding(.top, DS.Space.s5)
        }
    }

    private func memoriesHeader(_ object: PhysicalObject, count: Int) -> some View {
        HStack(alignment: .center) {
            Text(L10n.plural("object.procedures", n: count)).dsText(.title2).foregroundStyle(DSColor.textPrimary)
                .accessibilityAddTraits(.isHeader)
            Spacer()
            Button {
                Task {
                    if await PermissionsService.status(.camera) == .granted { router.present(.teach(objectID: object.id)) }
                    else { router.show(.permission(.camera, then: .teach(objectID: object.id))) }
                }
            } label: {
                Label(L10n.string("center.teach"), systemImage: "record.circle")
            }
            .buttonStyle(.dsSmall)
        }
        .padding(.bottom, DS.Space.s3)
    }

    @State private var downloaded = false

    private func actions(_ object: PhysicalObject) -> some View {
        VStack(spacing: DS.Space.s1) {
            Button {
                HapticsService.shared.play(.success)
                withDSAnimation(DSMotion.snappy) { downloaded = true }
            } label: {
                Label(L10n.string(downloaded ? "object.downloaded" : "object.offline"), systemImage: downloaded ? "checkmark" : "arrow.down.to.line")
            }
            .buttonStyle(.ds(.secondary, fullWidth: true))
            .disabled(downloaded)
            Button {
                router.show(.share(objectID: object.id, memoryID: nil))
            } label: {
                Label(L10n.string("share.title", ["thing": object.name]), systemImage: "square.and.arrow.up")
            }
            .buttonStyle(.ds(.ghost, fullWidth: true))
        }
    }

    private func rename(_ object: PhysicalObject, to name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        var updated = object
        updated.name = trimmed
        Task { try? await app.save(updated) }
    }

    private func delete(_ object: PhysicalObject) {
        Task {
            for memory in app.memories(for: object) { try? await app.services.memories.delete(id: memory.id) }
            try? await app.services.objects.delete(id: object.id)
            await app.refresh()
            router.pop()
        }
    }
}

/// Rename, move to a space, delete. Lives behind the ellipsis so the page stays about the object.
@MainActor
struct ObjectMenu: View {
    var object: PhysicalObject
    var onRename: () -> Void
    var onDelete: () -> Void

    @Environment(AppState.self) private var app

    var body: some View {
        Menu {
            Button(L10n.string("common.rename"), systemImage: "pencil", action: onRename)
            Menu(L10n.string("object.move"), systemImage: "arrow.right.square") {
                ForEach(app.spaces) { space in
                    Button(space.name) { move(to: space) }
                }
            }
            Button(L10n.string("object.delete"), systemImage: "trash", role: .destructive, action: onDelete)
        } label: {
            Image(systemName: "ellipsis").font(.system(size: 17, weight: .semibold))
        }
        .menuStyle(.button)
        .buttonStyle(.dsOnMediaIcon)
        .accessibilityLabel(L10n.string("common.edit"))
    }

    private func move(to space: Space) {
        var updated = object
        updated.spaceID = space.id
        Task { try? await app.save(updated) }
    }
}
