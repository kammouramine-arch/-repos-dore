import DoOnceCore
import Foundation

/// One line of the Settings "Services" page: what a service is really doing on this build.
///
/// Computed from `ServiceConfiguration`, never from a hard-coded table, so the page can only say
/// "Live" when the wiring in `AppState` actually chose the live implementation. Honest labels
/// are the point: a demo that looks live is worse than a demo that says so.
struct ServiceStatusEntry: Identifiable, Hashable, Sendable {
    enum Mode: Hashable, Sendable {
        case live, partial, demo, blocked

        var labelKey: String {
            switch self {
            case .live: "services.mode.live"
            case .partial: "services.mode.partial"
            case .demo: "services.mode.demo"
            case .blocked: "services.mode.blocked"
            }
        }
    }

    /// Copy key of the service name.
    let nameKey: String
    let mode: Mode
    /// Copy key of the one-line note.
    let noteKey: String

    var id: String { nameKey }
    var name: String { L10n.string(nameKey) }
    var note: String { L10n.string(noteKey) }
    var modeLabel: String { L10n.string(mode.labelKey) }
}

extension ServiceStatusEntry {
    /// The table for a configuration. `storageOnDisk` is false when `FileStore` could not open
    /// its directory and the session fell back to a temporary one.
    static func table(for configuration: ServiceConfiguration, storageOnDisk: Bool) -> [ServiceStatusEntry] {
        let live = configuration.isLive
        let gateway = configuration.gatewayURL != nil
        let products = !configuration.subscriptionProductIDs.isEmpty
        let upload = configuration.uploadEndpoint != nil
        return [
            ServiceStatusEntry(nameKey: "services.storage", mode: storageOnDisk ? .live : .blocked,
                               noteKey: storageOnDisk ? "services.note.storage" : "services.note.storage.volatile"),
            ServiceStatusEntry(nameKey: "services.transcription", mode: live ? .live : .demo,
                               noteKey: live ? "services.note.transcription.live" : "services.note.transcription.demo"),
            ServiceStatusEntry(nameKey: "services.analysis", mode: live ? (gateway ? .live : .blocked) : .demo,
                               noteKey: live ? (gateway ? "services.note.analysis.live" : "services.note.analysis.blocked") : "services.note.analysis.demo"),
            ServiceStatusEntry(nameKey: "services.recognition", mode: live ? .partial : .demo,
                               noteKey: live ? "services.note.recognition.live" : "services.note.recognition.demo"),
            ServiceStatusEntry(nameKey: "services.auth", mode: live ? .live : .demo,
                               noteKey: live ? "services.note.auth.live" : "services.note.auth.demo"),
            ServiceStatusEntry(nameKey: "services.subscription", mode: live ? (products ? .live : .blocked) : .demo,
                               noteKey: live ? (products ? "services.note.subscription.live" : "services.note.subscription.blocked") : "services.note.subscription.demo"),
            ServiceStatusEntry(nameKey: "services.upload", mode: upload ? .partial : .blocked,
                               noteKey: upload ? "services.note.upload.partial" : "services.note.upload.blocked"),
            ServiceStatusEntry(nameKey: "services.analytics", mode: .demo, noteKey: "services.note.analytics"),
        ]
    }
}
