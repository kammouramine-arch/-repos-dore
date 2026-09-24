import DoOnceCore
import SwiftUI

/// "Is this your boiler?" — medium confidence. Yes locks, No moves to unknown.
@MainActor
struct LookUncertainSheet: View {
    let object: PhysicalObject
    var space: Space?
    var onYes: () -> Void
    var onNo: () -> Void

    var body: some View {
        LookSheetFrame {
            Text(L10n.string("look.maybe", ["object": object.name.lowercased()])).dsText(.title1).foregroundStyle(DSColor.textPrimary)
            Text([object.makeAndModel == object.name ? nil : object.makeAndModel, space?.name].compactMap { $0 }.joined(separator: " · "))
                .dsText(.callout).foregroundStyle(DSColor.textSecondary).padding(.top, 6)
            HStack(spacing: 10) {
                Button(L10n.string("look.yes"), action: onYes).buttonStyle(.dsPrimary)
                Button(L10n.string("look.no"), action: onNo).buttonStyle(.ds(.secondary, fullWidth: true))
            }
            .padding(.top, DS.Space.s5)
        }
    }
}

/// "I don't know this yet." — after 2.5 s without a lock. Remember it, or search similar.
@MainActor
struct LookUnknownSheet: View {
    var onRemember: () -> Void
    var onSearch: () -> Void

    var body: some View {
        LookSheetFrame {
            Text(L10n.string("look.unknown.title")).dsText(.title1).foregroundStyle(DSColor.textPrimary)
            Text(L10n.string("look.unknown.sub")).dsText(.callout).foregroundStyle(DSColor.textSecondary).padding(.top, 6)
            Button { onRemember() } label: { Label(L10n.string("look.unknown.cta"), systemImage: "plus") }
                .buttonStyle(.dsSignal).padding(.top, DS.Space.s5)
            Button(L10n.string("look.unknown.secondary"), action: onSearch).buttonStyle(.ds(.ghost, fullWidth: true))
        }
    }
}

/// The camera failed or the scene could not be read: retry, or choose the object by hand.
@MainActor
struct LookErrorSheet: View {
    var onRetry: () -> Void
    var onManual: () -> Void

    var body: some View {
        LookSheetFrame {
            Text(L10n.string("look.error.title")).dsText(.title1).foregroundStyle(DSColor.textPrimary)
            Text(L10n.string("look.error.sub")).dsText(.callout).foregroundStyle(DSColor.textSecondary).padding(.top, 6)
            HStack(spacing: 10) {
                Button(L10n.string("look.error.retry"), action: onRetry).buttonStyle(.dsPrimary)
                Button(L10n.string("look.error.manual"), action: onManual).buttonStyle(.ds(.secondary, fullWidth: true))
            }
            .padding(.top, DS.Space.s5)
        }
    }
}

/// Camera permission was refused earlier: the only fix is Settings, or searching by hand.
@MainActor
struct LookDeniedSheet: View {
    var onSettings: () -> Void
    var onManual: () -> Void

    var body: some View {
        LookSheetFrame {
            Text(L10n.string("look.denied.title")).dsText(.title1).foregroundStyle(DSColor.textPrimary)
            Text(L10n.string("look.denied.sub")).dsText(.callout).foregroundStyle(DSColor.textSecondary).padding(.top, 6)
            HStack(spacing: 10) {
                Button(L10n.string("permission.settings"), action: onSettings).buttonStyle(.dsPrimary)
                Button(L10n.string("look.error.manual"), action: onManual).buttonStyle(.ds(.secondary, fullWidth: true))
            }
            .padding(.top, DS.Space.s5)
        }
    }
}

/// Shared padding and background for the small Look sheets.
@MainActor
struct LookSheetFrame<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 0) { content() }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, DS.Space.gutter)
            .padding(.top, DS.Space.s6)
            .padding(.bottom, DS.Space.s8)
            .background(DSColor.backgroundElevated)
    }
}
