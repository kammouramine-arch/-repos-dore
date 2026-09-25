import Foundation

/// Returns the sample boiler transcript, with word timings, for any recording.
public struct MockTranscriptionService: TranscriptionService {
    public var transcript: Transcript
    /// Simulated processing time, for previews of the "Listening…" state.
    public var delay: Duration

    public init(transcript: Transcript = SampleTranscripts.boilerRepressurise, delay: Duration = .zero) {
        self.transcript = transcript
        self.delay = delay
    }

    public func transcribe(_ recording: Recording) async throws -> Transcript {
        if delay > .zero { try await Task.sleep(for: delay) }
        return transcript
    }
}
