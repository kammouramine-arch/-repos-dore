import SwiftUI

/// Object cards open into their passport with a zoom (matched geometry) on iOS 18, and a plain push
/// before that. The namespace is owned by the Memory root and shared here because pushed
/// destinations are built by `RouteView`, outside the root's view tree.
@MainActor
enum ZoomTransition {
    static var namespace: Namespace.ID?
}

extension View {
    /// Marks a card as the source of the zoom into `id`'s destination.
    @MainActor @ViewBuilder
    func zoomSource<ID: Hashable>(id: ID) -> some View {
        if #available(iOS 18.0, *), let namespace = ZoomTransition.namespace {
            self.matchedTransitionSource(id: id, in: namespace)
        } else {
            self
        }
    }

    /// Applied at the root of a pushed destination that a `zoomSource` opened.
    @MainActor @ViewBuilder
    func zoomDestination<ID: Hashable>(id: ID) -> some View {
        if #available(iOS 18.0, *), let namespace = ZoomTransition.namespace {
            self.navigationTransition(.zoom(sourceID: id, in: namespace))
        } else {
            self
        }
    }
}
