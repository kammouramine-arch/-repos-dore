import SwiftUI
import DoOnceCore

/// Haptics: Full, Reduced or Off, with the four moments DoOnce taps for so people can feel the
/// difference before choosing. Writes straight to `HapticsService.shared.policy`.
@MainActor
struct HapticsSettingsView: View {
    @State private var policy: HapticsPolicy = .full

    private enum Sample: CaseIterable {
        case recognised, saved, step, danger
        var titleKey: String {
            switch self {
            case .recognised: "haptics.try.recognised"
            case .saved: "haptics.try.saved"
            case .step: "haptics.try.step"
            case .danger: "haptics.try.danger"
            }
        }
        var intent: HapticsIntent {
            switch self {
            case .recognised: .medium
            case .saved: .success
            case .step: .selection
            case .danger: .warning
            }
        }
    }

    var body: some View {
        PushedScreen {
            VStack(alignment: .leading, spacing: 0) {
                PageTitle(text: L10n.string("settings.haptics")).padding(.top, DS.Space.s2)
                Text(L10n.string("haptics.intro")).dsText(.body).foregroundStyle(DSColor.textSecondary).lineSpacing(3).padding(.top, DS.Space.s2)
                HapticsSegments(selection: $policy).padding(.top, DS.Space.s6)
                Text(L10n.string("haptics.note")).dsText(.footnote).foregroundStyle(DSColor.textTertiary).padding(.top, DS.Space.s3)
                DSEyebrow(text: L10n.string("haptics.try")).padding(.top, 28).padding(.bottom, DS.Space.s2)
                DSList {
                    ForEach(Array(Sample.allCases.enumerated()), id: \.offset) { index, sample in
                        if index > 0 { DSSeparator() }
                        DSRow(title: L10n.string(sample.titleKey), subtitle: sample.intent.rawValue, leading: { EmptyView() }) {
                            Button(L10n.string("common.play")) { play(sample) }.buttonStyle(.dsSmall)
                        }
                        .foregroundStyle(DSColor.textPrimary)
                    }
                }
            }
            .padding(.horizontal, DS.Space.gutter)
        }
        .onAppear { policy = HapticsService.shared.policy }
        .onChange(of: policy) { _, new in
            guard HapticsService.shared.policy != new else { return }
            HapticsService.shared.policy = new
            HapticsService.shared.play(.selection)
        }
    }

    /// The signature patterns play as they do in the product; plain intents go through `play(_:)`.
    private func play(_ sample: Sample) {
        switch sample {
        case .recognised: HapticsService.shared.playRecognitionLock()
        case .saved: HapticsService.shared.playSaveSettle()
        case .step, .danger: HapticsService.shared.play(sample.intent)
        }
    }
}

/// Three-way segmented control in the design language: quiet fill, the chosen segment lifted.
@MainActor
struct HapticsSegments: View {
    @Binding var selection: HapticsPolicy

    var body: some View {
        HStack(spacing: 0) {
            ForEach(HapticsPolicy.allCases, id: \.self) { option in
                Button {
                    withDSAnimation(DSMotion.snappy) { selection = option }
                } label: {
                    Text(option.displayName)
                        .font(.ds(.subheadline)).fontWeight(.medium)
                        .foregroundStyle(selection == option ? DSColor.textPrimary : DSColor.textSecondary)
                        .frame(maxWidth: .infinity, minHeight: 36)
                        .background(selection == option ? DSColor.backgroundElevated : Color.clear, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                        .shadow(color: selection == option ? DSColor.shadow : Color.clear, radius: 4, y: 1)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selection == option ? .isSelected : [])
            }
        }
        .padding(3)
        .background(DSColor.fillSubtle, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(L10n.string("settings.haptics"))
    }
}
