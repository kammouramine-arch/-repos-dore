import SwiftUI
import Observation
import DoOnceCore

/// Destinations pushed inside the Memory or You stacks.
enum Route: Hashable {
    case object(UUID)
    case procedure(UUID)
    case space(UUID)
    case person(UUID)
    case spaces
    case people
    case search(initialQuery: String)
    case household
    case notifications
    case settings
    case privacy
    case haptics
    case subscription
    case qrImport
    case services
}

/// Full-screen surfaces that replace the tab shell: camera modes and Do mode.
enum FullScreenRoute: Identifiable, Hashable {
    case look
    case teach(objectID: UUID?)
    /// `existingObjectID` set: "Add angle" from a passport, appending photos to that object.
    case addObject(existingObjectID: UUID?)
    case doMode(memoryID: UUID, startStep: Int)
    case processing(recordingID: UUID)
    var id: Self { self }
}

/// Sheets.
enum SheetRoute: Identifiable, Hashable {
    case paywall
    case share(objectID: UUID, memoryID: UUID?)
    case permission(PermissionKind, then: FullScreenRoute?)
    case seeOriginal(memoryID: UUID, at: TimeInterval)
    var id: Self { self }
}

enum PermissionKind: Hashable { case camera, microphone, photos, notifications }

enum Tab: Hashable { case memory, you }

@MainActor
@Observable
final class Router {
    var tab: Tab = .memory
    var memoryPath = NavigationPath()
    var youPath = NavigationPath()
    var fullScreen: FullScreenRoute?
    /// A sheet over the tab shell.
    var sheet: SheetRoute?
    /// A sheet over a full-screen surface (camera, Do): SwiftUI can only present from the cover itself.
    var coverSheet: SheetRoute?
    var isBloomOpen = false

    func push(_ route: Route) {
        switch tab {
        case .memory: memoryPath.append(route)
        case .you: youPath.append(route)
        }
    }
    func pop() {
        switch tab {
        case .memory: if !memoryPath.isEmpty { memoryPath.removeLast() }
        case .you: if !youPath.isEmpty { youPath.removeLast() }
        }
    }
    func popToRoot() {
        memoryPath = NavigationPath(); youPath = NavigationPath()
    }
    func present(_ route: FullScreenRoute) { isBloomOpen = false; fullScreen = route }
    func dismissFullScreen() { coverSheet = nil; fullScreen = nil }
    /// Shows a sheet wherever the user is: over the cover when one is up, else over the shell.
    func show(_ route: SheetRoute) {
        if fullScreen != nil { coverSheet = route } else { sheet = route }
    }
    /// After the current cover dismisses, present the next one (SwiftUI needs the gap).
    func replaceFullScreen(with route: FullScreenRoute) {
        dismissFullScreen()
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(Tokens.Duration.navigation))
            present(route)
        }
    }
    /// doonce://do/<memoryID> from the Live Activity or the Continue widget.
    func open(url: URL, app: AppState) {
        guard url.scheme == "doonce", url.host == "do",
              let id = UUID(uuidString: url.lastPathComponent), app.memory(id) != nil else { return }
        let next = app.progress.first { $0.memoryID == id }?.nextStepOrder ?? 1
        if fullScreen != nil { replaceFullScreen(with: .doMode(memoryID: id, startStep: next)) }
        else { present(.doMode(memoryID: id, startStep: next)) }
    }
}
