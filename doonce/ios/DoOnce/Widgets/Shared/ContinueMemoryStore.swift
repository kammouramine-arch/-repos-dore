import Foundation
import WidgetKit

/// The one thing the Continue widget needs: which memory is in progress and how far along it is.
///
/// Shared between the app and the widget through the app-group `UserDefaults`; when the group is not
/// entitled (tests, a build without the capability) every call is a silent no-op. Only a title and two
/// numbers cross the boundary; never media, transcripts or people.
struct ContinueMemoryStore {
    struct Entry: Codable, Hashable {
        var memoryID: UUID
        var title: String
        /// 1-based step the user will land on.
        var nextStep: Int
        var total: Int
        var updatedAt: Date

        var deepLink: URL { URL(string: "doonce://do/\(memoryID.uuidString)")! }
    }

    static let appGroup = "group.app.doonce"
    static let widgetKind = "ContinueMemory"
    static let shared = ContinueMemoryStore()

    private let defaults: UserDefaults?
    private let key = "continue.entry"

    init(defaults: UserDefaults? = UserDefaults(suiteName: ContinueMemoryStore.appGroup)) {
        self.defaults = defaults
    }

    var entry: Entry? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(Entry.self, from: data)
    }

    func save(_ entry: Entry) {
        guard let defaults, let data = try? JSONEncoder().encode(entry) else { return }
        defaults.set(data, forKey: key)
        WidgetCenter.shared.reloadTimelines(ofKind: Self.widgetKind)
    }

    func clear(memoryID: UUID) {
        guard let defaults, entry?.memoryID == memoryID else { return }
        defaults.removeObject(forKey: key)
        WidgetCenter.shared.reloadTimelines(ofKind: Self.widgetKind)
    }
}
