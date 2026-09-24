import DoOnceCore
import SwiftUI

/// The memory is absorbed by the object (motion spec §8): the procedure card compresses toward
/// the object thumbnail, the thumbnail beats, the count rolls, the memory settles as a row, then
/// "Remembered." The haptic lands at the settle. Reduce Motion crossfades.
struct SaveMomentView: View {
    let memory: Memory
    let object: PhysicalObject

    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var objectShown = false
    @State private var countShown = false
    @State private var compressed = false
    @State private var beat = false
    @State private var count = 0
    @State private var rowShown = false
    @State private var titleShown = false
    @State private var subShown = false
    @State private var ctaShown = false

    private var finalCount: Int { app.memories(for: object).count }

    var body: some View {
        GeometryReader { geo in
            let thumbCenter = CGPoint(x: geo.size.width / 2, y: geo.size.height * 0.42)
            let cardCenter = CGPoint(x: geo.size.width / 2, y: 120 + 190)
            ZStack {
                DSColor.backgroundPrimary.ignoresSafeArea()
                VStack(spacing: 0) {
                    Spacer().frame(height: geo.size.height * 0.42 - 66)
                    thumbnail
                    Text(L10n.plural("object.procedures", n: count))
                        .font(.system(size: 15, weight: .semibold)).foregroundStyle(DSColor.signalText)
                        .contentTransition(.numericText())
                        .opacity(countShown ? 1 : 0)
                        .padding(.top, 14)
                    row.padding(.top, 18)
                    Text(L10n.string("save.remembered")).dsText(.display).foregroundStyle(DSColor.textPrimary)
                        .padding(.top, DS.Space.s6)
                        .opacity(titleShown ? 1 : 0).offset(y: titleShown ? 0 : 6)
                    Text(L10n.string("save.next", ["object": object.name.lowercased()])).dsText(.body).foregroundStyle(DSColor.textSecondary)
                        .padding(.top, DS.Space.s2)
                        .opacity(subShown ? 1 : 0)
                    Spacer()
                    Button(L10n.string("save.done")) { done() }
                        .buttonStyle(.dsPrimary)
                        .padding(.horizontal, DS.Space.gutter).padding(.bottom, DS.Space.s8)
                        .opacity(ctaShown ? 1 : 0)
                }
                .multilineTextAlignment(.center)
                card
                    .frame(width: geo.size.width - DS.Space.gutter * 2, height: 380)
                    .position(cardCenter)
                    .scaleEffect(compressed ? 0.3 : 1)
                    .offset(compressed ? CGSize(width: thumbCenter.x - cardCenter.x, height: thumbCenter.y - cardCenter.y) : .zero)
                    .blur(radius: compressed && !reduceMotion ? 6 : 0)
                    .opacity(compressed ? 0 : 1)
                    .allowsHitTesting(false)
            }
        }
        .task { await play() }
    }

    private var thumbnail: some View {
        MediaView(ref: app.heroMedia(for: object))
            .frame(width: 132, height: 132)
            .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
            .shadow(color: DSColor.shadow, radius: 20, y: 10)
            .scaleEffect(objectShown ? (beat ? 1.06 : 1) : 0.9)
            .opacity(objectShown ? 1 : 0)
    }

    private var row: some View {
        HStack(spacing: 12) {
            MediaView(ref: app.thumbnail(for: memory))
                .frame(width: 48, height: 48).clipShape(RoundedRectangle(cornerRadius: DS.Radius.small, style: .continuous))
            VStack(alignment: .leading, spacing: 1) {
                Text(memory.title).font(.system(size: 16, weight: .semibold)).foregroundStyle(DSColor.textPrimary).lineLimit(1)
                Text(object.name).font(.system(size: 13)).foregroundStyle(DSColor.textSecondary)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14).padding(.vertical, 12)
        .frame(width: 300)
        .background(DSColor.backgroundElevated, in: RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
        .shadow(color: DSColor.shadow, radius: 16, y: 6)
        .opacity(rowShown ? 1 : 0).offset(y: rowShown ? 0 : 8)
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 0) {
            MediaView(ref: app.thumbnail(for: memory)).frame(height: 200).frame(maxWidth: .infinity).clipped()
            VStack(alignment: .leading, spacing: 2) {
                Text(memory.title).dsText(.title2).foregroundStyle(DSColor.textPrimary)
                Text([L10n.plural("procedure.steps", n: memory.stepCount), taughtBy].compactMap { $0 }.joined(separator: " · "))
                    .dsText(.subheadline).foregroundStyle(DSColor.textSecondary)
            }
            .padding(DS.Space.s4)
            Spacer(minLength: 0)
        }
        .background(DSColor.backgroundElevated)
        .clipShape(RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
        .shadow(color: DSColor.shadow, radius: 30, y: 16)
    }

    private var taughtBy: String? {
        app.person(memory.demonstratorID).map { L10n.string("people.taughtBy", ["person": $0.displayName]) }
    }

    // MARK: Timeline

    private func play() async {
        let ms: (Int) async -> Void = { try? await Task.sleep(for: .milliseconds($0)) }
        count = max(0, finalCount - 1)
        if reduceMotion {
            await ms(100)
            withAnimation(DSMotion.crossfade) { objectShown = true; countShown = true }
            await ms(200)
            withAnimation(DSMotion.crossfade) { compressed = true; rowShown = true }
            count = finalCount
            app.haptics.playSaveSettle()
            await ms(200)
            withAnimation(DSMotion.crossfade) { titleShown = true; subShown = true; ctaShown = true }
            return
        }
        await ms(500)
        withAnimation(DSMotion.emphasized(0.32)) { objectShown = true }
        withAnimation(DSMotion.standard(0.2).delay(0.2)) { countShown = true }
        await ms(420)
        withAnimation(DSMotion.emphasized(0.62)) { compressed = true }
        await ms(620)
        withAnimation(DSMotion.lively) { beat = true }
        withAnimation(DSMotion.standard(0.16)) { count = finalCount }
        app.haptics.playSaveSettle()
        await ms(120)
        withAnimation(DSMotion.lively) { beat = false }
        await ms(80)
        withAnimation(DSMotion.emphasized(0.24)) { rowShown = true }
        await ms(260)
        withAnimation(DSMotion.emphasized(0.26)) { titleShown = true }
        await ms(140)
        withAnimation(DSMotion.standard(0.26)) { subShown = true }
        await ms(300)
        withAnimation(DSMotion.standard(0.26)) { ctaShown = true }
    }

    private func done() {
        app.hasSavedFirstMemory = true
        router.dismissFullScreen()
    }
}
