import DoOnceCore
import SwiftUI

/// One step in Review: the frame, the clip button, the instruction (editable in edit mode), what
/// was said, any warning, and the provenance chip. Never hides that a step was inferred.
@MainActor
struct ReviewStepCard: View {
    enum Action { case toggleWarning, replaceFrame, split, combine, moveUp, moveDown, remove }

    let step: Step
    var isEditing: Bool
    @Binding var instruction: String
    var canMoveUp = true
    var canMoveDown = true
    var canCombine = true
    var onSeeOriginal: (TimeInterval) -> Void
    var onAction: (Action) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            media
            if isEditing {
                TextField(L10n.string("review.editTitle.placeholder"), text: $instruction, axis: .vertical)
                    .dsText(.title2).foregroundStyle(DSColor.textPrimary)
                    .padding(.horizontal, 10).padding(.vertical, 8)
                    .background(DSColor.fillSubtle, in: RoundedRectangle(cornerRadius: DS.Radius.small, style: .continuous))
            } else {
                Text(step.instruction).dsText(.title2).foregroundStyle(DSColor.textPrimary)
            }
            if let details = step.details, !details.isEmpty {
                Text(details).dsText(.body).foregroundStyle(DSColor.textSecondary)
            }
            if let quote = step.sourceTranscript, !quote.isEmpty {
                Text("“\(quote)”").dsText(.subheadline).foregroundStyle(DSColor.textSecondary).lineSpacing(3)
            }
            if let warning = step.warning {
                DSCallout(warning.severity == .high ? .danger : .warning, systemImage: "exclamationmark.triangle", warning.text)
            }
            if step.provenance == .unclear {
                DSCallout(.neutral, systemImage: "questionmark.circle", L10n.string("review.unclear"))
            }
            footer
        }
        .padding(.vertical, 18)
        .accessibilityElement(children: .contain)
    }

    private var media: some View {
        ZStack(alignment: .topLeading) {
            MediaView(ref: step.keyFrame)
                .frame(height: 200).frame(maxWidth: .infinity)
                .background(DSColor.backgroundSunken)
                .clipShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
            Text(String(step.order))
                .font(.system(size: 15, weight: .bold)).foregroundStyle(DSColor.textOnInverse)
                .frame(width: 32, height: 32).background(DSColor.backgroundInverse, in: Circle())
                .padding(12)
            if let range = step.sourceRange {
                VStack { Spacer(); HStack { Spacer()
                    Button { onSeeOriginal(range.lowerBound) } label: {
                        Label(L10n.string("review.originalClip", ["from": DSFormat.clock(range.lowerBound), "to": DSFormat.clock(range.upperBound)]), systemImage: "play.fill")
                            .monospacedDigit()
                    }
                    .buttonStyle(.dsOnMediaSmall)
                    .padding(10)
                } }
            }
        }
        .frame(height: 200)
    }

    private var footer: some View {
        HStack(spacing: 8) {
            provenanceChip
            if isEditing {
                Button { onAction(.toggleWarning) } label: {
                    DSChip(text: step.warning == nil ? L10n.string("review.markWarning") : L10n.string("review.warningSet"), systemImage: "exclamationmark.triangle", tone: step.warning == nil ? .neutral : .warning)
                }
                .buttonStyle(.dsPressable)
                Menu {
                    Button(L10n.string("review.replaceFrame"), systemImage: "photo") { onAction(.replaceFrame) }
                    Button(L10n.string("review.splitStep"), systemImage: "scissors") { onAction(.split) }
                    Button(L10n.string("review.combine"), systemImage: "arrow.triangle.merge") { onAction(.combine) }.disabled(!canCombine)
                    Button(L10n.string("review.moveUp"), systemImage: "arrow.up") { onAction(.moveUp) }.disabled(!canMoveUp)
                    Button(L10n.string("review.moveDown"), systemImage: "arrow.down") { onAction(.moveDown) }.disabled(!canMoveDown)
                    Button(L10n.string("review.remove"), systemImage: "trash", role: .destructive) { onAction(.remove) }
                } label: {
                    DSChip(text: "", systemImage: "ellipsis")
                }
                .accessibilityLabel(L10n.string("common.edit"))
            }
            Spacer(minLength: 0)
        }
    }

    private var provenanceChip: some View {
        switch step.provenance {
        case .observed: DSChip(text: L10n.string("review.observed"), systemImage: "eye", tone: .signal)
        case .inferred: DSChip(text: L10n.string("review.inferred"), systemImage: "waveform", tone: .neutral)
        case .unclear: DSChip(text: L10n.string("review.unclearChip"), systemImage: "questionmark", tone: .neutral)
        }
    }
}

