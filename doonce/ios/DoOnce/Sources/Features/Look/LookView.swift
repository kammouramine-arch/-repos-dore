import DoOnceCore
import SwiftUI
import UIKit

/// Look: the camera is the interface. Point it at something and DoOnce says whether it knows it,
/// with the recognition sequence as the signature moment. Every other outcome (maybe, unknown,
/// camera failed) has its own calm sheet; the preview never freezes silently.
@MainActor
struct LookView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var model = LookModel()

    var body: some View {
        @Bindable var model = model
        GeometryReader { geo in
            ZStack(alignment: .top) {
                CameraSurface(session: model.camera, onRetry: { model.retry() })
                overlay(in: geo.size)
                DSTopBar(leading: .close, onMedia: true, onLeading: { router.dismissFullScreen() }) {
                    Button { app.haptics.play(.selection); model.camera.toggleTorch() } label: {
                        Image(systemName: model.camera.isTorchOn ? "flashlight.on.fill" : "flashlight.off.fill").font(.system(size: 17, weight: .semibold))
                    }
                    .buttonStyle(.dsOnMediaIcon)
                    .accessibilityLabel(L10n.string("look.torch"))
                }
                VStack {
                    Spacer()
                    DSStatusPill(text: L10n.string("look.looking"))
                        .opacity(model.showsStatus ? 1 : 0)
                        .animation(DSMotion.standard(0.2), value: model.showsStatus)
                        .padding(.bottom, DS.Space.s12)
                }
            }
        }
        .background(DSColor.backgroundSunken)
        .ignoresSafeArea(.keyboard)
        .task { await model.begin(app: app, router: router) }
        .onDisappear { model.end() }
        .sheet(item: $model.sheet, onDismiss: { model.sheetDismissed() }) { sheet in
            sheetContent(sheet)
                .presentationCornerRadius(DS.Radius.sheet)
                .presentationDragIndicator(.visible)
        }
    }

    @ViewBuilder
    private func overlay(in size: CGSize) -> some View {
        if let target = model.target {
            let region = model.viewRect(for: target.region, in: size)
            RecognitionOverlay(
                region: region,
                canvasSize: size,
                title: target.object.makeAndModel,
                subtitle: L10n.plural("object.procedures", n: app.memories(for: target.object).count),
                uncertain: target.uncertain,
                dots: model.dots(excluding: target.object.id, in: size),
                onLocked: { model.locked() },
                onDotTap: { model.retarget(to: $0) }
            )
            .id(target.object.id)
            .transition(.opacity)
        }
    }

    @ViewBuilder
    private func sheetContent(_ sheet: LookModel.Sheet) -> some View {
        switch sheet {
        case .recognised(let object):
            RecognisedObjectSheet(object: object, onViewObject: { open(.object(object.id)) }, onStart: { start($0) }, onOpenMemory: { open(.procedure($0)) })
                .presentationDetents([.fraction(0.55), .large])
                .presentationBackgroundInteraction(.enabled(upThrough: .fraction(0.55)))
        case .uncertain(let object):
            LookUncertainSheet(object: object, space: app.space(object.spaceID), onYes: { model.confirm() }, onNo: { model.deny() })
                .presentationDetents([.height(236)])
        case .unknown:
            LookUnknownSheet(onRemember: { model.sheet = nil; present(.addObject(existingObjectID: nil)) }, onSearch: { open(.search(initialQuery: model.suggestedCategory ?? "")) })
                .presentationDetents([.height(290)])
        case .error:
            LookErrorSheet(onRetry: { model.retry() }, onManual: { open(.search(initialQuery: "")) })
                .presentationDetents([.height(236)])
        case .denied:
            LookDeniedSheet(onSettings: { openSettings() }, onManual: { open(.search(initialQuery: "")) })
                .presentationDetents([.height(236)])
                .interactiveDismissDisabled()
        }
    }

    // MARK: Navigation out of the camera

    private func open(_ route: Route) {
        model.sheet = nil
        router.dismissFullScreen()
        router.push(route)
    }

    private func present(_ route: FullScreenRoute) {
        router.dismissFullScreen()
        Task { try? await Task.sleep(for: .milliseconds(380)); router.present(route) }
    }

    private func start(_ memoryID: UUID) {
        app.haptics.play(.medium)
        model.sheet = nil
        present(.doMode(memoryID: memoryID, startStep: 1))
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
    }
}

/// Look's state: camera, live recogniser and which sheet is up. Kept out of the view so the
/// recognition rules read as one flow.
@MainActor
@Observable
final class LookModel {
    struct Target: Equatable {
        var object: PhysicalObject
        var region: CGRect?
        var uncertain: Bool
    }

    enum Sheet: Identifiable {
        case recognised(PhysicalObject), uncertain(PhysicalObject), unknown, error, denied
        var id: String {
            switch self {
            case .recognised(let o): "recognised-\(o.id)"
            case .uncertain(let o): "uncertain-\(o.id)"
            case .unknown: "unknown"
            case .error: "error"
            case .denied: "denied"
            }
        }
    }

