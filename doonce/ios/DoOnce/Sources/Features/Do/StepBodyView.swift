import SwiftUI
import DoOnceCore

/// Instruction, detail, warning or "unclear" note, and the provenance line.
@MainActor
struct StepBody: View {
    var step: Step
    var person: Person?
    var taughtAt: Date

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
            if let warning = step.warning {
                DSCallout(.warning, systemImage: "exclamationmark.triangle", Text("\(L10n.string("do.warning")). ").bold() + Text(warning.text))
            } else if step.provenance == .unclear {
                DSCallout(.neutral, systemImage: "questionmark.circle", L10n.string("review.unclear"))
            }
            Spacer(minLength: 0)
            HStack(spacing: 6) {
                DSAvatar(initials: DSFormat.initials(person), size: 22)
                Text(L10n.string("do.taughtBy", ["person": DSFormat.firstName(person), "date": DSFormat.shortDay(taughtAt)]))
                    .dsText(.footnote).foregroundStyle(DSColor.textTertiary)
            }
            .accessibilityElement(children: .combine)
        }
        .padding(.horizontal, DS.Space.gutter)
        .padding(.top, DS.Space.s2)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
