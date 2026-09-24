import AVFoundation
import Observation

/// Reads a step aloud in hands-free Do mode. `SpeechPrompter` is the real one; tests substitute a stub.
@MainActor
protocol StepSpeaking: AnyObject {
    func speak(instruction: String, detail: String?)
    func stop()
}

/// Speaks the current step (instruction, then a short pause, then the detail) with `AVSpeechSynthesizer`
/// when hands-free is on. Concise by design: it never reads warnings twice or the provenance line.
///
/// `soundsEnabled` mirrors `AppState.soundsEnabled`. Note: text-to-speech is NOT silenced by the ringer
/// switch (the audio session is `.playAndRecord`, which plays through silent mode), so Settings → Sounds
/// off is the only way to mute it; the setting is documented there.
@MainActor
@Observable
final class SpeechPrompter: StepSpeaking {
    var soundsEnabled = true
    private(set) var isSpeaking = false
    private let synthesizer = AVSpeechSynthesizer()
    private let language: String

    init(language: String = Locale.current.identifier) {
        self.language = language
    }

    func speak(instruction: String, detail: String?) {
        guard soundsEnabled else { return }
        stop()
        let utterance = AVSpeechUtterance(string: instruction)
        configure(utterance)
        utterance.postUtteranceDelay = detail == nil ? 0 : 0.35
        synthesizer.speak(utterance)
        if let detail, !detail.isEmpty {
            let second = AVSpeechUtterance(string: detail)
            configure(second)
            synthesizer.speak(second)
        }
        isSpeaking = true
    }

    func stop() {
        if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .immediate) }
        isSpeaking = false
    }

    private func configure(_ utterance: AVSpeechUtterance) {
        utterance.voice = AVSpeechSynthesisVoice(language: language) ?? AVSpeechSynthesisVoice(language: "en-GB")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.95
        utterance.prefersAssistiveTechnologySettings = true
    }
}
