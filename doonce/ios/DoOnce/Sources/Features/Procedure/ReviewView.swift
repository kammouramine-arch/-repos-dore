import DoOnceCore
import SwiftUI

/// The generated procedure, reviewed before it is remembered, or an existing memory being
/// edited. Provenance is always visible; edits happen on a local copy and, for a saved memory,
/// go through `MemoryVersioning` so nothing is ever lost.
@MainActor
struct ReviewView: View {
    enum Mode { case generated, edit }

    let original: Memory
    let mode: Mode
    var recognition: RecognitionResult? = nil

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @Environment(\.dismiss) private var dismiss
    @State private var draft: Memory
    @State private var isEditing: Bool
    @State private var showsTitleEditor = false
    @State private var showsObjectCreate = false
    @State private var frameToReplace: Step?
    @State private var original: OriginalRequest?

    struct OriginalRequest: Identifiable { let id = UUID(); let time: TimeInterval }

    init(memory: Memory, mode: Mode, recognition: RecognitionResult? = nil) {
        original = memory
        self.mode = mode
        self.recognition = recognition
        _draft = State(initialValue: memory)
        _isEditing = State(initialValue: mode == .edit)
    }

    var body: some View {
        ZStack(alignment: .top) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    hero
                    ReviewMetaGrid(memory: draft, recognition: recognition).padding(.top, 6)
                    DSCallout(.neutral, systemImage: "eye", explainer)
                        .padding(.horizontal, DS.Space.gutter).padding(.top, 14)
                    stepsList.padding(.horizontal, DS.Space.gutter).padding(.top, DS.Space.s2)
                }
                .padding(.bottom, DS.Size.tabBarClearance)
            }
            .ignoresSafeArea(edges: .top)
            DSTopBar(leading: isEditing && mode == .edit ? .close : .back, onMedia: true, onLeading: { leave() })
            floatingCTA
        }
        .background(DSColor.backgroundPrimary.ignoresSafeArea())
        .sheet(isPresented: $showsTitleEditor) {
            ReviewTitleSheet(title: $draft.title).presentationDetents([.height(220)]).presentationCornerRadius(DS.Radius.sheet)
        }
        .sheet(item: $original) { request in
            // Presented here rather than through the router: Review lives inside the Teach cover or an edit sheet.
            SeeOriginalView(memoryID: draft.id, at: request.time)
                .presentationDetents([.medium]).presentationCornerRadius(DS.Radius.sheet)
        }
        .sheet(item: $frameToReplace) { step in
            ReviewFrameSheet(memory: draft, step: step) { replaced in editor.replace(step: replaced) }
                .presentationDetents([.large]).presentationCornerRadius(DS.Radius.sheet)
        }
        .fullScreenCover(isPresented: $showsObjectCreate) {
            ObjectCreateView(memory: draft, recognition: recognition, images: draft.orderedSteps.compactMap(\.keyFrame))
                .environment(app).environment(router)
        }
    }

    private var editor: StepEditor { StepEditor(memory: $draft) }

    // MARK: Sections

    private var hero: some View {
        ZStack(alignment: .bottomLeading) {
            MediaView(ref: app.object(draft.objectID).flatMap { app.heroMedia(for: $0) } ?? draft.orderedSteps.first?.keyFrame)
                .frame(height: 300).frame(maxWidth: .infinity).clipped()
            LinearGradient(stops: [.init(color: DSColor.backgroundPrimary, location: 0), .init(color: DSColor.backgroundPrimary.opacity(0), location: 0.45)], startPoint: .bottom, endPoint: .top)
            VStack(alignment: .leading, spacing: 10) {
                Button { app.haptics.play(.light); showsTitleEditor = true } label: {
                    DSChip(text: L10n.string("review.editTitle"), systemImage: "pencil", tone: .onMedia)
                }
                .buttonStyle(.dsPressable)
                Text(draft.title).dsText(.largeTitle).foregroundStyle(DSColor.textPrimary).lineLimit(2)
            }
            .padding(.horizontal, DS.Space.gutter).padding(.bottom, 18)
        }
        .frame(height: 300)
    }

    private var explainer: Text {
        let full = L10n.string("review.explainer")
        let word = L10n.string("review.observed")
        guard let range = full.range(of: word) else { return Text(full) }
        return Text(String(full[..<range.lowerBound])) + Text(word).bold() + Text(String(full[range.upperBound...]))
    }

    private var stepsList: some View {
        VStack(spacing: 0) {
            let steps = draft.orderedSteps
            ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                ReviewStepCard(
                    step: step,
                    isEditing: isEditing,
                    instruction: editor.instructionBinding(for: step.id),
                    canMoveUp: index > 0,
                    canMoveDown: index < steps.count - 1,
                    canCombine: index < steps.count - 1,
                    onSeeOriginal: { at in original = OriginalRequest(time: at) },
                    onAction: { perform($0, on: step) }
                )
                if index < steps.count - 1 { DSSeparator() }
            }
        }
    }

    private var floatingCTA: some View {
        VStack {
            Spacer()
            HStack(spacing: 10) {
                if isEditing {
                    Button(L10n.string("common.save")) { save() }.buttonStyle(.dsPrimary)
                } else {
                    Button { app.haptics.play(.light); withDSAnimation(DSMotion.crossfade) { isEditing = true } } label: {
                        Image(systemName: "pencil").font(.system(size: 18, weight: .semibold))
                    }
                    .buttonStyle(.ds(.secondary, size: .icon))
                    .frame(width: DS.Size.touchComfort, height: DS.Size.touchComfort)
                    .accessibilityLabel(L10n.string("common.edit"))
                    Button { remember() } label: {
                        HStack(spacing: 8) { DSLoopMark(size: 20, color: DSColor.textOnSignal); Text(L10n.string("review.remember")) }
                    }
                    .buttonStyle(.dsSignal)
                }
            }
            .padding(.horizontal, DS.Space.gutter)
            .padding(.bottom, DS.Space.s8)
        }
        .shadow(color: DSColor.shadow, radius: 20, y: 8)
    }

    // MARK: Actions

    private func perform(_ action: ReviewStepCard.Action, on step: Step) {
        switch action {
        case .toggleWarning: app.haptics.play(.warning); editor.toggleWarning(step.id)
        case .moveUp: app.haptics.play(.selection); editor.move(step.id, by: -1)
        case .moveDown: app.haptics.play(.selection); editor.move(step.id, by: 1)
        case .split: editor.split(step.id)
        case .combine: editor.combineWithNext(step.id)
        case .remove: editor.remove(step.id)
        case .replaceFrame: frameToReplace = step
        }
    }

    /// Generated: the draft carries the edits into Remember. Saved memory: a new version.
    private func save() {
        editor.renumber()
        guard mode == .edit else {
            app.haptics.play(.success)
            withDSAnimation(DSMotion.crossfade) { isEditing = false }
            return
        }
        Task {
            let user = app.currentUser.id
            let renamed = draft.title != original.title ? MemoryVersioning.rename(original, to: draft.title, by: user) : original
            let versioned = MemoryVersioning.replaceSteps(draft.steps, in: renamed, by: user)
            do {
                try await app.save(versioned)
                app.haptics.play(.success)
                dismiss()
            } catch {
                app.haptics.play(.error)
            }
        }
    }

    private func remember() {
        Task {
            if await app.canCreateMemory() { showsObjectCreate = true } else { router.show(.paywall) }
        }
    }

    private func leave() {
        if mode == .generated { router.dismissFullScreen() } else { dismiss() }
    }
}

