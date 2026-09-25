import SwiftUI
import DoOnceCore

/// Settings → Services: what each service is really doing on this build, from
/// `AppState.serviceStatus`. Labels are computed from the configuration, so "Live" here means
/// the live implementation is wired, not that someone hoped so.
@MainActor
struct ServiceStatusView: View {
    @Environment(AppState.self) private var app

    var body: some View {
        PushedScreen {
            VStack(alignment: .leading, spacing: DS.Space.s4) {
                PageTitle(text: L10n.string("services.title")).padding(.top, DS.Space.s2)
                Text(L10n.string("services.sub")).dsText(.body).foregroundStyle(DSColor.textSecondary)
                DSList {
                    ForEach(Array(app.serviceStatus.enumerated()), id: \.element.id) { index, entry in
                        if index > 0 { DSSeparator() }
                        ServiceStatusRow(entry: entry)
                    }
                }
                .padding(.top, DS.Space.s2)
            }
            .padding(.horizontal, DS.Space.gutter)
        }
    }
}

@MainActor
private struct ServiceStatusRow: View {
    var entry: ServiceStatusEntry

    var body: some View {
        HStack(alignment: .top, spacing: DS.Space.s3) {
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.name).dsText(.headline).foregroundStyle(DSColor.textPrimary)
                Text(entry.note).dsText(.subheadline).foregroundStyle(DSColor.textSecondary).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: DS.Space.s2)
            DSChip(text: entry.modeLabel, systemImage: symbol, tone: tone)
        }
        .padding(.vertical, DS.Space.s3)
        .frame(minHeight: 64)
        .accessibilityElement(children: .combine)
    }

    /// Colour is never the only signal: each mode also has a symbol.
    private var symbol: String {
        switch entry.mode {
        case .live: "checkmark"
        case .partial: "circle.lefthalf.filled"
        case .demo: "theatermasks"
        case .blocked: "minus.circle"
        }
    }

    private var tone: DSChip.Tone {
        switch entry.mode {
        case .live: .signal
        case .partial: .neutral
        case .demo: .warning
        case .blocked: .danger
        }
    }
}
