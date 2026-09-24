import AVFoundation
import Observation
import SwiftUI
import UIKit

/// The camera as the UI sees it: a state the preview can react to, a torch, tap-to-focus, and
/// recovery from interruptions. Wraps a `CaptureEngine` and mirrors its events on the main actor.
///
/// Why it exists: the preview must never freeze silently. Every way a session can stop (phone
/// call, another app grabbing the camera, backgrounding, media services reset) lands in `state`,
/// and the views draw a calm, actionable layer over the preview instead of a stale frame.
@MainActor
@Observable
final class CameraSession {
    enum State: Equatable {
        case idle
        case starting
        case running
        case interrupted(reason: String)
        case failed(reason: String)

        var isFailed: Bool { if case .failed = self { true } else { false } }
    }

    private(set) var state: State = .idle
    /// Flips on the first frame; the UI keeps a `backgroundSunken` layer over the preview until then.
    private(set) var isReceivingFrames = false
    /// Pixel size of the delivered frames (portrait), used to map Vision rectangles onto the preview.
    private(set) var frameSize = CGSize(width: 1080, height: 1920)
    private(set) var isTorchOn = false
    private(set) var hasAudio = false

    let engine = CaptureEngine()
    private var configured = false
    private var lifecycleObservers: [NSObjectProtocol] = []
    private var wantsRunning = false

    init() {
        engine.onEvent = { [weak self] event in
            Task { @MainActor [weak self] in self?.handle(event) }
        }
        observeAppLifecycle()
    }

    // MARK: Lifecycle

    /// Configures on first call, then starts. Safe to call repeatedly (retry, foreground).
    func start() {
        wantsRunning = true
        if state == .idle || state.isFailed { state = .starting }
        isReceivingFrames = false
        let engine = engine
        let needsConfigure = !configured
        configured = true
        engine.queue.async {
            if needsConfigure { engine.configure() }
            engine.start()
        }
    }

    func stop() {
        wantsRunning = false
        let engine = engine
        engine.queue.async { engine.stop() }
        if isTorchOn { setTorch(false) }
    }

    /// Adds the microphone before recording. Look never calls this.
    func enableAudio() async -> Bool {
        if hasAudio { return true }
        let engine = engine
        let ok = await withCheckedContinuation { (cont: CheckedContinuation<Bool, Never>) in
            engine.queue.async { cont.resume(returning: engine.attachAudio()) }
        }
        hasAudio = ok
        return ok
    }

    func setTorch(_ on: Bool) {
        isTorchOn = on
        let engine = engine
        engine.queue.async { engine.setTorch(on) }
    }

    func toggleTorch() { setTorch(!isTorchOn) }

    /// `devicePoint` comes from `AVCaptureVideoPreviewLayer.captureDevicePointConverted`.
    func focus(atDevicePoint devicePoint: CGPoint) {
        let engine = engine
        engine.queue.async { engine.focus(at: devicePoint) }
    }

    /// The most recent frame as an image, for freezing the preview or a still capture.
    func snapshot() -> UIImage? {
        guard let buffer = engine.latestFrame() else { return nil }
        return FrameImage.image(from: buffer)
    }

    // MARK: Events

    private func handle(_ event: CaptureEngine.Event) {
        switch event {
        case .configured: break
        case .configurationFailed(let reason): state = .failed(reason: reason)
        case .running: if case .interrupted = state { } else { state = .running }
        case .stopped: if !state.isFailed { state = .idle }
        case .interrupted(let reason): state = .interrupted(reason: reason)
        case .interruptionEnded: state = .running
        case .runtimeError(let reason): state = .failed(reason: reason)
        case .firstFrame(let size):
            frameSize = size
            withDSAnimation(DSMotion.standard()) { isReceivingFrames = true }
        }
    }

    /// Background → stop (the system would interrupt anyway); foreground → restart if wanted.
    private func observeAppLifecycle() {
        let center = NotificationCenter.default
        lifecycleObservers.append(center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.wantsRunning else { return }
                let engine = self.engine
                engine.queue.async { engine.stop() }
                self.isReceivingFrames = false
            }
        })
        lifecycleObservers.append(center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self, self.wantsRunning else { return }
                self.start()
            }
        })
    }
}

/// Converts camera pixel buffers to images. One shared `CIContext` because creating them is slow.
enum FrameImage {
    private static let context = CIContext(options: [.useSoftwareRenderer: false])

    static func image(from buffer: CVPixelBuffer) -> UIImage? {
        let ci = CIImage(cvPixelBuffer: buffer)
        guard let cg = context.createCGImage(ci, from: ci.extent) else { return nil }
        return UIImage(cgImage: cg)
    }

    /// Writes a JPEG of the frame to `url` (creating the directory) and returns the byte count.
    @discardableResult
    static func writeJPEG(_ image: UIImage, to url: URL, quality: CGFloat = 0.85) throws -> Int {
        guard let data = image.jpegData(compressionQuality: quality) else { throw CocoaError(.fileWriteUnknown) }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url, options: .atomic)
        return data.count
    }
}
