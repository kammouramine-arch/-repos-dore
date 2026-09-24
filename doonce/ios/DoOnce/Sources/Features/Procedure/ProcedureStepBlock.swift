import SwiftUI
import DoOnceCore

/// One step as read on the page: its frame with the number and a way back to the original,
/// the instruction, the exact words that were said, and any caution or gap in the capture.
@MainActor
struct ProcedureStepBlock: View {
    var step: Step
    var memory: Memory

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            media
            Text(step.instruction).dsText(.title2).foregroundStyle(DSColor.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
            if let quote = step.sourceTranscript, !quote.isEmpty {
                Text("\u{201C}" + quote + "\u{201D}").dsText(.subheadline).foregroundStyle(DSColor.textSecondary).lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let warning = step.warning {
                DSCallout(warning.severity == .high ? .danger : .warning, systemImage: "exclamationmark.triangle", warning.text)
            }
            if step.provenance == .unclear {
                DSCallout(.neutral, systemImage: "questionmark.circle", L10n.string("review.unclear"))
            }
        }
        .padding(.vertical, 18)
        .accessibilityElement(children: .contain)
    }

    private var media: some View {
        ZStack(alignment: .topLeading) {
            MediaView(ref: app.media(for: step, in: memory))
                .frame(height: 200)
                .frame(maxWidth: .infinity)
                .accessibilityHidden(true)
            Text(String(step.order))
                .font(.ds(.subheadline)).fontWeight(.bold).monospacedDigit()
                .foregroundStyle(DSColor.textOnInverse)
                .frame(width: 32, height: 32)
                .background(DSColor.backgroundInverse, in: Circle())
                .padding(12)
                .accessibilityLabel(L10n.fill("do.of", ["i": String(step.order), "n": String(memory.stepCount)]))
            if let range = step.sourceRange {
                Button {
                    router.show(.seeOriginal(memoryID: memory.id, at: range.lowerBound))
                } label: {
                    Label(L10n.string("review.seeOriginal"), systemImage: "play.fill")
                }
                .buttonStyle(.dsOnMediaSmall)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .padding(10)
            }
        }
        .frame(height: 200)
        .background(DSColor.backgroundSunken)
        .clipShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
    }
}