/// Real edits on the local `Memory` copy: reorder, remove, split at the clip's midpoint, combine
/// with the next step, toggle a warning, replace a frame. Orders are renumbered after each edit.
struct StepEditor {
    @Binding var memory: Memory

    func instructionBinding(for id: UUID) -> Binding<String> {
        Binding(
            get: { memory.steps.first { $0.id == id }?.instruction ?? "" },
            set: { text in if let i = memory.steps.firstIndex(where: { $0.id == id }) { memory.steps[i].instruction = text } }
        )
    }

    func move(_ id: UUID, by delta: Int) {
        var steps = memory.orderedSteps
        guard let index = steps.firstIndex(where: { $0.id == id }) else { return }
        let target = index + delta
        guard steps.indices.contains(target) else { return }
        steps.swapAt(index, target)
        commit(steps)
    }

    func remove(_ id: UUID) {
        commit(memory.orderedSteps.filter { $0.id != id })
    }

    func toggleWarning(_ id: UUID) {
        guard let i = memory.steps.firstIndex(where: { $0.id == id }) else { return }
        if memory.steps[i].warning == nil {
            memory.steps[i].warning = Warning(text: memory.steps[i].instruction, severity: .medium)
        } else {
            memory.steps[i].warning = nil
        }
    }

    /// Splits at the midpoint of the source range; the spoken sentences are shared out, and a
    /// half with nothing said becomes `.unclear` rather than getting an invented instruction.
    func split(_ id: UUID) {
        var steps = memory.orderedSteps
        guard let index = steps.firstIndex(where: { $0.id == id }) else { return }
        let step = steps[index]
        let sentences = TextTokenizer.sentences(step.sourceTranscript ?? "")
        let half = sentences.count / 2
        let firstText = sentences.prefix(max(1, half)).joined(separator: " ")
        let secondText = sentences.dropFirst(max(1, half)).joined(separator: " ")
        var first = step
        var second = Step(order: step.order + 1, instruction: secondText.isEmpty ? L10n.string("review.unclear") : (TextTokenizer.sentences(secondText).first ?? secondText),
                          details: nil, sourceTranscript: secondText.isEmpty ? nil : secondText, keyFrame: nil,
                          provenance: secondText.isEmpty ? .unclear : step.provenance, completionRule: .manual)
        if let range = step.sourceRange {
            let mid = (range.lowerBound + range.upperBound) / 2
            first.sourceRange = range.lowerBound...mid
            second.sourceRange = mid...range.upperBound
            if let clip = step.clip, let url = clip.localURL ?? clip.remoteURL {
                first.clip = MediaRef(kind: .video, localURL: clip.localURL, remoteURL: clip.remoteURL, sourceOffset: range.lowerBound, duration: mid - range.lowerBound)
                second.clip = MediaRef(kind: .video, localURL: url.isFileURL ? url : nil, remoteURL: url.isFileURL ? nil : url, sourceOffset: mid, duration: range.upperBound - mid)
            }
        }
        first.sourceTranscript = firstText.isEmpty ? step.sourceTranscript : firstText
        steps.replaceSubrange(index...index, with: [first, second])
        commit(steps)
    }

    func combineWithNext(_ id: UUID) {
        var steps = memory.orderedSteps
        guard let index = steps.firstIndex(where: { $0.id == id }), index + 1 < steps.count else { return }
        var merged = steps[index]
        let next = steps[index + 1]
        merged.details = [merged.details, next.instruction, next.details].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
        merged.sourceTranscript = [merged.sourceTranscript, next.sourceTranscript].compactMap { $0 }.joined(separator: " ")
        if let a = merged.sourceRange, let b = next.sourceRange { merged.sourceRange = min(a.lowerBound, b.lowerBound)...max(a.upperBound, b.upperBound) }
        merged.warning = merged.warning ?? next.warning
        merged.provenance = merged.provenance == .observed || next.provenance == .observed ? .observed : merged.provenance
        steps.replaceSubrange(index...(index + 1), with: [merged])
        commit(steps)
    }

    func replace(step: Step) {
        guard let i = memory.steps.firstIndex(where: { $0.id == step.id }) else { return }
        memory.steps[i] = step
    }

    func renumber() { commit(memory.orderedSteps) }

    private func commit(_ steps: [Step]) {
        memory.steps = steps.enumerated().map { index, step in var s = step; s.order = index + 1; return s }
    }
}
