import SwiftUI

/// "Hands-free on · Say "next", "back"…" with five signal bars breathing, shown above Done while the
/// microphone is listening. The bar itself is the status; no toast competes with the step counter.
@MainActor
struct HandsFreeBar: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var animating = false

    var body: some View {
        HStack(spacing: DS.Space.s3) {
            HStack(spacing: 3) {
                ForEach(0..<5, id: \.self) { i in
                    Capsule()
                        .fill(DSColor.signal)
                        .frame(width: 3, height: height(i))
                        .animation(reduceMotion ? nil : .easeInOut(duration: 0.5).repeatForever(autoreverses: true).delay(Double(i) * 0.15), value: animating)
                }
            }
            .frame(height: 22)
            Text("\(L10n.string("do.handsFreeOn")) · \(L10n.string("do.voice.hint"))")
                .dsText(.footnote)
                .foregroundStyle(DSColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, DS.Space.s4).padding(.vertical, DS.Space.s3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DSColor.fillSubtle, in: RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
        .onAppear { animating = true }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(L10n.string("do.handsFreeOn")). \(L10n.string("do.voice.hint"))")
    }

    private func height(_ i: Int) -> CGFloat {
        if reduceMotion { return 14 }
        return animating ? 20 : 8
    }
}

/// "Looks good — 1.5 bar": the chip that rises over the media when a monitor confirms a step.
@MainActor
struct AutoCompletionChip: View {
    var value: String
    var body: some View {
        HStack(spacing: DS.Space.s2) {
            Image(systemName: "checkmark").font(.system(size: 15, weight: .bold))
            Text(L10n.string("do.autoGood", ["value": value])).font(.system(size: 15, weight: .bold))
        }
        .foregroundStyle(DSColor.textOnSignal)
        .padding(.leading, DS.Space.s3).padding(.trailing, DS.Space.s4)
        .frame(height: 40)
        .background(DSColor.signal, in: Capsule())
        .shadow(color: DSColor.shadow, radius: 12, y: 6)
        .accessibilityLabel("\(L10n.string("do.autoGood", ["value": value])). \(L10n.string("do.a11y.autoDone"))")
    }
}
