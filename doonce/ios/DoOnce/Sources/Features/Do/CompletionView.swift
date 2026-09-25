import SwiftUI
import DoOnceCore

/// The last Done: the loop draws once in signal, "Done." / "You didn't have to remember.", then a quiet
/// question about accuracy. No confetti. (motion-spec §11)
@MainActor
struct CompletionView: View {
    var memory: Memory

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var loop: CGFloat = 0
    @State private var pulse = false
    @State private var showTitle = false
    @State private var showSub = false
    @State private var showRest = false
    @State private var confirmed = false

    var body: some View {
        ZStack {
            DSColor.backgroundPrimary.ignoresSafeArea()
            VStack(spacing: DS.Space.s3) {
                Spacer()
                DSLoopMark(size: 120, progress: loop, color: DSColor.signal)
                    .scaleEffect(pulse ? 1.04 : 1)
                    .padding(.bottom, DS.Space.s5)
                    .accessibilityHidden(true)
                Text(L10n.string("do.complete.title"))
                    .dsText(.display)
                    .opacity(showTitle ? 1 : 0)
                    .offset(y: showTitle ? 0 : 6)
                    .accessibilityIdentifier("complete.title")
                Text(L10n.string("do.complete.sub"))
                    .font(.ds(.title3)).fontWeight(.regular)
                    .foregroundStyle(DSColor.textSecondary)
                    .opacity(showSub ? 1 : 0)
                accuracy
                    .padding(.top, DS.Space.s10)
                    .opacity(showRest ? 1 : 0)
                Spacer()
                Button(L10n.string("save.done")) { router.dismissFullScreen() }
                    .buttonStyle(.dsPrimary)
                    .opacity(showRest ? 1 : 0)
                    .accessibilityIdentifier("complete.done")
            }
            .multilineTextAlignment(.center)
            .padding(.horizontal, DS.Space.gutter)
            .padding(.bottom, DS.Space.s6)
        }
        .task { await run() }
    }

    @ViewBuilder private var accuracy: some View {
        VStack(spacing: DS.Space.s3) {
            Text(L10n.string("do.complete.accurate")).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            if confirmed {
                DSChip(text: L10n.string("do.complete.confirmed"), systemImage: "checkmark", tone: .signal)
                    .transition(.opacity)
            } else {
                HStack(spacing: DS.Space.s3) {
                    Button(L10n.string("do.complete.yes")) { Task { await confirm() } }
                        .buttonStyle(.dsSecondary)
                        .accessibilityIdentifier("complete.yes")
                    Button(L10n.string("do.complete.update"), action: needsUpdating)
                        .buttonStyle(.dsSecondary)
                        .accessibilityIdentifier("complete.update")
                }
            }
        }
        .dsAnimation(DSMotion.gentle, value: confirmed)
    }

    /// Loop draws over 520 ms, closes with the loop-close haptic, then copy fades in, staggered.
    private func run() async {
        AnalyticsService(app.services.analytics).firstDoCompletion()
        if reduceMotion {
            loop = 1
        } else {
            withAnimation(DSMotion.standard(DSMotion.launchShort)) { loop = 1 }
            try? await Task.sleep(for: .seconds(DSMotion.launchShort))
        }
        app.haptics.playLoopClose()
        withDSAnimation(DSMotion.lively) { pulse = true }
        withDSAnimation(DSMotion.standard()) { showTitle = true }
        try? await Task.sleep(for: .milliseconds(reduceMotion ? 0 : 120))
        withDSAnimation(DSMotion.snappy) { pulse = false }
        withDSAnimation(DSMotion.standard()) { showSub = true }
        try? await Task.sleep(for: .milliseconds(reduceMotion ? 0 : 500))
        withDSAnimation(DSMotion.standard()) { showRest = true }
    }

    /// "Yes" stamps the memory so freshness copy can say when it was last known good.
    private func confirm() async {
        var updated = memory
        updated.lastConfirmedAt = .now
        try? await app.save(updated)
        confirmed = true
    }

    /// "Needs updating" leaves Do mode and opens Teach on the same object; the cover must finish
    /// dismissing before a new one is presented.
    private func needsUpdating() {
        let objectID = memory.objectID
        router.dismissFullScreen()
        Task {
            try? await Task.sleep(for: .seconds(DSMotion.navigation))
            router.present(.teach(objectID: objectID))
        }
    }
}
