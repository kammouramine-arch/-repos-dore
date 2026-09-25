import SwiftUI
import DoOnceCore

/// Do mode: one instruction per screen, media above, Done within thumb reach, hands-free if wanted.
///
/// The view renders `DoModeViewModel` and routes; every decision (bounds, persistence, what "next"
/// means) lives in the model so it can be tested without a screen.
@MainActor
struct DoModeView: View {
    let memoryID: UUID
    /// 1-based step order to open on (`MemoryProgress.nextStepOrder`).
    let startStep: Int

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var vm: DoModeViewModel?
    @State private var listener = VoiceCommandListener()
    @State private var prompter = SpeechPrompter()
    @State private var activity = ProcedureActivityController()
    @State private var ask: AskRequest?
    @State private var original: OriginalRequest?
    @State private var chipShown = false
    @State private var outgoing: Outgoing?

    struct AskRequest: Identifiable { let id = UUID(); let question: String? }
    struct OriginalRequest: Identifiable { let id = UUID(); let time: TimeInterval }
    /// The step that just left, kept for its 180 ms exit.
    struct Outgoing: Identifiable { let id = UUID(); let step: Step; let direction: DoModeViewModel.Direction }

    var body: some View {
        ZStack {
            DSColor.backgroundPrimary.ignoresSafeArea()
            if let vm {
                if vm.isComplete {
                    CompletionView(memory: vm.memory).transition(.opacity)
                } else {
                    steps(vm).transition(.opacity)
                }
            } else {
                missing
            }
        }
        .onAppear {
            makeModel()
            // Hands are busy and the phone is propped up: never let the screen sleep mid-procedure.
            UIApplication.shared.isIdleTimerDisabled = true
        }
        .onDisappear {
            vm?.disappear()
            UIApplication.shared.isIdleTimerDisabled = false
        }
        .onChange(of: app.soundsEnabled, initial: true) { _, on in prompter.soundsEnabled = on }
        .sheet(item: $ask) { request in
            if let vm {
                AskSheet(memory: vm.memory, step: vm.step, person: app.person(vm.memory.demonstratorID), initialQuestion: request.question) { time in
                    ask = nil
                    Task { try? await Task.sleep(for: .milliseconds(350)); original = OriginalRequest(time: time) }
                }
                .presentationDetents([.medium, .large]).presentationCornerRadius(DS.Radius.sheet)
            }
        }
        .sheet(item: $original) { request in
            SeeOriginalView(memoryID: memoryID, at: request.time)
                .presentationDetents([.medium]).presentationCornerRadius(DS.Radius.sheet)
        }
    }

    private func makeModel() {
        guard vm == nil, let memory = app.memory(memoryID) else { return }
        let model = DoModeViewModel(
            memory: memory, userID: app.currentUser.id, startStep: startStep, handsFree: app.handsFreeDefault,
            progressStore: app, listener: listener, speaker: prompter, activity: activity
        )
        vm = model
        model.appear()
    }

    // MARK: Steps

    /// The outer reader keeps the safe-area inset (for the top row); the inner one measures the full
    /// height so the media takes 54 % of the screen, status bar included, as in the prototype.
    private func steps(_ vm: DoModeViewModel) -> some View {
        GeometryReader { outer in
            GeometryReader { geo in
                VStack(spacing: 0) {
                    mediaArea(vm, topInset: outer.safeAreaInsets.top)
                        .frame(height: geo.size.height * 0.54)
                    ZStack(alignment: .topLeading) {
                        if let step = vm.step {
                            StepBody(step: step, person: app.person(vm.memory.demonstratorID), taughtAt: vm.memory.createdAt)
                                .id(vm.index)
                                .transition(incoming(vm.direction))
                        }
                        if let outgoing {
                            OutgoingStep(direction: outgoing.direction, onDone: { self.outgoing = nil }) {
                                StepBody(step: outgoing.step, person: app.person(vm.memory.demonstratorID), taughtAt: vm.memory.createdAt)
                            }
                            .id(outgoing.id)
                            .transition(.identity)
                        }
                    }
                    controls(vm)
                }
                .dsAnimation(DSMotion.standard(), value: vm.index)
            }
            .ignoresSafeArea(edges: .top)
        }
        .simultaneousGesture(DragGesture(minimumDistance: 30).onEnded { value in
            guard abs(value.translation.width) > 60, abs(value.translation.width) > abs(value.translation.height) else { return }
            app.haptics.play(.selection)
            value.translation.width < 0 ? advance(vm) : goBack(vm)
        })
        .onChange(of: vm.index) { old, new in
            if vm.steps.indices.contains(old) { outgoing = Outgoing(step: vm.steps[old], direction: new > old ? .forward : .back) }
            stepDidChange(vm)
        }
        .onChange(of: vm.autoCompletedValue) { _, value in
            if value != nil { app.haptics.play(.success) }
            withDSAnimation(DSMotion.lively) { chipShown = value != nil }
        }
        .onChange(of: vm.pendingQuestion) { _, question in
            guard let question else { return }
            vm.pendingQuestion = nil
            ask = AskRequest(question: question)
        }
        .onChange(of: vm.pendingOriginalAt) { _, time in
            guard let time else { return }
            vm.pendingOriginalAt = nil
            original = OriginalRequest(time: time)
        }
        .task { warnIfNeeded(vm) }
    }

