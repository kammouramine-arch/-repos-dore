import SwiftUI
import DoOnceCore

/// The passport hero: 440 pt of photograph, name and make · space at the foot.
@MainActor
struct ObjectHero: View {
    var object: PhysicalObject
    var spaceName: String?

    @Environment(AppState.self) private var app

    var body: some View {
        PhotoHero(media: app.heroMedia(for: object), title: object.name, subtitle: subtitle, height: 440)
    }

    private var subtitle: String {
        var parts: [String] = []
        if object.makeAndModel != object.name { parts.append(object.makeAndModel) }
        if let spaceName { parts.append(spaceName) }
        return parts.joined(separator: " · ")
    }
}

/// "Last confirmed 20 September 2026" and, when the policy says so, "Check whether this is still accurate."
@MainActor
struct FreshnessCallout: View {
    var lastConfirmed: Date
    var needsCheck: Bool

    init?(memories: [Memory], policy: FreshnessPolicy = FreshnessPolicy(), now: Date = Date()) {
        guard let latest = memories.map(\.lastKnownAccurateAt).max() else { return nil }
        lastConfirmed = latest
        needsCheck = !policy.memoriesNeedingCheck(in: memories, now: now).isEmpty
    }

    var body: some View {
        let first = Text(L10n.string("object.lastConfirmed", ["date": DSFormat.longDay(lastConfirmed)]))
        let text = needsCheck ? first + Text("\n") + Text(L10n.string("object.checkAccuracy")).foregroundStyle(DSColor.textSecondary.opacity(0.8)) : first
        DSCallout(needsCheck ? .warning : .neutral, systemImage: "calendar", text)
    }
}

/// "Need Julien again?" with the three ways to reach the person who services this object.
@MainActor
struct NeedAgainCard: View {
    var contact: ServiceContact

    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: DS.Space.s3) {
            Text(L10n.string("object.needAgain", ["person": contact.name])).dsText(.headline).foregroundStyle(DSColor.textPrimary)
            HStack(spacing: DS.Space.s2) {
                action(L10n.string("object.call"), "phone", url: contact.phone.flatMap { URL(string: "tel:" + $0.filter { !$0.isWhitespace }) })
                action(L10n.string("object.message"), "message", url: contact.phone.flatMap { URL(string: "sms:" + $0.filter { !$0.isWhitespace }) })
                action(L10n.string("object.book"), "calendar", url: contact.email.flatMap { URL(string: "mailto:" + $0) })
            }
        }
        .padding(DS.Space.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DSColor.backgroundElevated, in: RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous))
    }

    private func action(_ title: String, _ symbol: String, url: URL?) -> some View {
        Button { if let url { openURL(url) } } label: {
            Label(title, systemImage: symbol).lineLimit(1).minimumScaleFactor(0.8).frame(maxWidth: .infinity)
        }
        .buttonStyle(.ds(.secondary, size: .small, fullWidth: true))
        .disabled(url == nil)
    }
}

/// About: installed, model, service provider, last service, manual, warranty. Missing facts read "Add".
@MainActor
struct AboutList: View {
    var object: PhysicalObject

    var body: some View {
        let contact = object.serviceContacts.first
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: L10n.string("object.about"))
            DSList {
                ValueRow(title: L10n.string("object.installed"), value: object.metadata["Installed"] ?? L10n.string("common.add"))
                DSSeparator()
                ValueRow(title: L10n.string("object.model"), value: object.makeAndModel)
                DSSeparator()
                ValueRow(title: L10n.string("object.serviceProvider"), value: contact?.name ?? L10n.string("common.add"))
                DSSeparator()
                ValueRow(title: L10n.string("object.lastService"), value: contact?.lastServiceAt.map(DSFormat.longDay) ?? L10n.string("common.add"))
                DSSeparator()
                ValueRow(title: L10n.string("object.manual"), value: object.metadata["Manual"] ?? L10n.string("common.add"))
                DSSeparator()
                ValueRow(title: L10n.string("object.warranty"), value: object.metadata["Warranty"] ?? L10n.string("common.add"))
            }
        }
    }
}
