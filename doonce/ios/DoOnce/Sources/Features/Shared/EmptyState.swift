import SwiftUI

/// Centred empty state: the loop mark (or a symbol), a short title, a shorter reason, one action.
@MainActor
struct EmptyState<Action: View>: View {
    var symbol: String? = nil
    var title: String? = nil
    var subtitle: String? = nil
    @ViewBuilder var action: () -> Action

    var body: some View {
        VStack(spacing: DS.Space.s3) {
            if let symbol {
                Image(systemName: symbol).font(.system(size: 36, weight: .regular)).foregroundStyle(DSColor.textTertiary)
                    .frame(height: 48)
            } else {
                DSLoopMark(size: 48, color: DSColor.textTertiary)
            }
            if let title {
                Text(title).dsText(.title2).foregroundStyle(DSColor.textPrimary).multilineTextAlignment(.center)
            }
            if let subtitle {
                Text(subtitle).dsText(.body).foregroundStyle(DSColor.textSecondary).multilineTextAlignment(.center)
            }
            action().padding(.top, DS.Space.s1)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, DS.Space.s8)
    }
}

extension EmptyState where Action == EmptyView {
    init(symbol: String? = nil, title: String? = nil, subtitle: String? = nil) {
        self.init(symbol: symbol, title: title, subtitle: subtitle, action: { EmptyView() })
    }
}
