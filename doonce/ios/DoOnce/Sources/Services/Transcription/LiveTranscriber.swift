import CoreMedia
import DoOnceCore
import Foundation
import Observation
import Speech

/// Streams captions while recording: audio buffers from the capture session go into a
/// `SFSpeechAudioBufferRecognitionRequest`, partial text comes back on the main actor.
///
/// Why separate from `SpeechTranscriptionService`: the live path is best-effort presentation
/// (captions, chips). The memory is always built from the file transcription afterwards, so a
/// dropped live word never changes a step.
@MainActor
@Observable
final class LiveTranscriber {
    /// The latest partial text, whole utterance so far.
    private(set) var partialText = ""
    /// Phrases in `partialText` worth tinting signal: important keywords and values with units.
    private(set) var highlights: [String] = []
    /// Timed segments of the partial result, for pause-based step detection.
    private(set) var segments: [TranscriptSegment] = []
    private(set) var isRunning = false

    /// Partial text as it changes; one consumer at a time.
    let updates: AsyncStream<String>
    private let continuation: AsyncStream<String>.Continuation
    private let feed = AudioFeed()
    private var task: SFSpeechRecognitionTask?
    private var recognizer: SFSpeechRecognizer?

    init() {
        let (stream, cont) = AsyncStream<String>.makeStream()
        updates = stream
        continuation = cont
    }

    /// Speech authorisation is asked with the microphone (see `PermissionsService.requestSpeech`).
    func start() {
        guard !isRunning else { return }
        guard let recognizer = SFSpeechRecognizer() ?? SFSpeechRecognizer(locale: Locale(identifier: "en")), recognizer.isAvailable else { return }
        self.recognizer = recognizer
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        request.addsPunctuation = true
        feed.request = request
        partialText = ""
        highlights = []
        segments = []
        isRunning = true
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor [weak self] in
                guard let self else { return }
                if let result { self.apply(result.bestTranscription) }
                if error != nil || result?.isFinal == true { self.isRunning = false }
            }
        }
    }

    /// From the capture queue. Cheap: just hands the buffer to Speech.
    nonisolated func append(_ buffer: CMSampleBuffer) {
        feed.request?.appendAudioSampleBuffer(buffer)
    }

    func stop() {
        feed.request?.endAudio()
        feed.request = nil
        task?.finish()
        task = nil
        isRunning = false
    }

    private func apply(_ transcription: SFTranscription) {
        let transcript = TranscriptBuilder.transcript(from: transcription, language: "en", pauseGap: 0.8)
        segments = transcript.segments
        partialText = transcription.formattedString
        highlights = LiveHighlights.phrases(in: partialText)
        continuation.yield(partialText)
    }

    /// Holds the request so the capture queue can append without touching main-actor state.
    private final class AudioFeed: @unchecked Sendable {
        private let lock = NSLock()
        private var stored: SFSpeechAudioBufferRecognitionRequest?
        var request: SFSpeechAudioBufferRecognitionRequest? {
            get { lock.lock(); defer { lock.unlock() }; return stored }
            set { lock.lock(); stored = newValue; lock.unlock() }
        }
    }
}

/// What to light up in a caption: the important keywords themselves and any "1.5 bar".
enum LiveHighlights {
    static func phrases(in text: String) -> [String] {
        var phrases = NumericValueExtractor.extract(from: text).map(\.raw)
        let lowered = text.lowercased()
        phrases += ImportantStatementDetector.keywords.filter { lowered.contains($0) }.sorted()
        return phrases
    }
}
