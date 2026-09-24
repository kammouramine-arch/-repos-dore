import DoOnceCore
import Foundation
import Speech

/// A transcription service that can report partial transcripts while it works, so Processing
/// can stream words as they arrive instead of waiting for the end.
protocol PartialTranscriptionService: TranscriptionService {
    func transcribe(_ recording: Recording, partial: @escaping @Sendable (Transcript) -> Void) async throws -> Transcript
}

/// Transcribes a recording's audio track with `SFSpeechRecognizer`, on device when the device
/// supports it (no audio leaves the phone, no one-minute cap). Word timings come from the
/// recogniser's segments and are grouped into sentence-sized `TranscriptSegment`s at punctuation
/// or at pauses longer than `pauseGap`.
///
/// Known limits: server-based recognition caps requests at about one minute of audio, so a
/// device without on-device support gets only the first minute; the pipeline surfaces that as a
/// shorter transcript, never as an invented one.
struct SpeechTranscriptionService: PartialTranscriptionService, Sendable {
    var locale: Locale = .current
    /// A silence this long ends a segment even without punctuation.
    var pauseGap: TimeInterval = 0.8

    func transcribe(_ recording: Recording) async throws -> Transcript {
        try await transcribe(recording, partial: { _ in })
    }

    func transcribe(_ recording: Recording, partial: @escaping @Sendable (Transcript) -> Void) async throws -> Transcript {
        guard let recognizer = SFSpeechRecognizer(locale: locale) ?? SFSpeechRecognizer(), recognizer.isAvailable else {
            throw Failure.unavailable
        }
        let request = SFSpeechURLRecognitionRequest(url: recording.localURL)
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        request.addsPunctuation = true
        request.taskHint = .dictation

        let language = locale.language.languageCode?.identifier ?? "en"
        let gap = pauseGap
        let box = TaskBox()
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Transcript, any Error>) in
                let task = recognizer.recognitionTask(with: request) { result, error in
                    if let result {
                        let transcript = TranscriptBuilder.transcript(from: result.bestTranscription, language: language, pauseGap: gap)
                        if result.isFinal {
                            box.finish { cont.resume(returning: transcript) }
                        } else {
                            partial(transcript)
                        }
                    } else if let error {
                        box.finish { cont.resume(throwing: Failure.recognition(error.localizedDescription)) }
                    }
                }
                box.task = task
            }
        } onCancel: {
            box.task?.cancel()
        }
    }

    enum Failure: LocalizedError {
        case unavailable
        case recognition(String)
        var errorDescription: String? {
            switch self {
            case .unavailable: L10n.string("error.generic.title")
            case .recognition(let message): message
            }
        }
    }

    /// Guards the continuation against a second resume (Speech can call back after a cancel).
    private final class TaskBox: @unchecked Sendable {
        var task: SFSpeechRecognitionTask?
        private var finished = false
        private let lock = NSLock()
        func finish(_ body: () -> Void) {
            lock.lock(); defer { lock.unlock() }
            guard !finished else { return }
            finished = true
            body()
        }
    }
}

/// Turns Speech's flat word list into DoOnce's timed segments. Pure, so the grouping rule is easy
/// to reason about: a segment ends at `.`, `!`, `?` or when the next word starts after a pause.
enum TranscriptBuilder {
    static func transcript(from transcription: SFTranscription, language: String, pauseGap: TimeInterval) -> Transcript {
        let words = transcription.segments.map { TranscriptWord(text: $0.substring, start: $0.timestamp, end: $0.timestamp + $0.duration) }
        return transcript(from: words, language: language, pauseGap: pauseGap)
    }

    static func transcript(from words: [TranscriptWord], language: String, pauseGap: TimeInterval) -> Transcript {
        var segments: [TranscriptSegment] = []
        var current: [TranscriptWord] = []
        func flush() {
            guard let first = current.first, let last = current.last else { return }
            let text = current.map(\.text).joined(separator: " ")
            segments.append(TranscriptSegment(start: first.start, end: last.end, text: text, words: current))
            current = []
        }
        for (index, word) in words.enumerated() {
            if let previous = current.last, word.start - previous.end > pauseGap { flush() }
            current.append(word)
            let endsSentence = word.text.last.map { ".!?".contains($0) } ?? false
            if endsSentence || index == words.count - 1 { flush() }
        }
        let fullText = segments.map(\.text).joined(separator: " ")
        return Transcript(segments: segments, keyPhrases: keyPhrases(in: fullText), language: language)
    }

    /// Salient phrases: values with units and the sentences flagged as important, shortest first.
    static func keyPhrases(in text: String) -> [String] {
        var phrases = NumericValueExtractor.extract(from: text).map(\.raw)
        phrases += ImportantStatementDetector.detect(in: text).map(\.text)
        var seen = Set<String>()
        return phrases.filter { seen.insert($0.lowercased()).inserted }
    }
}
