// Stand-ins for the device-only types the linked logic files reference. Each mirrors the real
// type's API surface as used by those files; the real implementations live in the app target.
import Foundation
import DoOnceCore

/// Mirrors `AppState`'s progress API so `DoModeViewModel`'s `extension AppState: DoProgressStore` compiles.
@MainActor
final class AppState {
    var progress: [MemoryProgress] = []
    func setProgress(_ p: MemoryProgress) { progress.removeAll { $0.memoryID == p.memoryID }; progress.append(p) }
    func clearProgress(memoryID: UUID) { progress.removeAll { $0.memoryID == memoryID } }
}

/// Mirrors `Services/Speech/VoiceCommandListener.swift`'s protocol.
@MainActor
protocol VoiceIntentSource: AnyObject {
    func start() async -> AsyncStream<DoIntent>?
    func stop()
}

/// Mirrors `Services/Speech/SpeechPrompter.swift`'s protocol.
@MainActor
protocol StepSpeaking: AnyObject {
    func speak(instruction: String, detail: String?)
    func stop()
}

/// Mirrors `Services/LiveActivity/ProcedureActivity.swift` (ActivityKit on device; a no-op here).
@MainActor
final class ProcedureActivityController {
    var started = 0, updated = 0, ended = 0
    func start(memory: Memory, step: Step, index: Int, total: Int) { started += 1 }
    func update(step: Step, index: Int, total: Int) { updated += 1 }
    func end() { ended += 1 }
}

/// Mirrors `Widgets/Shared/ContinueMemoryStore.swift` (app-group UserDefaults + WidgetKit on device).
struct ContinueMemoryStore {
    struct Entry: Codable, Hashable { var memoryID: UUID; var title: String; var nextStep: Int; var total: Int; var updatedAt: Date }
    static let shared = ContinueMemoryStore()
    func save(_ entry: Entry) {}
    func clear(memoryID: UUID) {}
    var entry: Entry? { nil }
}

// MARK: - Recording / media stand-ins for `ProcessingPipeline`

/// Mirrors `Services/Recording/StepClipExporter.swift`'s protocol (AVFoundation export on device).
protocol StepClipExporting: Sendable {
    func clip(of recording: Recording, stepOrder: Int, range: ClosedRange<TimeInterval>) async throws -> MediaRef
}

/// Mirrors `Services/Transcription/SpeechTranscriptionService.swift`'s protocol (Speech on device).
protocol PartialTranscriptionService: TranscriptionService {
    func transcribe(_ recording: Recording, partial: @escaping @Sendable (Transcript) -> Void) async throws -> Transcript
}

/// Mirrors `Services/Recording/MovieRecorder.swift`'s `RecordingFiles` facade: a `MediaLibrary`
/// under a temporary root instead of Application Support.
enum RecordingFiles {
    nonisolated(unsafe) static var library = MediaLibrary(root: FileManager.default.temporaryDirectory.appending(path: "doonce-linux-media"))
}

/// Mirrors `KeyFrames` (AVAssetImageGenerator on device). There is no decoder here, so it throws.
enum KeyFrames {
    struct Unavailable: Error {}
    static func frame(of recording: Recording, at seconds: TimeInterval) async throws -> MediaRef { throw Unavailable() }
}

/// Mirrors the extension in `Services/Storage/AppDirectories.swift`.
extension MediaLibrary {
    func playableOriginalURL(for recording: Recording) -> URL? {
        let candidates = [recording.localURL, originalURL(recording.id)]
        return candidates.first { $0.isFileURL && FileManager.default.fileExists(atPath: $0.path) }
    }
}

/// Mirrors the extension in `App/AppState.swift`.
extension Memory {
    static let draftTag = "draft"
    var isDraft: Bool { tags.contains(Self.draftTag) }
}
