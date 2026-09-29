import SwiftUI
import DoOnceCore

/// One step in Do mode, in three layers: what to do (the instruction and its detail), what the
/// person actually said (verbatim, under "What Julien said"), and — through the See original
/// control in the bar below — the exact moment in the recording. Then any caution or gap, and who
/// showed it.
@MainActor
struct StepBody: View {
    var step: Step
    /// "What Julien said" / "What you said" / "What they said" (`AppState.saidLabel`).
    var saidLabel: String
    /// "Shown by Julien · 18 Mar" / "Shown by you · …" / "Recorded …" (`AppState.shownByLine`).
    var shownByLine: String
    /// Initials for the small avatar; nil when nobody was named.
    var initials: String?

    var body: some View {
        VStack(alignment: .leading, spacing: DS.Space.s3) {
            Text(step.instruction)
                .dsText(.largeTitle).fontWeight(.heavy)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("do.instruction")
            if let details = step.details, !details.isEmpty {
                Text(details).font(.ds(.title3)).fontWeight(.medium).foregroundStyle(DSColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let quote = step.sourceTranscript, !quote.isEmpty, quote != step.instruction {
                OriginalWordsBlock(label: saidLabel, quote: quote, range: nil)
                    .lineLimit(4)
                    .accessibilityIdentifier("do.said")
            }
            if let warning = step.warning {
                DSCallout(.warning, systemImage: "exclamationmark.triangle", Text("\(L10n.string("do.warning")). ").bold() + Text(warning.text))
            } else if step.provenance == .unclear {
                DSCallout(.neutral, systemImage: "questionmark.circle", L10n.string("review.unclear"))
            }
            Spacer(minLength: 0)
            HStack(spacing: 6) {
                if let initials { DSAvatar(initials: initials, size: 22) }
                Text(shownByLine).dsText(.footnote).foregroundStyle(DSColor.textTertiary)
            }
            .accessibilityElement(children: .combine)
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.top, DS.Space.s2)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