/// Object · Demonstrated by · Duration · Steps. "Probably" in signal when the object is inferred.
@MainActor
struct ReviewMetaGrid: View {
    let memory: Memory
    var recognition: RecognitionResult?
    @Environment(AppState.self) private var app

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), alignment: .topLeading), GridItem(.flexible(), alignment: .topLeading)], alignment: .leading, spacing: 12) {
            item(L10n.string("review.object"), objectText)
            item(L10n.string("review.demonstratedBy"), Text(app.person(memory.demonstratorID)?.displayName ?? app.currentUser.displayName))
            item(L10n.string("review.duration"), Text(DSFormat.duration(memory.duration)))
            item(L10n.string("review.steps"), Text(String(memory.stepCount)))
        }
        .padding(.horizontal, DS.Space.gutter)
    }

    private var objectText: Text {
        if let object = app.object(memory.objectID) { return Text(object.makeAndModel) }
        let guess = recognition?.best.flatMap { app.object($0.objectID)?.makeAndModel } ?? recognition?.suggestedCategory
        guard let guess else { return Text(L10n.string("review.noObject")).foregroundStyle(DSColor.textSecondary) }
        return Text(L10n.string("review.probably")).foregroundStyle(DSColor.signalText) + Text(" ") + Text(guess)
    }

    private func item(_ label: String, _ value: Text) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            DSEyebrow(text: label)
            value.font(.system(size: 17, weight: .medium)).foregroundStyle(DSColor.textPrimary)
        }
    }
}
