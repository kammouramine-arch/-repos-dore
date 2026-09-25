import AVFoundation
import SwiftUI
import UIKit

/// The live preview layer, portrait, aspect-fill. Taps are converted to device points and passed
/// back so the session can focus and expose there.
struct CameraPreview: UIViewRepresentable {
    let session: CameraSession
    var onTap: ((CGPoint) -> Void)? = nil

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        view.previewLayer.session = session.engine.session
        view.previewLayer.videoGravity = .resizeAspectFill
        if let connection = view.previewLayer.connection, connection.isVideoRotationAngleSupported(90) {
            connection.videoRotationAngle = 90
        }
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.tapped(_:)))
        view.addGestureRecognizer(tap)
        context.coordinator.view = view
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        context.coordinator.onTap = onTap
    }

    func makeCoordinator() -> Coordinator { Coordinator(onTap: onTap) }

    final class Coordinator: NSObject {
        var onTap: ((CGPoint) -> Void)?
        weak var view: PreviewView?
        init(onTap: ((CGPoint) -> Void)?) { self.onTap = onTap }

        @objc func tapped(_ gesture: UITapGestureRecognizer) {
            guard let view else { return }
            let point = gesture.location(in: view)
            onTap?(view.previewLayer.captureDevicePointConverted(fromLayerPoint: point))
        }
    }

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}

/// Preview plus the calm layers around it: a sunken cover until the first frame (motion spec §4),
/// an interruption notice, and a failure state with a retry. Used by Look, Teach and Add.
struct CameraSurface: View {
    let session: CameraSession
    var onTapFocus = true
    var onRetry: (() -> Void)? = nil

    var body: some View {
        ZStack {
            CameraPreview(session: session, onTap: onTapFocus ? { session.focus(atDevicePoint: $0) } : nil)
                .ignoresSafeArea()
            DSColor.backgroundSunken
                .ignoresSafeArea()
                .opacity(session.isReceivingFrames ? 0 : 1)
                .allowsHitTesting(false)
            switch session.state {
            case .interrupted:
                notice(L10n.string("error.camera.interrupted"))
            case .failed:
                notice(L10n.string("error.camera.title"), sub: L10n.string("error.camera.sub"), retry: onRetry ?? { session.start() })
            default:
                EmptyView()
            }
        }
        .background(DSColor.backgroundSunken)
    }

    private func notice(_ title: String, sub: String? = nil, retry: (() -> Void)? = nil) -> some View {
        VStack(spacing: DS.Space.s3) {
            Text(title).dsText(.headline).foregroundStyle(DSColor.textOnMedia).multilineTextAlignment(.center)
            if let sub { Text(sub).dsText(.subheadline).foregroundStyle(DSColor.textOnMedia.opacity(0.75)).multilineTextAlignment(.center) }
            if let retry {
                Button(L10n.string("error.retry"), action: retry).buttonStyle(.dsOnMediaSmall)
            }
        }
        .padding(DS.Space.s6)
        .frame(maxWidth: 320)
        .background { DSGlass(style: .onMedia).clipShape(RoundedRectangle(cornerRadius: DS.Radius.large, style: .continuous)) }
        .padding(DS.Space.gutter)
        .transition(.opacity)
    }
}
