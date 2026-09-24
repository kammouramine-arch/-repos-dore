import SwiftUI

/// Small status / filter capsule.
struct DSChip: View {
    enum Tone { case neutral, selected, signal, warning, danger, onMedia }
    var text: String
    var systemImage: String? = nil
    var tone: Tone = .neutral

    var body: some View {
        HStack(spacing: 6) {
            if let systemImage { Image(systemName: systemImage).font(.system(size: 13, weight: .semibold)) }
            Text(text).font(.system(size: 15, weight: .medium))
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 34)
        .foregroundStyle(foreground)
        .background(background)
        .clipShape(Capsule())
    }

    private var foreground: Color {
        switch tone {
        case .neutral: DSColor.textPrimary
        case .selected: DSColor.textOnInverse
        case .signal: DSColor.signalText
        case .warning: DSColor.warningText
        case .danger: DSColor.danger
        case .onMedia: DSColor.textOnMedia
        }
    }

    @ViewBuilder private var background: some View {
        switch tone {
        case .neutral: DSColor.fillSubtle
        case .selected: DSColor.backgroundInverse
        case .signal: DSColor.signalSoft
        case .warning: DSColor.warningSoft
        case .danger: DSColor.dangerSoft
        case .onMedia: DSGlass(style: .onMedia)
        }
    }
}

/// Initials avatar for people. Never a photo without explicit consent.
struct DSAvatar: View {
    var initials: String
    var size: CGFloat = DS.Size.avatar
    var body: some View {
        Text(initials)
            .font(.system(size: size * 0.38, weight: .semibold))
            .tracking(-0.2)
            .foregroundStyle(DSColor.textPrimary)
            .frame(width: size, height: size)
            .background(DSColor.fillMedium, in: Circle())
    }
}

/// "Looking…" pill over camera.
struct DSStatusPill: View {
    var text: String
    var pulsing = true
    @State private var dim = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        HStack(spacing: 8) {
            if pulsing {
                Circle().fill(DSColor.textOnMedia).frame(width: 6, height: 6)
                    .opacity(dim ? 0.25 : 0.7).scaleEffect(dim ? 0.7 : 1)
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: dim)
                    .onAppear { dim = true }
            }
            Text(text).font(.system(size: 14, weight: .semibold)).foregroundStyle(DSColor.textOnMedia)
        }
        .padding(.horizontal, 14).frame(height: 36)
        .background(DSGlass(style: .onMedia)).clipShape(Capsule())
    }
}
