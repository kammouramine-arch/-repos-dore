import AVFoundation
import CoreMedia
import Foundation

/// The non-isolated half of the camera: owns the `AVCaptureSession`, its inputs and outputs, and
/// the serial queue every configuration call runs on.
///
/// Why a separate object: `AVCaptureSession` must be configured and started off the main thread,
/// and its delegate callbacks arrive on the capture queue. Keeping that plumbing outside the
/// `@MainActor` `CameraSession` lets the observable state stay strictly main-actor while the
/// queue-bound work stays here. Events flow back through `onEvent`, which callers hop to main.
final class CaptureEngine: NSObject, @unchecked Sendable {
    enum Event: Sendable {
        case configured(hasVideo: Bool)
        case configurationFailed(String)
        case running
        case stopped
        case interrupted(reason: String)
        case interruptionEnded
        case runtimeError(String)
        case firstFrame(CGSize)
    }

    let session = AVCaptureSession()
    /// All session mutation happens here. Delegate callbacks are delivered here too.
    let queue = DispatchQueue(label: "app.doonce.camera", qos: .userInitiated)
    let videoOutput = AVCaptureVideoDataOutput()
    let audioOutput = AVCaptureAudioDataOutput()
    let movieOutput = AVCaptureMovieFileOutput()

    /// Called on `queue` for every camera frame. Consumers must be cheap or throttle themselves.
    var onVideoFrame: (@Sendable (CMSampleBuffer) -> Void)?
    /// Called on `queue` with every audio buffer while an audio input is attached.
    var onAudioBuffer: (@Sendable (CMSampleBuffer) -> Void)?
    /// Average power in dB (negative, 0 is full scale) per audio buffer, on `queue`.
    var onAudioLevel: (@Sendable (Float) -> Void)?
    /// Lifecycle events, on `queue`.
    var onEvent: (@Sendable (Event) -> Void)?

    private(set) var videoDevice: AVCaptureDevice?
    private var videoInput: AVCaptureDeviceInput?
    private var audioInput: AVCaptureDeviceInput?
    private var hasReportedFirstFrame = false
    private let frameLock = NSLock()
    private var latestPixelBuffer: CVPixelBuffer?
    private var observers: [NSObjectProtocol] = []

    override init() {
        super.init()
        observeSession()
    }

    deinit { observers.forEach(NotificationCenter.default.removeObserver) }

    // MARK: Configuration (call on `queue`)

    /// Back wide camera, 1080p, portrait, video data + movie outputs. Audio is added separately
    /// so Look never touches the microphone (and never shows the orange indicator).
    func configure() {
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        session.sessionPreset = session.canSetSessionPreset(.hd1920x1080) ? .hd1920x1080 : .high

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device), session.canAddInput(input) else {
            onEvent?(.configurationFailed("No back camera"))
            return
        }
        session.addInput(input)
        videoInput = input
        videoDevice = device
        configureFocus(device)

