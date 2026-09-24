import SwiftUI
import DoOnceCore

/// Maps `Route` to feature views (pushed).
struct RouteView: View {
    let route: Route
    var body: some View {
        switch route {
        case .object(let id): ObjectDetailView(objectID: id)
        case .procedure(let id): ProcedureDetailView(memoryID: id)
        case .space(let id): SpaceDetailView(spaceID: id)
        case .person(let id): PersonDetailView(personID: id)
        case .spaces: SpacesView()
        case .people: PeopleView()
        case .search(let q): SearchView(initialQuery: q)
        case .household: HouseholdView()
        case .notifications: NotificationsView()
        case .settings: SettingsView()
        case .privacy: PrivacyView()
        case .haptics: HapticsSettingsView()
        case .subscription: SubscriptionView()
        case .qrImport: QRImportView()
        }
    }
}

/// Maps `FullScreenRoute` to camera / Do surfaces.
struct FullScreenRouteView: View {
    let route: FullScreenRoute
    var body: some View {
        switch route {
        case .look: LookView()
        case .teach(let objectID): TeachView(objectID: objectID)
        case .addObject: AddObjectView()
        case .doMode(let memoryID, let startStep): DoModeView(memoryID: memoryID, startStep: startStep)
        case .processing(let recordingID): ProcessingView(recordingID: recordingID)
        }
    }
}

/// Maps `SheetRoute` to sheets.
struct SheetRouteView: View {
    let route: SheetRoute
    var body: some View {
        switch route {
        case .paywall: PaywallView().presentationDetents([.large]).presentationCornerRadius(DS.Radius.sheet)
        case .share(let objectID, let memoryID): ShareView(objectID: objectID, memoryID: memoryID).presentationDetents([.medium, .large]).presentationCornerRadius(DS.Radius.sheet)
        case .permission(let kind, let then): PermissionEducationView(kind: kind, then: then).presentationDetents([.height(420)]).presentationCornerRadius(DS.Radius.sheet)
        case .seeOriginal(let memoryID, let at): SeeOriginalView(memoryID: memoryID, at: at).presentationDetents([.medium]).presentationCornerRadius(DS.Radius.sheet)
        }
    }
}
