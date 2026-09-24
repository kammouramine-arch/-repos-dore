import SwiftUI
import DoOnceCore

/// A capsule with a small round photograph and a name: spaces on Memory, shared spaces in Household.
@MainActor
struct PhotoChip: View {
    var text: String
    var media: MediaRef?
    var body: some View {
        HStack(spacing: DS.Space.s2) {
            MediaView(ref: media).frame(width: 32, height: 32).clipShape(Circle())
            Text(text).font(.ds(.subheadline)).fontWeight(.medium).foregroundStyle(DSColor.textPrimary)
        }
        .padding(.leading, 4).padding(.trailing, 14)
        .frame(height: 40)
        .background(DSColor.fillSubtle, in: Capsule())
    }
}

/// A capsule with an initials avatar, a name and a faint count: people on Memory.
@MainActor
struct PersonChip: View {
    var person: Person
    var count: Int
    var body: some View {
        HStack(spacing: DS.Space.s2) {
            DSAvatar(initials: person.initials, size: 32)
            Text(person.displayName).font(.ds(.subheadline)).fontWeight(.medium).foregroundStyle(DSColor.textPrimary)
            Text("· \(count)").font(.ds(.subheadline)).foregroundStyle(DSColor.textTertiary)
        }
        .padding(.leading, 4).padding(.trailing, 14)
        .frame(height: 40)
        .background(DSColor.fillSubtle, in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(person.displayName)
        .accessibilityValue(L10n.plural("object.procedures", n: count))
    }
}
