import SwiftUI
import DoOnceCore

/// One step as read on the page, in three layers: the instruction (what to do), the exact words
/// that were said (what they said), and See original (what actually happened, at that moment).
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
            if let details = step.details, !details.isEmpty {
                Text(details).dsText(.body).foregroundStyle(DSColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            OriginalWordsBlock(label: app.saidLabel(for: memory), quote: step.sourceTranscript, range: step.sourceRange) { at in
                router.show(.seeOriginal(memoryID: memory.id, at: at))
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
        }
        .frame(height: 200)
        .background(DSColor.backgroundSunken)
        .clipShape(RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
    }
}