    let camera = CameraSession()
    private(set) var recogniser: LiveRecogniser?
    private(set) var target: Target?
    var sheet: Sheet?
    private var app: AppState?
    private var watcher: Task<Void, Never>?
    private var hasTracked = false

    var showsStatus: Bool { target == nil && sheet == nil && camera.isReceivingFrames }
    var suggestedCategory: String? { recogniser?.latest?.result.suggestedCategory }

    func begin(app: AppState, router: Router) async {
        self.app = app
        switch await PermissionsService.status(.camera) {
        case .undetermined:
            router.dismissFullScreen()
            router.show(.permission(.camera, then: .look))
            return
        case .denied:
            sheet = .denied
            return
        case .granted:
            break
        }
        let recogniser = LiveRecogniser(source: VisionRecognitionService(), objects: app.objects)
        self.recogniser = recogniser
        camera.engine.onVideoFrame = { buffer in recogniser.submit(buffer) }
        camera.start()
        app.haptics.prepare()
        watch()
    }

    func end() {
        watcher?.cancel()
        camera.engine.onVideoFrame = nil
        camera.stop()
    }

    /// Reacts to recogniser output. Polling the observable at 60 ms keeps this free of Combine and
    /// cheap: the recogniser itself only samples every 350 ms.
    private func watch() {
        watcher?.cancel()
        watcher = Task { [weak self] in
            var seen: LiveRecogniser.Output = .searching
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(60))
                guard let self, let recogniser = self.recogniser else { return }
                // A camera that could not start is reported by the camera surface itself (with
                // its own retry); the sheets are for what the camera saw.
                let output = recogniser.output
                guard output != seen else { continue }
                seen = output
                self.apply(output)
            }
        }
    }

    private func apply(_ output: LiveRecogniser.Output) {
        switch output {
        case .searching:
            withDSAnimation(DSMotion.crossfade) { target = nil }
        case .exact(let sighting):
            guard let object = object(for: sighting) else { return }
            withDSAnimation(DSMotion.crossfade) { target = Target(object: object, region: sighting.region, uncertain: false) }
            trackFirstRecognition()
        case .category(let sighting):
            guard let object = object(for: sighting) else { sheet = .unknown; return }
            withDSAnimation(DSMotion.crossfade) { target = Target(object: object, region: sighting.region, uncertain: true) }
        case .unknown:
            sheet = .unknown
        case .failed:
            sheet = .error
        }
    }

    /// Called by the overlay once the sequence has landed (640 ms).
    func locked() {
        guard let target else { return }
        if target.uncertain {
            app?.haptics.play(.warning)
            sheet = .uncertain(target.object)
        } else {
            sheet = .recognised(target.object)
        }
    }

    func confirm() {
        guard let target, let recogniser else { return }
        sheet = nil
        self.target = nil
        recogniser.lock(onto: target.object.id)
        // A fresh Target replays the full sequence, this time with the pulse.
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(120))
            if case .exact(let sighting) = recogniser.output, let object = object(for: sighting) {
                self.target = Target(object: object, region: sighting.region, uncertain: false)
            }
        }
    }

    func deny() {
        Task { await app?.services.analytics.track(.recognitionCorrection(from: .category)) }
        app?.haptics.play(.selection)
        target = nil
        recogniser?.reject()
        sheet = nil
        Task { @MainActor in try? await Task.sleep(for: .milliseconds(300)); self.sheet = .unknown }
    }

    func retarget(to objectID: UUID) {
        app?.haptics.play(.selection)
        target = nil
        recogniser?.lock(onto: objectID)
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(80))
            if let recogniser, case .exact(let sighting) = recogniser.output, let object = object(for: sighting) {
                self.target = Target(object: object, region: sighting.region, uncertain: false)
            }
        }
    }

    func retry() {
        sheet = nil
        target = nil
        recogniser?.reset()
        if camera.state.isFailed || camera.state == .idle { camera.start() }
    }

    /// Swiping a sheet away returns to looking.
    func sheetDismissed() {
        guard sheet == nil else { return }
        target = nil
        recogniser?.reset()
    }

    func viewRect(for region: CGRect?, in size: CGSize) -> CGRect {
        let fallback = CGRect(x: 0.2, y: 0.28, width: 0.6, height: 0.34)
        return PreviewGeometry.rect(for: region ?? fallback, frameSize: camera.frameSize, in: size)
    }

    func dots(excluding objectID: UUID, in size: CGSize) -> [RecognitionDot] {
        guard let recogniser, let app else { return [] }
        return recogniser.recentRegions.compactMap { id, region in
            guard id != objectID, let object = app.object(id) else { return nil }
            let rect = PreviewGeometry.rect(for: region, frameSize: camera.frameSize, in: size)
            return RecognitionDot(id: id, name: object.name, point: CGPoint(x: rect.midX, y: rect.midY))
        }
    }

    private func object(for sighting: LiveRecogniser.Sighting) -> PhysicalObject? {
        guard let best = sighting.result.best else { return nil }
        return app?.object(best.objectID)
    }

    private func trackFirstRecognition() {
        guard !hasTracked else { return }
        hasTracked = true
        Task { await app?.services.analytics.track(.firstLookRecognition) }
    }
}
