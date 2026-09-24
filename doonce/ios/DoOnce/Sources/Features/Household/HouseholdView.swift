import SwiftUI
import DoOnceCore

/// The household: who shares this world, an invitation, the spaces everyone sees, and the door out.
@MainActor
struct HouseholdView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var confirmLeave = false

    var body: some View {
        PushedScreen {
            VStack(alignment: .leading, spacing: 0) {
                PageTitle(text: app.household.name).padding(.top, DS.Space.s2)
                Text([L10n.plural("space.objects", n: app.objects.count), L10n.plural("memory.memoriesCount", n: app.memories.count)].joined(separator: " · "))
                    .dsText(.body).foregroundStyle(DSColor.textSecondary).padding(.top, 6)

                members.padding(.top, 28)
                ShareLink(item: inviteURL) {
                    Label(L10n.string("household.invite"), systemImage: "plus.square")
                }
                .buttonStyle(.ds(.secondary, fullWidth: true))
                .padding(.top, DS.Space.s3)

                DSEyebrow(text: L10n.string("household.sharedSpaces")).padding(.top, 28).padding(.bottom, DS.Space.s2)
                WrapLayout(spacing: DS.Space.s2) {
                    ForEach(app.spaces) { space in
                        Button { router.push(.space(space.id)) } label: {
                            PhotoChip(text: space.name, media: app.coverMedia(for: space))
                        }
                        .buttonStyle(.dsPressable)
                    }
                }

                DSList {
                    ActionRow(title: L10n.string("household.leave"), tone: DSColor.danger) { confirmLeave = true }
                }
                .padding(.top, 28)
            }
            .padding(.horizontal, DS.Space.gutter)
        }
        .confirmationDialog(L10n.string("household.leave.confirm", ["household": app.household.name]), isPresented: $confirmLeave, titleVisibility: .visible) {
            Button(L10n.string("household.leave"), role: .destructive) { HapticsService.shared.play(.warning) }
            Button(L10n.string("common.cancel"), role: .cancel) {}
        } message: {
            Text(L10n.string("household.leave.message"))
        }
    }

    private var members: some View {
        DSList {
            ForEach(Array(app.household.members.enumerated()), id: \.element.userID) { index, member in
                if index > 0 { DSSeparator() }
                let user = app.snapshot.users.first { $0.id == member.userID }
                let name = user?.displayName ?? L10n.string("nav.you")
                DSRow(title: name, subtitle: memberLine(member), leading: { DSAvatar(initials: name.initials) }, trailing: { EmptyView() })
                    .foregroundStyle(DSColor.textPrimary)
            }
        }
    }

    private func memberLine(_ member: HouseholdMember) -> String {
        let role: String
        switch member.role {
        case .owner: role = L10n.string("household.role.owner")
        case .member: role = L10n.string("household.role.member")
        case .viewer: role = L10n.string("household.role.viewer")
        }
        if member.userID == app.currentUser.id { return [role, L10n.string("household.you")].joined(separator: " · ") }
        let added = app.memories.filter { $0.creatorID == member.userID }.count
        return [role, L10n.plural("household.added", n: added)].joined(separator: " · ")
    }

    private var inviteURL: URL {
        URL(string: "https://doonce.app/join/\(app.household.id.uuidString.lowercased())") ?? URL(string: "https://doonce.app")!
    }
}
