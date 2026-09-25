import SwiftUI

/// A photograph that is the UI: image edge-to-edge, scrim, title and subtitle at the bottom.
/// Used for objects ("Recently around you"), spaces and the Continue card.
struct DSPhotoCard<Media: View>: View {
    var title: String
    var subtitle: String? = nil
    var cornerRadius: CGFloat = DS.Radius.large
    var titleSize: CGFloat = 22
    var progress: Double? = nil
    @ViewBuilder var media: () -> Media

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            media()
            LinearGradient(stops: [
                .init(color: .black.opacity(0.72), location: 0),
                .init(color: .black.opacity(0.28), location: 0.4),
                .init(color: .clear, location: 0.7),
            ], startPoint: .bottom, endPoint: .top)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(size: titleSize, weight: .bold)).tracking(-0.4).lineLimit(2)
                if let subtitle { Text(subtitle).font(.system(size: 15)).opacity(0.78).lineLimit(1) }
                if let progress {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.25))
                            Capsule().fill(DSColor.signal).frame(width: geo.size.width * progress)
                        }
                    }
                    .frame(height: 3).padding(.top, 9)
                }
            }
            .foregroundStyle(DSColor.textOnMedia)
            .padding(18)
        }
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}

/// List row: thumbnail, title, subtitle, trailing accessory. Rows are separated by a hairline, not boxes.
struct DSRow<Leading: View, Trailing: View>: View {
    var title: String
    var subtitle: String? = nil
    var wrapTitle = false
    @ViewBuilder var leading: () -> Leading
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack(spacing: 14) {
            leading()
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.system(size: 17, weight: .semibold)).tracking(-0.17).lineLimit(wrapTitle ? 2 : 1)
                if let subtitle { Text(subtitle).font(.system(size: 15)).foregroundStyle(DSColor.textSecondary).lineLimit(2) }
            }
            Spacer(minLength: 8)
            trailing()
        }
        .padding(.vertical, 12)
        .frame(minHeight: 64)
        .contentShape(Rectangle())
    }
}

extension DSRow where Trailing == DSChevron {
    init(title: String, subtitle: String? = nil, wrapTitle: Bool = false, @ViewBuilder leading: @escaping () -> Leading) {
        self.init(title: title, subtitle: subtitle, wrapTitle: wrapTitle, leading: leading, trailing: { DSChevron() })
    }
}

struct DSChevron: View {
    var body: some View {
        Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(DSColor.textTertiary)
    }
}

/// Grouped list container (settings, about).
struct DSList<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        VStack(spacing: 0) { content() }
            .padding(.horizontal, DS.Space.s4)
            .background(DSColor.backgroundElevated, in: RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
    }
}

struct DSSeparator: View {
    var body: some View { Rectangle().fill(DSColor.separator).frame(height: 1) }
}

/// Inline message: warning, danger, signal (success) or neutral (provenance notes).
struct DSCallout: View {
    enum Tone { case warning, danger, signal, neutral }
    var tone: Tone
    var systemImage: String
    var text: Text

    init(_ tone: Tone, systemImage: String, _ text: Text) { self.tone = tone; self.systemImage = systemImage; self.text = text }
    init(_ tone: Tone, systemImage: String, _ string: String) { self.init(tone, systemImage: systemImage, Text(string)) }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: systemImage).font(.system(size: 17, weight: .medium)).padding(.top, 1)
            text.font(.system(size: 15)).lineSpacing(3)
        }
        .foregroundStyle(foreground)
        .padding(.horizontal, 16).padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background, in: RoundedRectangle(cornerRadius: DS.Radius.medium, style: .continuous))
    }

    private var foreground: Color {
        switch tone { case .warning: DSColor.warningText; case .danger: DSColor.danger; case .signal: DSColor.signalText; case .neutral: DSColor.textSecondary }
    }
    private var background: Color {
        switch tone { case .warning: DSColor.warningSoft; case .danger: DSColor.dangerSoft; case .signal: DSColor.signalSoft; case .neutral: DSColor.fillSubtle }
    }
}

/// Section heading used on Memory and object pages.
struct DSSectionHeader: View {
    var title: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).dsText(.title2)
            Spacer()
            if let actionTitle, let action {
                Button(actionTitle, action: action).font(.system(size: 15, weight: .medium)).foregroundStyle(DSColor.textSecondary)
            }
        }
        .padding(.bottom, DS.Space.s3)
    }
}

/// Uppercase eyebrow. Use rarely.
struct DSEyebrow: View {
    var text: String
    var body: some View {
        Text(text.uppercased()).font(.system(size: 11, weight: .semibold)).tracking(0.66).foregroundStyle(DSColor.textTertiary)
    }
}

/// Step progress segments for Do mode.
struct DSSegments: View {
    var total: Int
    var current: Int // 0-based
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<max(total, 1), id: \.self) { i in
                Capsule()
                    .fill(i < current ? DSColor.signal : (i == current ? DSColor.textOnMedia : DSColor.textOnMedia.opacity(0.35)))
                    .frame(width: 22, height: 3)
                    .animation(DSMotion.snappy, value: current)
            }
        }
    }
}
