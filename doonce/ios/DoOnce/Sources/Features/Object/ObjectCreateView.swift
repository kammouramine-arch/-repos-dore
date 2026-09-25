import DoOnceCore
import SwiftUI

/// "Looks like a Vaillant ecoTEC Plus." — confirm, rename or keep it generic, choose a space,
/// and the object exists (or the recognised one is reused). With a memory, it then plays the
/// save moment; from Add, it opens the new object.
struct ObjectCreateView: View {
    var memory: Memory? = nil
    var recognition: RecognitionResult? = nil
    /// Key frames (Teach) or captures (Add) that become the object's reference images.
    var images: [MediaRef] = []
    var add = false

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @Environment(\.dismiss) private var dismiss
    @State private var selectedSpaceID: UUID?
    @State private var showsNameSheet = false
    @State private var showsSpaceSheet = false
    @State private var name = ""
    @State private var isSaving = false
    @State private var saved: (memory: Memory, object: PhysicalObject)?

    private var suggestedObject: PhysicalObject? {
        guard let best = recognition?.best, recognition?.level == .exact else { return nil }
        return app.object(best.objectID)
    }
    private var suggestedCategory: String? { suggestedObject?.category ?? recognition?.suggestedCategory }
    private var hasSuggestion: Bool { suggestedObject != nil || suggestedCategory != nil }

    var body: some View {
        ZStack {
            if let saved {
                SaveMomentView(memory: saved.memory, object: saved.object).transition(.opacity)
            } else {
                form.transition(.opacity)
            }
        }
        .background(DSColor.backgroundElevated.ignoresSafeArea())
        .onAppear {
            if selectedSpaceID == nil { selectedSpaceID = suggestedObject?.spaceID ?? memory?.spaceID ?? app.spaces.first?.id }
            name = suggestedObject?.makeAndModel ?? suggestedCategory ?? ""
        }
        .sheet(isPresented: $showsNameSheet) {
            NameSheet(title: L10n.string("objectCreate.name"), placeholder: L10n.string("objectCreate.namePlaceholder"), text: $name) { confirm(named: name, linkExisting: false) }
                .presentationDetents([.height(220)]).presentationCornerRadius(DS.Radius.sheet)
        }
        .sheet(isPresented: $showsSpaceSheet) {
            NameSheet(title: L10n.string("objectCreate.newSpace.title"), placeholder: L10n.string("objectCreate.newSpace.placeholder"), text: .constant("")) { createSpace($0) }
                .presentationDetents([.height(220)]).presentationCornerRadius(DS.Radius.sheet)
        }
    }

