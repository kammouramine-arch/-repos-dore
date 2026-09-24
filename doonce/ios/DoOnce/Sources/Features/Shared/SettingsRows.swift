import SwiftUI

/// A row that pushes somewhere: title, optional value line, chevron.
@MainActor
struct NavRow: View {
    var title: String
    var subtitle: String? = nil
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            DSRow(title: title, subtitle: subtitle, leading: { EmptyView() })
                .foregroundStyle(DSColor.textPrimary)
        }
        .buttonStyle(.dsRowPressable)
    }
}

/// A row with a switch. The label is the whole row, so VoiceOver reads title and state together.
@MainActor
struct ToggleRow: View {
    var title: String
    var subtitle: String? = nil
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 1) {
                Text(title).dsText(.headline).foregroundStyle(DSColor.textPrimary)
                if let subtitle { Text(subtitle).dsText(.subheadline).foregroundStyle(DSColor.textSecondary) }
            }
        }
        .tint(DSColor.signalStrong)
        .padding(.vertical, DS.Space.s3)
        .frame(minHeight: 64)
        .onChange(of: isOn) { _, _ in HapticsService.shared.play(.selection) }
    }
}

/// A row that shows a value and does nothing (About lists, plans).
@MainActor
struct ValueRow: View {
    var title: String
    var value: String
    var wrap = false

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: DS.Space.s3) {
            Text(title).dsText(.headline).foregroundStyle(DSColor.textPrimary)
            Spacer(minLength: DS.Space.s2)
            Text(value).dsText(.callout).foregroundStyle(DSColor.textSecondary)
                .multilineTextAlignment(.trailing).lineLimit(wrap ? nil : 1)
        }
        .padding(.vertical, DS.Space.s3)
        .frame(minHeight: 52)
        .accessibilityElement(children: .combine)
    }
}

/// A row that performs an action without navigating (Sign out, Restore purchases).
@MainActor
struct ActionRow: View {
    var title: String
    var subtitle: String? = nil
    var tone: Color = DSColor.textPrimary
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            DSRow(title: title, subtitle: subtitle, leading: { EmptyView() }, trailing: { EmptyView() })
                .foregroundStyle(tone)
        }
        .buttonStyle(.dsRowPressable)
    }
}

/// A text-only row with a wrapping title and a body underneath (privacy explanations).
@MainActor
struct ExplanationRow: View {
    var title: String
    var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title).dsText(.headline).foregroundStyle(DSColor.textPrimary)
            Text(text).dsText(.subheadline).foregroundStyle(DSColor.textSecondary).fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, DS.Space.s3)
        .accessibilityElement(children: .combine)
    }
}
