import Foundation

/// Turns the audio of a recording into a timed transcript.
public protocol TranscriptionService: Sendable {
    func transcribe(_ recording: Recording) async throws -> Transcript
}