        videoOutput.alwaysDiscardsLateVideoFrames = true
        videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
        videoOutput.setSampleBufferDelegate(self, queue: queue)
        if session.canAddOutput(videoOutput) { session.addOutput(videoOutput) }
        if session.canAddOutput(movieOutput) { session.addOutput(movieOutput) }
        lockPortrait()
        onEvent?(.configured(hasVideo: true))
    }

    /// Attaches the microphone and the audio data output. Idempotent.
    func attachAudio() -> Bool {
        if audioInput != nil { return true }
        guard let mic = AVCaptureDevice.default(for: .audio), let input = try? AVCaptureDeviceInput(device: mic) else { return false }
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        guard session.canAddInput(input) else { return false }
        session.addInput(input)
        audioInput = input
        audioOutput.setSampleBufferDelegate(self, queue: queue)
        if session.canAddOutput(audioOutput) { session.addOutput(audioOutput) }
        return true
    }

    func start() {
        guard !session.isRunning else { onEvent?(.running); return }
        hasReportedFirstFrame = false
        session.startRunning()
        onEvent?(session.isRunning ? .running : .runtimeError("Session did not start"))
    }

    func stop() {
        guard session.isRunning else { return }
        session.stopRunning()
        onEvent?(.stopped)
    }

    func setTorch(_ on: Bool) {
        guard let device = videoDevice, device.hasTorch, (try? device.lockForConfiguration()) != nil else { return }
        device.torchMode = on && device.isTorchAvailable ? .on : .off
        device.unlockForConfiguration()
    }

    /// `point` is in device coordinates (0…1, landscape-native), from `AVCaptureVideoPreviewLayer`.
    func focus(at point: CGPoint) {
        guard let device = videoDevice, (try? device.lockForConfiguration()) != nil else { return }
        if device.isFocusPointOfInterestSupported { device.focusPointOfInterest = point; device.focusMode = .autoFocus }
        if device.isExposurePointOfInterestSupported { device.exposurePointOfInterest = point; device.exposureMode = .autoExpose }
        device.isSubjectAreaChangeMonitoringEnabled = true
        device.unlockForConfiguration()
    }

    /// The most recent camera frame, for freezing the preview or capturing a still.
    func latestFrame() -> CVPixelBuffer? {
        frameLock.lock(); defer { frameLock.unlock() }
        return latestPixelBuffer
    }

    // MARK: Private

    private func configureFocus(_ device: AVCaptureDevice) {
        guard (try? device.lockForConfiguration()) != nil else { return }
        if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
        if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
        device.unlockForConfiguration()
    }

    /// The app is portrait-only, so every connection is rotated once here and never again.
    private func lockPortrait() {
        for output in [videoOutput as AVCaptureOutput, movieOutput] {
            guard let connection = output.connection(with: .video) else { continue }
            if connection.isVideoRotationAngleSupported(90) { connection.videoRotationAngle = 90 }
        }
    }

    /// Back to continuous focus after a subject change so tap-to-focus never sticks.
    private func observeSession() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: .AVCaptureSessionWasInterrupted, object: session, queue: nil) { [weak self] note in
            let raw = (note.userInfo?[AVCaptureSessionInterruptionReasonKey] as? Int) ?? 0
            let reason = AVCaptureSession.InterruptionReason(rawValue: raw).map(Self.describe) ?? "Interrupted"
            self?.onEvent?(.interrupted(reason: reason))
        })
        observers.append(center.addObserver(forName: .AVCaptureSessionInterruptionEnded, object: session, queue: nil) { [weak self] _ in
            self?.onEvent?(.interruptionEnded)
        })
        observers.append(center.addObserver(forName: .AVCaptureSessionRuntimeError, object: session, queue: nil) { [weak self] note in
            let error = note.userInfo?[AVCaptureSessionErrorKey] as? AVError
            self?.onEvent?(.runtimeError(error?.localizedDescription ?? "Runtime error"))
            // A media-services reset is recoverable: restart on our queue.
            if error?.code == .mediaServicesWereReset { self?.queue.async { self?.start() } }
        })
        observers.append(center.addObserver(forName: .AVCaptureDeviceSubjectAreaDidChange, object: nil, queue: nil) { [weak self] _ in
            self?.queue.async { if let d = self?.videoDevice { self?.configureFocus(d) } }
        })
    }

    private static func describe(_ reason: AVCaptureSession.InterruptionReason) -> String {
        switch reason {
        case .audioDeviceInUseByAnotherClient: "Microphone in use"
        case .videoDeviceInUseByAnotherClient: "Camera in use"
        case .videoDeviceNotAvailableInBackground: "In background"
        case .videoDeviceNotAvailableWithMultipleForegroundApps: "Split view"
        case .videoDeviceNotAvailableDueToSystemPressure: "System pressure"
        @unknown default: "Interrupted"
        }
    }
}

extension CaptureEngine: AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
    /// One implementation serves both protocols; the output tells them apart.
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        if output === videoOutput {
            if let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) {
                frameLock.lock(); latestPixelBuffer = pixelBuffer; frameLock.unlock()
                if !hasReportedFirstFrame {
                    hasReportedFirstFrame = true
                    onEvent?(.firstFrame(CGSize(width: CVPixelBufferGetWidth(pixelBuffer), height: CVPixelBufferGetHeight(pixelBuffer))))
                }
            }
            onVideoFrame?(sampleBuffer)
        } else if output === audioOutput {
            if let level = connection.audioChannels.first?.averagePowerLevel { onAudioLevel?(level) }
            onAudioBuffer?(sampleBuffer)
        }
    }
}
