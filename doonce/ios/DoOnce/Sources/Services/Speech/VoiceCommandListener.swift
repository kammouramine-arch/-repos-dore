import AVFoundation
import Speech
import UIKit
import Observation
import DoOnceCore

/// A source of Do-mode voice intents. `VoiceCommandListener` is the real one; tests substitute a stub.
@MainActor
protocol VoiceIntentSource: AnyObject {
    /// Starts the microphone and returns the intent stream, or nil when speech is unavailable / denied.
    func start() async -> AsyncStream<DoIntent>?
    func stop()
}

/// Listens to the microphone and turns speech into `DoIntent`s (hands-free Do mode) or plain text
/// (Ask dictation).
///
/// Real: `SFSpeechRecognizer` (on-device when the device supports it, so nothing leaves the phone),
/// fed by an `AVAudioEngine` tap. Only the words spoken since the last handled phrase are parsed, so
/// "next … next" moves two steps, while the same intent repeated within `debounce` seconds (partial
/// results echoing) is dropped. Recognition tasks are restarted before Apple's one-minute limit.
/// Stops itself when the app goes to the background; the audio session is `.playAndRecord` +
/// `.duckOthers` so the prompter's voice and the user's music coexist.
@MainActor
@Observable
final class VoiceCommandListener: VoiceIntentSource {
    enum Mode { case commands, dictation }

    let mode: Mode
    private(set) var isListening = false
    /// Dictation mode: the words heard so far for the current utterance.
    private(set) var dictatedText = ""
    /// Dictation mode: set once the recogniser marks the utterance final.
    private(set) var finalText: String?

    private let parser = VoiceCommandParser()
    private let audioEngine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    /// Appended to from the audio tap (real-time thread), hence not actor-isolated.
    @ObservationIgnored private nonisolated(unsafe) var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var continuation: AsyncStream<DoIntent>.Continuation?
    private var handledPrefix = ""
    private var lastIntent: (DoIntent, Date)?
    private var restartTimer: Task<Void, Never>?
    private var backgroundObserver: NSObjectProtocol?

    /// Seconds within which the same intent is ignored (partial results repeat the phrase).
    var debounce: TimeInterval = 1.5

    init(mode: Mode = .commands, locale: Locale = .current) {
        self.mode = mode
        recognizer = SFSpeechRecognizer(locale: locale) ?? SFSpeechRecognizer()
    }

    // MARK: VoiceIntentSource

    func start() async -> AsyncStream<DoIntent>? {
        guard !isListening else { return nil }
        guard await PermissionsService.request(.microphone) == .granted, await PermissionsService.requestSpeech(),
              let recognizer, recognizer.isAvailable else { return nil }
        let stream = AsyncStream<DoIntent> { [weak self] continuation in
            self?.continuation = continuation
            continuation.onTermination = { @Sendable _ in Task { @MainActor [weak self] in self?.stop() } }
        }
        do { try startAudio() } catch { return nil }
        beginRecognition()
        isListening = true
        backgroundObserver = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.stop() }
        }
        return stream
    }

    func stop() {
        guard isListening else { return }
        isListening = false
        restartTimer?.cancel(); restartTimer = nil
        if let backgroundObserver { NotificationCenter.default.removeObserver(backgroundObserver) }
        backgroundObserver = nil
        endRecognition()
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        continuation?.finish()
        continuation = nil
    }

    // MARK: Audio

    private func startAudio() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.duckOthers, .defaultToSpeaker, .allowBluetooth])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
        let input = audioEngine.inputNode
        let format = input.outputFormat(forBus: 0)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        audioEngine.prepare()
        try audioEngine.start()
    }

    // MARK: Recognition

    private func beginRecognition() {
        guard let recognizer else { return }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        request.taskHint = mode == .commands ? .search : .dictation
        self.request = request
        handledPrefix = ""
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor in self?.handle(result: result, error: error) }
        }
        // Apple ends buffer tasks after ~60 s; roll over early so a long step never goes deaf.
        restartTimer?.cancel()
        restartTimer = Task { [weak self] in
            try? await Task.sleep(for: .seconds(50))
            guard let self, !Task.isCancelled, self.isListening else { return }
            self.endRecognition()
            self.beginRecognition()
        }
    }

    private func endRecognition() {
        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil
    }

    private func handle(result: SFSpeechRecognitionResult?, error: Error?) {
        if let result {
            let text = result.bestTranscription.formattedString
            switch mode {
            case .dictation:
                dictatedText = text
                if result.isFinal { finalText = text }
            case .commands:
                let fresh = text.hasPrefix(handledPrefix) ? String(text.dropFirst(handledPrefix.count)) : text
                if let intent = parser.parse(fresh) {
                    handledPrefix = text
                    publish(intent)
                }
                if result.isFinal { handledPrefix = "" }
            }
        }
        // A finished or failed task (silence timeout, cancellation) is restarted while we are still on.
        if isListening, error != nil || result?.isFinal == true {
            endRecognition()
            beginRecognition()
        }
    }

    private func publish(_ intent: DoIntent) {
        if let (last, at) = lastIntent, last == intent, Date().timeIntervalSince(at) < debounce { return }
        lastIntent = (intent, Date())
        continuation?.yield(intent)
    }
}
