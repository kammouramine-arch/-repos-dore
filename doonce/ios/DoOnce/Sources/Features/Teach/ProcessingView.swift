import DoOnceCore
import SwiftUI
import UIKit

/// Video becoming a structured memory (motion spec §7). The frozen last frame is the hero; under
/// it the status names only the stage that is running, the ribbon fills with the transcript,
/// words stream in, ticks mark what mattered, and frames lift into the step sequence.
@MainActor
struct ProcessingView: View {
    var recordingID: UUID
    /// The frame Teach froze on Stop; used until the generated thumbnail exists.
    var hero: UIImage? = nil
    var objectID: UUID? = nil

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var model = ProcessingModel()
    @State private var review: Memory?

    var body: some View {
        ZStack {
            if let memory = review {
                ReviewView(memory: memory, mode: .generated, recognition: model.recognition)
                    .transition(reduceMotion ? .opacity : .move(edge: .trailing).combined(with: .opacity))
            } else {
                processing.transition(.opacity)
            }
        }
        .background(DSColor.backgroundPrimary.ignoresSafeArea())
        .task { model.start(app: app, recordingID: recordingID, objectID: objectID) }
        .onDisappear { model.cancel() }
    }

    private var processing: some View {
        ZStack(alignment: .top) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    heroView
                        .frame(height: 260)
                        .clipShape(RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
                        .shadow(color: DSColor.shadow, radius: 16, y: 8)
                        .padding(.horizontal, DS.Space.gutter)
                    Text(L10n.string("processing.title")).dsText(.title2).foregroundStyle(DSColor.textPrimary)
                        .padding(.horizontal, DS.Space.gutter).padding(.top, 22)
                    statusLine.padding(.horizontal, DS.Space.gutter).padding(.top, DS.Space.s5)
                    timeline.padding(.horizontal, DS.Space.gutter).padding(.top, 18)
                    words.padding(.horizontal, DS.Space.gutter).padding(.top, DS.Space.s2)
                    steps.padding(.horizontal, DS.Space.gutter).padding(.top, DS.Space.s5)
                }
                .padding(.top, 70)
                .padding(.bottom, DS.Size.tabBarClearance)
            }
            if case .failed = model.status {
                ErrorStateView(kind: .generic, media: model.hero, retry: { model.retry(app: app, recordingID: recordingID, objectID: objectID) })
                    .transition(.opacity)
            }
            VStack {
                Spacer()
                Button(L10n.string("review.title")) {
                    guard let memory = model.memory else { return }
                    withDSAnimation(DSMotion.gentle) { review = memory }
                }
                .buttonStyle(.dsPrimary)
                .shadow(color: DSColor.shadow, radius: 20, y: 8)
                .padding(.horizontal, DS.Space.gutter)
                .padding(.bottom, DS.Space.s8)
                .opacity(model.isReady ? 1 : 0)
                .offset(y: model.isReady ? 0 : 12)
            }
        }
    }

    @ViewBuilder
    private var heroView: some View {
        if let hero {
            Image(uiImage: hero).resizable().aspectRatio(contentMode: .fill)
        } else {
            MediaView(ref: model.hero)
        }
    }

    private var statusLine: some View {
        HStack(spacing: 10) {
            Circle().fill(DSColor.signal).frame(width: 8, height: 8)
                .modifier(Breathing(active: model.status != .ready && !reduceMotion))
            Text(statusText).font(.system(size: 15, weight: .medium)).foregroundStyle(DSColor.textSecondary)
                .contentTransition(.opacity)
                .id(statusText)
        }
        .frame(minHeight: 22)
        .accessibilityElement(children: .combine)
    }

    private var statusText: String {
        switch model.status {
        case .listening: L10n.string("processing.listening")
        case .steps: L10n.string("processing.steps")
        case .object: L10n.string("processing.object")
        case .guide: L10n.string("processing.guide")
        case .ready: L10n.string("processing.ready")
        case .failed(let message): message
        }
    }

    private var timeline: some View {
        VStack(alignment: .leading, spacing: 0) {
            TimelineRibbon(progress: model.fill, ticks: model.ticks, duration: model.duration,
                           lineColor: DSColor.fillMedium, fillColor: DSColor.textPrimary, markedColor: DSColor.textPrimary)
                .padding(.vertical, 12)
            HStack {
                Text(DSFormat.clock(0))
                Spacer()
                Text(DSFormat.clock(model.duration))
            }
            .font(.system(size: 11, weight: .semibold)).monospacedDigit().foregroundStyle(DSColor.textTertiary)
        }
    }

    private var words: some View {
        Text(KeyPhraseHighlighter.attributed(model.shownText, phrases: model.highlights, color: DSColor.signalText, weight: .semibold))
            .font(.system(size: 15)).lineSpacing(4).foregroundStyle(DSColor.textSecondary)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .topLeading)
            .opacity(model.revealedSteps.isEmpty ? 1 : 0)
            .animation(DSMotion.standard(0.2), value: model.revealedSteps.isEmpty)
    }

    private var steps: some View {
        VStack(spacing: 10) {
            ForEach(model.revealedSteps) { step in
                HStack(spacing: 12) {
                    MediaView(ref: step.keyFrame)
                        .frame(width: 84, height: 56)
                        .clipShape(RoundedRectangle(cornerRadius: DS.Radius.small, style: .continuous))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.instruction).font(.system(size: 16, weight: .semibold)).tracking(-0.16).foregroundStyle(DSColor.textPrimary).lineLimit(2)
                        if let range = step.sourceRange {
                            Text(L10n.string("review.originalClip", ["from": DSFormat.clock(range.lowerBound), "to": DSFormat.clock(range.upperBound)]))
                                .font(.system(size: 13)).monospacedDigit().foregroundStyle(DSColor.textTertiary)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .transition(reduceMotion ? .opacity : .opacity.combined(with: .offset(y: 14)))
            }
        }
    }
}

/// The status dot's slow breathe while a stage runs.
private struct Breathing: ViewModifier {
    var active: Bool
    @State private var dim = false
    func body(content: Content) -> some View {
        content
            .opacity(active ? (dim ? 0.25 : 1) : 1)
            .scaleEffect(active ? (dim ? 0.7 : 1) : 1)
            .animation(active ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true) : .default, value: dim)
            .onAppear { dim = true }
    }
}