    private var form: some View {
        ZStack(alignment: .top) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    MediaView(ref: images.first ?? suggestedObject.flatMap { app.heroMedia(for: $0) })
                        .frame(width: 120, height: 120)
                        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                        .shadow(color: DSColor.shadow, radius: 16, y: 8)
                    Text(title).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary).padding(.top, 22)
                    Text(subtitle).dsText(.body).foregroundStyle(DSColor.textSecondary).padding(.top, DS.Space.s2)
                    actions.padding(.top, DS.Space.s6)
                    DSEyebrow(text: L10n.string("objectCreate.whichSpace")).padding(.top, 28).padding(.bottom, 10)
                    spaces
                }
                .padding(.horizontal, DS.Space.gutter)
                .padding(.top, 80)
                .padding(.bottom, DS.Space.s16)
            }
            DSTopBar(leading: .close, onLeading: { dismiss() })
        }
        .disabled(isSaving)
    }

    private var title: String {
        if let object = suggestedObject { return L10n.string("objectCreate.suggest", ["object": object.makeAndModel]) }
        if let category = suggestedCategory { return L10n.string("objectCreate.suggest", ["object": category]) }
        return L10n.string("objectCreate.unknown.title")
    }

    private var subtitle: String {
        hasSuggestion ? L10n.string(add ? "objectCreate.sub.add" : "objectCreate.sub.memory") : L10n.string("objectCreate.unknown.sub")
    }

    @ViewBuilder
    private var actions: some View {
        if hasSuggestion {
            VStack(spacing: 8) {
                Button { confirm(named: suggestedObject?.makeAndModel ?? suggestedCategory ?? name, linkExisting: suggestedObject != nil) } label: {
                    Label(L10n.string("objectCreate.correct"), systemImage: "checkmark")
                }
                .buttonStyle(.dsPrimary)
                HStack(spacing: 8) {
                    Button(L10n.string("objectCreate.edit")) { showsNameSheet = true }.buttonStyle(.ds(.secondary, fullWidth: true))
                    if let category = suggestedCategory {
                        Button(L10n.string("objectCreate.generic", ["category": category])) { confirm(named: category, linkExisting: false) }
                            .buttonStyle(.ds(.secondary, fullWidth: true))
                    }
                }
            }
        } else {
            VStack(spacing: 8) {
                TextField(L10n.string("objectCreate.namePlaceholder"), text: $name)
                    .dsText(.body).foregroundStyle(DSColor.textPrimary)
                    .padding(.horizontal, 18).frame(minHeight: DS.Size.touchComfort)
                    .background(DSColor.fillSubtle, in: Capsule())
                Button { confirm(named: name, linkExisting: false) } label: { Label(L10n.string("objectCreate.confirm"), systemImage: "checkmark") }
                    .buttonStyle(.dsPrimary)
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }

    private var spaces: some View {
        WrapLayout(spacing: DS.Space.s2) {
            ForEach(app.spaces) { space in
                Button {
                    app.haptics.play(.selection)
                    selectedSpaceID = space.id
                } label: { SpaceChip(space: space, cover: cover(for: space), selected: selectedSpaceID == space.id) }
                .buttonStyle(.dsPressable)
            }
            Button { showsSpaceSheet = true } label: { DSChip(text: L10n.string("objectCreate.newSpace"), systemImage: "plus.square") }
                .buttonStyle(.dsPressable)
        }
    }

    private func cover(for space: Space) -> MediaRef? {
        app.coverMedia(for: space)
    }

    // MARK: Commit

    private func createSpace(_ spaceName: String) {
        let trimmed = spaceName.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        Task {
            let space = Space(householdID: app.household.id, name: trimmed)
            try? await app.services.spaces.save(space)
            await app.refresh()
            selectedSpaceID = space.id
        }
    }

    /// Links or creates the object, embeds the reference images, attaches the memory, saves both.
    private func confirm(named chosenName: String, linkExisting: Bool) {
        let trimmed = chosenName.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !isSaving else { return }
        isSaving = true
        Task {
            let embedder = VisionRecognitionService()
            var embeddings: [Embedding] = []
            for image in images { if let e = try? await embedder.embed(image) { embeddings.append(e) } }

            var object: PhysicalObject
            if linkExisting, let existing = suggestedObject {
                object = existing
                object.images.append(contentsOf: images)
                object.visualEmbeddings.append(contentsOf: embeddings)
            } else {
                object = PhysicalObject(householdID: app.household.id, name: trimmed, category: suggestedCategory ?? trimmed,
                                        images: images, visualEmbeddings: embeddings)
            }
            object.spaceID = selectedSpaceID
            object.lastUsedAt = Date()
            do {
                try await app.save(object)
                if var memory {
                    memory.objectID = object.id
                    memory.spaceID = selectedSpaceID
                    // The draft becomes a memory; its processing job is finished.
                    try await app.remember(memory)
                    memory.tags.removeAll { $0 == Memory.draftTag }
                    withDSAnimation(DSMotion.crossfade) { saved = (memory, object) }
                } else {
                    app.haptics.play(.success)
                    router.dismissFullScreen()
                    router.push(.object(object.id))
                }
            } catch {
                app.haptics.play(.error)
                isSaving = false
            }
        }
    }
}

/// A space as a chip with its photo. Selected reads inverse, like the prototype.
struct SpaceChip: View {
    let space: Space
    var cover: MediaRef?
    var selected: Bool
    var body: some View {
        HStack(spacing: 8) {
            MediaView(ref: cover).frame(width: 32, height: 32).clipShape(Circle()).background(DSColor.fillMedium, in: Circle())
            Text(space.name).font(.system(size: 15, weight: .medium))
        }
        .padding(.leading, 4).padding(.trailing, 14).frame(height: 40)
        .foregroundStyle(selected ? DSColor.textOnInverse : DSColor.textPrimary)
        .background(selected ? DSColor.backgroundInverse : DSColor.fillSubtle, in: Capsule())
        .dsAnimation(DSMotion.snappy, value: selected)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// One text field and a Save button, for names.
struct NameSheet: View {
    var title: String
    var placeholder: String
    @Binding var text: String
    var onSave: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var draft = ""
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: DS.Space.s4) {
            Text(title).dsText(.title2).foregroundStyle(DSColor.textPrimary)
            TextField(placeholder, text: $draft)
                .dsText(.body).foregroundStyle(DSColor.textPrimary)
                .padding(.horizontal, 18).frame(minHeight: DS.Size.touchComfort)
                .background(DSColor.fillSubtle, in: Capsule())
                .focused($focused).submitLabel(.done).onSubmit { commit() }
            Button(L10n.string("common.save")) { commit() }.buttonStyle(.dsPrimary)
                .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, DS.Space.gutter).padding(.top, DS.Space.s6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DSColor.backgroundElevated)
        .onAppear { draft = text; focused = true }
    }

    private func commit() {
        text = draft
        onSave(draft)
        dismiss()
    }
}
