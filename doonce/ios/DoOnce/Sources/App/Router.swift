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
}

/// Full-screen surfaces that replace the tab shell: camera modes and Do mode.
enum FullScreenRoute: Identifiable, Hashable {
    case look
    case teach(objectID: UUID?)
    case addObject
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
    var sheet: SheetRoute?
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
    func dismissFullScreen() { fullScreen = nil }
    func show(_ route: SheetRoute) { sheet = route }
}
