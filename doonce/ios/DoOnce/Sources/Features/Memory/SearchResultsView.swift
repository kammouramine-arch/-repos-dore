import SwiftUI
import DoOnceCore

/// Results grouped the way people ask: the one line that answers the question first, then the
/// memories, then the objects. Provenance on every answer.
@MainActor
struct SearchResultsView: View {
    var results: SearchResults

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let best = results.bestAnswer {
                DSEyebrow(text: L10n.string("search.bestAnswer")).padding(.bottom, 10)
                BestAnswerCard(answer: best).padding(.bottom, DS.Space.s5)
            }
            if !results.memories.isEmpty {
                DSEyebrow(text: L10n.string("search.memories")).padding(.bottom, DS.Space.s1)
                MemoryRowList(memories: results.memories, showObject: true)
            }
            if !results.objects.isEmpty {
                DSEyebrow(text: L10n.string("search.objects")).padding(.top, 22).padding(.bottom, 10)
                HScroll {
                    ForEach(results.objects) { object in ObjectCardView(object: object) }
                }
                .padding(.horizontal, -DS.Space.gutter)
            }
            if results.isEmpty {
                EmptyState(symbol: "magnifyingglass", title: L10n.string("search.empty.title"), subtitle: L10n.string("search.empty.sub"))
                    .padding(.top, DS.Space.s16)
            }
        }
    }
}

/// The answer as a quote with the value in signal, who said it, and where in the original.
@MainActor
struct BestAnswerCard: View {
    var answer: SearchResults.BestAnswer

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router

    var body: some View {
        Button {
            router.present(.doMode(memoryID: answer.memory.id, startStep: answer.step.order))
        } label: {
            VStack(alignment: .leading, spacing: DS.Space.s2) {
                quote.dsText(.title3).fontWeight(.bold).foregroundStyle(DSColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(provenance).dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
                if let start = answer.step.sourceRange?.lowerBound {
                    Label(L10n.string("ask.source", ["time": DSFormat.clock(start)]), systemImage: "play.fill")
                        .dsText(.footnote).foregroundStyle(DSColor.textTertiary)
                        .padding(.top, DS.Space.s1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(DS.Space.s4)
            .background(DSColor.backgroundElevated, in: RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
            .shadow(color: DSColor.shadow, radius: 12, y: 4)
        }
        .buttonStyle(.dsPressable)
        .accessibilityElement(children: .combine)
    }

    /// "“Stop when it reaches *1.5 bar*.”": the measured value is marked inside the instruction.
    private var quote: Text {
        let raw = answer.value.raw
        let marked = answer.step.instruction.replacingOccurrences(of: raw, with: "*\(raw)*")
        return Text("\u{201C}") + MarkedText.text(marked, emphasis: DSColor.signalText) + Text("\u{201D}")
    }

    private var provenance: String {
        L10n.plural("search.hitLine", n: answer.step.order, ["person": app.demonstratorName(for: answer.memory), "title": answer.memory.title])
    }
}
