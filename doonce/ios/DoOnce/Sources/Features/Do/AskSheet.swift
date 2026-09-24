import SwiftUI
import DoOnceCore

/// Ask: a question about this memory, answered only from what was said when it was taught, with a link
/// to the moment in the original. Not a chatbot: one question, one grounded answer, a way to hear it.
@MainActor
struct AskSheet: View {
    var memory: Memory
    var step: Step?
    var person: Person?
    var initialQuestion: String?
    /// Where "From the original · 0:19" goes. Defaults to the router's See original sheet.
    var onSource: ((TimeInterval) -> Void)? = nil

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var question = ""
    @State private var answer: MemoryAnswer?
    @State private var input = ""
    @State private var chips: [String] = []
    @State private var transcript: Transcript?
    @State private var dictation: VoiceCommandListener?
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: DS.Space.s4) {
            if !question.isEmpty {
                Text(question)
                    .dsText(.headline)
                    .padding(.horizontal, DS.Space.s4).padding(.vertical, DS.Space.s3)
                    .background(DSColor.fillSubtle, in: UnevenRoundedRectangle(topLeadingRadius: DS.Radius.medium, bottomLeadingRadius: DS.Radius.medium, bottomTrailingRadius: 4, topTrailingRadius: DS.Radius.medium, style: .continuous))
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .accessibilityIdentifier("ask.question")
            }
            if let answer {
                VStack(alignment: .leading, spacing: DS.Space.s2) {
                    Text(answer.text).font(.ds(.body)).lineSpacing(4).fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("ask.answer")
                    if let time = answer.sourceTime {
                        Button { open(time) } label: {
                            Label(L10n.string("ask.source", ["time": DSFormat.clock(time)]), systemImage: "play.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .frame(minHeight: DS.Size.touchMin)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(DSColor.signalText)
                        .accessibilityIdentifier("ask.source")
                    }
                }
                .transition(.opacity)
            }
            ChipFlow(items: chips) { chip in
                app.haptics.play(.selection)
                Task { await ask(chip) }
            }
            Spacer(minLength: 0)
            inputField
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.top, DS.Space.s8)
        .padding(.bottom, DS.Space.s4)
        .background(DSColor.backgroundElevated)
        .dsAnimation(DSMotion.gentle, value: answer)
        .task { await load() }
        .onChange(of: dictation?.finalText) { _, text in
            guard let text, !text.isEmpty else { return }
            stopDictation()
            Task { await ask(text) }
        }
        .onChange(of: dictation?.dictatedText) { _, text in if let text, !text.isEmpty { input = text } }
        .onDisappear(perform: stopDictation)
    }

    private var inputField: some View {
        HStack(spacing: DS.Space.s2) {
            TextField(L10n.string(dictation?.isListening == true ? "ask.listening" : "ask.placeholder"), text: $input)
                .font(.ds(.body))
                .focused($focused)
                .submitLabel(.send)
                .onSubmit { Task { await ask(input) } }
                .accessibilityIdentifier("ask.input")
            if input.isEmpty {
                Button(action: toggleDictation) {
                    Image(systemName: dictation?.isListening == true ? "waveform" : "mic").font(.system(size: 18, weight: .medium))
                }
                .buttonStyle(.ds(.ghost, size: .icon))
                .foregroundStyle(dictation?.isListening == true ? DSColor.signalText : DSColor.textSecondary)
                .accessibilityLabel(L10n.string("ask.dictate"))
            } else {
                Button(L10n.string("ask.send")) { Task { await ask(input) } }
                    .buttonStyle(.dsSmall)
                    .padding(.trailing, 4)
            }
        }
        .padding(.leading, 18).padding(.trailing, 4)
        .frame(minHeight: DS.Size.touchComfort)
        .background(DSColor.fillSubtle, in: Capsule())
    }

    // MARK: Behaviour

    private func load() async {
        if let id = memory.sourceRecordingID, let recording = try? await app.services.recordings.recording(id: id) {
            transcript = recording.transcript
        }
        chips = AskSuggestions.chips(for: memory, transcript: transcript)
        if let initialQuestion, !initialQuestion.isEmpty { await ask(initialQuestion) }
    }

    private func ask(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        input = ""
        focused = false
        question = trimmed
        let answerer = TranscriptGroundedAnswerer(transcript: transcript, speaker: DSFormat.firstName(person))
        answer = await answerer.answer(trimmed, memory: memory, currentStep: step)
    }

    private func open(_ time: TimeInterval) {
        if let onSource { onSource(time) } else { router.show(.seeOriginal(memoryID: memory.id, at: time)) }
    }

    private func toggleDictation() {
        if dictation?.isListening == true { stopDictation(); return }
        let listener = VoiceCommandListener(mode: .dictation)
        dictation = listener
        Task { if await listener.start() == nil { dictation = nil } }
    }

    private func stopDictation() {
        dictation?.stop()
        dictation = nil
    }
}

/// Suggestion chips that wrap onto a second line when three don't fit (Dynamic Type).
@MainActor
private struct ChipFlow: View {
    var items: [String]
    var onTap: (String) -> Void

    var body: some View {
        WrapLayout(spacing: DS.Space.s2) {
            ForEach(items, id: \.self) { item in
                Button { onTap(item) } label: { DSChip(text: item).frame(minHeight: DS.Size.touchMin) }
                    .buttonStyle(.dsPressable)
            }
        }
    }
}
