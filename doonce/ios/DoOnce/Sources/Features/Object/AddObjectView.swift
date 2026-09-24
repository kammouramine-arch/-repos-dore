import DoOnceCore
import SwiftUI
import UIKit

/// Add: remember an object without a procedure. Two captures from two angles (they become the
/// reference images and embeddings), then the same creation screen as after Teach.
struct AddObjectView: View {
    @Environment(AppState.self) private var app
    @Environment(Router.self) private var router
    @State private var camera = CameraSession()
    @State private var captures: [MediaRef] = []
    @State private var flash = false
    @State private var toast: String?
    @State private var create = false
    @State private var denied = false
    private let batch = UUID()

    var body: some View {
        ZStack {
            if create {
                ObjectCreateView(images: captures, add: true).transition(.opacity)
            } else {
                cameraStage.transition(.opacity)
            }
        }
        .background(DSColor.backgroundSunken.ignoresSafeArea())
        .task { await begin() }
        .onDisappear { camera.stop() }
    }

    private var cameraStage: some View {
        ZStack(alignment: .top) {
            CameraSurface(session: camera)
            Color.white.ignoresSafeArea().opacity(flash ? 0.7 : 0).allowsHitTesting(false)
            VStack(spacing: 18) {
                Spacer()
                if let toast {
                    LocalToast(text: toast).transition(.opacity.combined(with: .offset(y: 8)))
                }
                VStack(spacing: 6) {
                    Text(L10n.string("addObject.hint")).dsText(.title2).foregroundStyle(DSColor.textOnMedia)
                    Text(L10n.string("addObject.hintSub")).dsText(.subheadline).foregroundStyle(DSColor.textOnMedia.opacity(0.8))
                }
                .multilineTextAlignment(.center)
                .shadow(color: .black.opacity(0.5), radius: 12, y: 1)
                RecordButton(isRecording: false, capture: true) { capture() }
                    .padding(.bottom, 46)
            }
            .padding(.horizontal, DS.Space.gutter)
            .dsAnimation(DSMotion.standard(0.2), value: toast)
            DSTopBar(leading: .close, onMedia: true, onLeading: { router.dismissFullScreen() })
            if denied {
                TeachErrorView(title: L10n.string("permission.camera.title"), sub: L10n.string("look.denied.sub"),
                               onRetry: { if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) } },
                               onClose: { router.dismissFullScreen() })
            }
        }
    }

    private func begin() async {
        switch await PermissionsService.status(.camera) {
        case .undetermined:
            router.dismissFullScreen()
            router.show(.permission(.camera, then: .addObject))
        case .denied:
            denied = true
        case .granted:
            camera.start()
        }
    }

    /// Grabs the current frame from the video output (no photo output, so nothing blocks the
    /// preview), writes it as a reference image and asks for one more angle.
    private func capture() {
        guard let image = camera.snapshot() else { return }
        app.haptics.play(.light)
        withAnimation(.easeOut(duration: 0.08)) { flash = true }
        Task { try? await Task.sleep(for: .milliseconds(80)); withAnimation(.easeIn(duration: 0.08)) { flash = false } }
        let url = RecordingFiles.objectImageURL(batch, index: captures.count)
        guard (try? FrameImage.writeJPEG(image, to: url)) != nil else { return }
        captures.append(MediaRef(kind: .image, localURL: url))
        if captures.count == 1 {
            toast = L10n.string("addObject.oneMore")
            Task { try? await Task.sleep(for: .milliseconds(1400)); toast = nil }
        } else {
            camera.stop()
            withDSAnimation(DSMotion.crossfade) { create = true }
        }
    }
}

/// A small glass toast over the camera. Local to Add; not a global notification pattern.
struct LocalToast: View {
    var text: String
    var body: some View {
        Text(text).font(.system(size: 14, weight: .semibold)).foregroundStyle(DSColor.textOnMedia)
            .padding(.horizontal, 14).frame(height: 36)
            .background(DSGlass(style: .onMedia)).clipShape(Capsule())
            .accessibilityAddTraits(.updatesFrequently)
    }
}