    private func mediaArea(_ vm: DoModeViewModel, topInset: CGFloat) -> some View {
        ZStack(alignment: .top) {
            if let step = vm.step {
                StepMediaView(step: step, replayToken: vm.replayToken, isPaused: vm.isPaused)
                    .id(step.id)
                    .transition(.opacity)
            }
            topRow(vm).padding(.top, topInset + DS.Space.s2)
            if let value = vm.autoCompletedValue {
                AutoCompletionChip(value: value)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, DS.Space.s6)
                    .offset(y: chipShown ? 0 : 12)
                    .opacity(chipShown ? 1 : 0)
            }
        }
    }

    private func topRow(_ vm: DoModeViewModel) -> some View {
        HStack(alignment: .top) {
            Button { close(vm) } label: { Image(systemName: "xmark").font(.system(size: 17, weight: .semibold)) }
                .buttonStyle(.dsOnMediaIcon)
                .accessibilityLabel(L10n.string("common.close"))
                .accessibilityIdentifier("do.close")
            Spacer()
            VStack(spacing: 6) {
                Text(L10n.string("do.of", ["i": "\(vm.index + 1)", "n": "\(vm.total)"]))
                    .dsText(.headline).fontWeight(.bold).monospacedDigit()
                    .foregroundStyle(DSColor.textOnMedia)
                    .shadow(color: DSColor.shadow, radius: 8, y: 1)
                    .contentTransition(.numericText())
                    .accessibilityIdentifier("do.counter")
                DSSegments(total: vm.total, current: vm.index)
            }
            .accessibilityElement(children: .combine)
            Spacer()
            Button { toggleHandsFree(vm) } label: { Image(systemName: "ear").font(.system(size: 18, weight: .semibold)) }
                .buttonStyle(vm.isHandsFree ? DSButtonStyle.ds(.signal, size: .icon) : .dsOnMediaIcon)
                .accessibilityLabel(L10n.string("do.handsFree"))
                .accessibilityValue(L10n.string(vm.isHandsFree ? "do.handsFreeOn" : "do.handsFreeOff"))
                .accessibilityIdentifier("do.handsFree")
        }
        .padding(.horizontal, DS.Space.gutter)
    }

    private func controls(_ vm: DoModeViewModel) -> some View {
        VStack(spacing: DS.Space.s3) {
            if vm.isHandsFree { HandsFreeBar().transition(.opacity) }
            Button { advance(vm) } label: {
                Text(L10n.string(vm.isLast ? "do.finish" : "do.done"))
                    .font(.system(size: 19, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 60)
            }
            .buttonStyle(vm.isDoneHighlighted ? DSButtonStyle.dsSignal : .dsPrimary)
            .accessibilityIdentifier("do.done")
            HStack(spacing: DS.Space.s2) {
                Button { vm.replay() } label: { Label(L10n.string("do.replay"), systemImage: "arrow.counterclockwise").frame(maxWidth: .infinity, minHeight: DS.Size.touchMin) }
                    .buttonStyle(.dsSmall)
                Button { original = OriginalRequest(time: vm.step?.sourceRange?.lowerBound ?? 0) } label: { Text(L10n.string("do.seeOriginal")).frame(maxWidth: .infinity, minHeight: DS.Size.touchMin) }
                    .buttonStyle(.dsSmall)
                    .accessibilityIdentifier("do.seeOriginal")
                Button { ask = AskRequest(question: nil) } label: { Label(L10n.string("do.ask"), systemImage: "questionmark.circle").frame(maxWidth: .infinity, minHeight: DS.Size.touchMin) }
                    .buttonStyle(.dsSmall)
                    .accessibilityIdentifier("do.ask")
            }
            .labelStyle(.titleAndIcon)
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.top, DS.Space.s3)
        .padding(.bottom, DS.Space.s2)
        .dsAnimation(DSMotion.snappy, value: vm.isHandsFree)
    }

    private var missing: some View {
        VStack(spacing: DS.Space.s4) {
            Text(L10n.string("do.missing")).dsText(.title3).foregroundStyle(DSColor.textSecondary).multilineTextAlignment(.center)
            Button(L10n.string("common.close")) { router.dismissFullScreen() }.buttonStyle(.dsSecondary)
        }
        .padding(DS.Space.gutter)
    }

    // MARK: Actions

    /// Tap, swipe and voice all end here; the container's `dsAnimation` on `index` animates the change.
    private func advance(_ vm: DoModeViewModel) { vm.next() }
    private func goBack(_ vm: DoModeViewModel) { vm.back() }

    private func close(_ vm: DoModeViewModel) {
        vm.disappear()
        router.dismissFullScreen()
    }

    /// Hands-free needs the microphone and speech recognition; the education sheet explains why first.
    private func toggleHandsFree(_ vm: DoModeViewModel) {
        if vm.isHandsFree { vm.setHandsFree(false); return }
        Task {
            let mic = await PermissionsService.request(.microphone) == .granted
            let speech = mic ? await PermissionsService.requestSpeech() : false
            if speech { vm.setHandsFree(true) } else { router.show(.permission(.microphone, then: nil)) }
        }
    }

    private func stepDidChange(_ vm: DoModeViewModel) {
        chipShown = false
        if let step = vm.step {
            AccessibilityNotification.Announcement(L10n.string("do.a11y.step", ["i": "\(vm.index + 1)", "n": "\(vm.total)", "instruction": step.instruction])).post()
        }
        warnIfNeeded(vm)
    }

    /// The warning haptic lands when the callout is visible, after the incoming slide (260 ms).
    private func warnIfNeeded(_ vm: DoModeViewModel) {
        guard vm.step?.warning != nil else { return }
        let index = vm.index
        let delay: Double = reduceMotion ? 0 : DSMotion.standard
        Task {
            try? await Task.sleep(for: .seconds(delay))
            if vm.index == index { app.haptics.play(.warning) }
        }
    }

    /// Incoming slides in from 24 pt on the travel side and fades (standard 260 ms). The exit is
    /// `OutgoingStep`'s job because an `.id` swap keeps the *previous* render's transition for the view
    /// it removes, which points the wrong way after a change of direction.
    private func incoming(_ direction: DoModeViewModel.Direction) -> AnyTransition {
        guard !reduceMotion else { return .opacity }
        let dx = 24 * CGFloat(direction == .back ? -1 : 1)
        return .asymmetric(insertion: .offset(x: dx).combined(with: .opacity).animation(DSMotion.standard()), removal: .identity)
    }
}

/// The step that just left: slides 24 pt away from the travel and fades over the exit duration, then
/// removes itself. Not interactive, not read by VoiceOver.
@MainActor
private struct OutgoingStep<Content: View>: View {
    var direction: DoModeViewModel.Direction
    var onDone: () -> Void
    @ViewBuilder var content: () -> Content
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var gone = false

    var body: some View {
        content()
            .offset(x: gone && !reduceMotion ? -24 * CGFloat(direction == .back ? -1 : 1) : 0)
            .opacity(gone ? 0 : 1)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
            .onAppear {
                withAnimation(reduceMotion ? DSMotion.crossfade : DSMotion.exit()) { gone = true }
                Task { try? await Task.sleep(for: .seconds(DSMotion.quick)); onDone() }
            }
    }
}
