import SwiftUI
import DoOnceCore

/// Who demonstrated a memory. DoOnce's story is "someone shows you once", so the phone's owner is
/// often filming somebody else: a recording with no demonstrator set is *unknown* ("What they
/// said"), never silently the user. Review lets the user say who it was.
enum Demonstrator: Equatable {
    case you
    case person(String)
    case unknown
}

extension AppState {
    func demonstrator(for memory: Memory) -> Demonstrator {
        guard let person = person(memory.demonstratorID) else { return .unknown }
        if person.isSelf { return .you }
        let name = person.displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        return name.isEmpty ? .unknown : .person(name)
    }

    /// "What you said" / "What Julien said" / "What they said" — the label over the verbatim words.
    func saidLabel(for memory: Memory) -> String {
        switch demonstrator(for: memory) {
        case .you: L10n.string("said.you")
        case .person(let name): L10n.fill("said.person", ["person": DSFormat.firstName(name)])
        case .unknown: L10n.string("said.they")
        }
    }

    /// "Shown by you" / "Shown by Julien Martin"; nil when nobody was named.
    func shownBy(for memory: Memory) -> String? {
        switch demonstrator(for: memory) {
        case .you: L10n.string("people.shownByYou")
        case .person(let name): L10n.fill("people.taughtBy", ["person": name])
        case .unknown: nil
        }
    }

    /// The Do-mode provenance line: "Shown by Julien · 18 Mar", "Shown by you · …", "Recorded …".
    func shownByLine(for memory: Memory) -> String {
        let date = DSFormat.shortDay(memory.createdAt)
        switch demonstrator(for: memory) {
        case .you: return L10n.fill("do.shownByYou", ["date": date])
        case .person(let name): return L10n.fill("do.taughtBy", ["person": DSFormat.firstName(name), "date": date])
        case .unknown: return L10n.fill("do.recorded", ["date": date])
        }
    }

    /// The subject of a grounded answer: "You said…", "Julien said…", or nil for "They said…".
    func answerSpeaker(for memory: Memory) -> String? {
        switch demonstrator(for: memory) {
        case .you: L10n.string("person.you")
        case .person(let name): DSFormat.firstName(name)
        case .unknown: nil
        }
    }
}

/// The second and third layers of a step: what the person actually said, word for word, and the
/// way back to the exact moment in the original recording. The quote is transcript text, never
/// rewritten, so it is set as a quotation under a plain label rather than as generated prose.
@MainActor
struct OriginalWordsBlock: View {
    var label: String
    var quote: String?
    var range: ClosedRange<TimeInterval>?
    var onMedia = false
    var onSeeOriginal: ((TimeInterval) -> Void)?

    var body: some View {
        if hasQuote || canPlay {
            VStack(alignment: .leading, spacing: 6) {
                if hasQuote, let quote {
                    // The eyebrow treatment (DSEyebrow), with a colour that also reads on media.
                    Text(label.uppercased()).font(.system(size: 11, weight: .semibold)).tracking(0.66)
                        .foregroundStyle(onMedia ? DSColor.textOnMedia.opacity(0.75) : DSColor.textTertiary)
                    Text("\u{201C}" + quote + "\u{201D}")
                        .dsText(.callout)
                        .foregroundStyle(onMedia ? DSColor.textOnMedia : DSColor.textPrimary)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityLabel("\(label): \(quote)")
                }
                if canPlay, let range, let onSeeOriginal {
                    Button { onSeeOriginal(range.lowerBound) } label: {
                        Label(L10n.fill("seeOriginal.at", ["time": "\(DSFormat.clock(range.lowerBound))–\(DSFormat.clock(range.upperBound))"]), systemImage: "play.fill")
                            .monospacedDigit()
                    }
                    .buttonStyle(.dsSmall)
                    .padding(.top, 2)
                    .accessibilityIdentifier("step.seeOriginal")
                }
            }
            .padding(.leading, 12)
            .overlay(alignment: .leading) {
                Capsule().fill(onMedia ? DSColor.textOnMedia.opacity(0.4) : DSColor.separator).frame(width: 2)
            }
            .accessibilityElement(children: .contain)
        }
    }

    private var hasQuote: Bool { !(quote ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    private var canPlay: Bool { range != nil && onSeeOriginal != nil }
}
