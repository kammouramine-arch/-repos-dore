import DoOnceCore
import Foundation
import Observation
import SwiftUI
import UIKit

/// Teach's state: camera, recorder, live transcription and the observations shown over the
/// preview. The view stays declarative; every rule about when a chip appears lives here.
@MainActor
@Observable
final class TeachModel {
    enum Phase: Equatable {
        case idle
        case recording
        case stopping
        case handoff(Recording)
        case error(title: String, sub: String)
    }

    let camera = CameraSession()
    let live = LiveTranscriber()
    private(set) var recorder: MovieRecorder?
    private(set) var phase: Phase = .idle
    var selectedObjectID: UUID?
    /// Chips currently over the camera; each drops onto the ribbon ~1.5 s after it appears.
    private(set) var observations: [LiveObservation] = []
    private(set) var ticks: [RibbonTick] = []
    /// The last camera frame, captured at Stop so the preview can freeze and hand off.
    private(set) var frozenFrame: UIImage?
    var showsImporter = false
    var showsObjectPicker = false

    var isRecording: Bool { phase == .recording }
    var elapsed: TimeInterval { recorder?.elapsed ?? 0 }
    var audioLevel: Double { recorder?.audioLevel ?? 0 }
    /// The ribbon's full width is one minute until the recording is longer; then it stretches.
    var ribbonSpan: TimeInterval { max(60, elapsed) }

    private var app: AppState?
    private var detector = MomentDetector()
    private var watcher: Task<Void, Never>?
    private var handledImportant: Set<String> = []
    private var handledValues: Set<String> = []
    private var lastBoundaryEnd: TimeInterval = -1
    private var chipCount = 0

    // MARK: Lifecycle

    func attach(app: AppState, router: Router, objectID: UUID?) async {
        self.app = app
        if selectedObjectID == nil { selectedObjectID = objectID }
        if recorder == nil { recorder = MovieRecorder(camera: camera, store: app.services.recordings, householdID: app.household.id) }
        switch await PermissionsService.status(.camera) {
        case .undetermined:
            router.dismissFullScreen()
            router.show(.permission(.camera, then: .teach(objectID: objectID)))
        case .denied:
            phase = .error(title: L10n.string("permission.camera.title"), sub: L10n.string("permission.camera.sub"))
        case .granted:
            camera.start()
            app.haptics.prepare()
        }
    }

    func detach() {
        watcher?.cancel()
        camera.engine.onAudioBuffer = nil
        if phase != .stopping { camera.stop() }
    }

    // MARK: Record

    func toggleRecording(router: Router) {
        Task { isRecording ? await stop() : await start(router: router) }
    }

    private func start(router: Router) async {
        guard let recorder, let app, phase == .idle else { return }
        if await PermissionsService.status(.microphone) == .undetermined {
            router.dismissFullScreen()
            router.show(.permission(.microphone, then: .teach(objectID: selectedObjectID)))
            return
        }
        _ = await PermissionsService.requestSpeech()
        do {
            try await recorder.start()
        } catch {
            let sub: String
            if case MovieRecorder.Failure.lowStorage = error { sub = L10n.string("error.storage.sub") } else { sub = L10n.string("error.camera.sub") }
            phase = .error(title: error.localizedDescription, sub: sub)
            return
        }
        observations = []
        ticks = []
        handledImportant = []
        handledValues = []
        lastBoundaryEnd = -1
        camera.engine.onAudioBuffer = { [live] buffer in live.append(buffer) }
        live.start()
        withDSAnimation(DSMotion.gentle) { phase = .recording }
        app.haptics.play(.medium)
        Task { await app.services.analytics.track(.firstTeach) }
        watchLiveTranscript()
    }

    private func stop() async {
        guard let recorder, let app, phase == .recording else { return }
        watcher?.cancel()
        frozenFrame = camera.snapshot()
        withDSAnimation(DSMotion.gentle) { phase = .stopping }
        app.haptics.play(.light)
        live.stop()
        camera.engine.onAudioBuffer = nil
        do {
            let recording = try await recorder.stop()
            camera.stop()
            try? await Task.sleep(for: .milliseconds(380))
            withDSAnimation(DSMotion.crossfade) { phase = .handoff(recording) }
        } catch {
            phase = .error(title: L10n.string("error.recording.title"), sub: L10n.string("error.recording.sub"))
        }
    }

    /// "Remember this": a marker in the recording and a white tick on the ribbon.
    func markMoment() {
        guard let recorder, isRecording else { return }
        recorder.mark()
        app?.haptics.play(.selection)
        show(LiveObservation(text: L10n.string("teach.marked"), kind: .marked, at: recorder.elapsed, anchor: nextAnchor()))
    }

    // MARK: Import

    func imported(_ result: Result<URL, any Error>) {
        showsImporter = false
        guard let app else { return }
        switch result {
        case .failure:
            phase = .error(title: L10n.string("error.import.title"), sub: L10n.string("error.import.sub"))
        case .success(let url):
            Task {
                let recording = await Recording.imported(from: url, householdID: app.household.id)
                try? await app.services.recordings.save(recording)
                if let last = try? await KeyFrames.lastFrame(of: recording), let localURL = last.localURL {
                    frozenFrame = UIImage(contentsOfFile: localURL.path)
                }
                camera.stop()
                withDSAnimation(DSMotion.crossfade) { phase = .handoff(recording) }
            }
        }
    }

    func recover() {
        phase = .idle
        if camera.state.isFailed || camera.state == .idle { camera.start() }
    }

    // MARK: Live intelligence

    /// Polls the live transcriber a few times a second and turns what it hears into chips:
    /// important statements, values with units, and "Step detected" when a pause longer than
    /// 1.2 s follows an instruction-like sentence.
    private func watchLiveTranscript() {
        watcher?.cancel()
        watcher = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(250))
                guard let self, self.isRecording else { return }
                self.inspect(self.live.segments, now: self.elapsed)
            }
        }
    }

    private func inspect(_ segments: [TranscriptSegment], now: TimeInterval) {
        for segment in segments {
            for statement in ImportantStatementDetector.detect(in: segment.text) where handledImportant.insert(statement.text).inserted {
                show(LiveObservation(text: L10n.string("teach.importantQuote", ["quote": Self.shorten(statement.text)]), kind: .important, at: segment.start, anchor: nextAnchor()))
            }
            for value in NumericValueExtractor.extract(from: segment.text) where handledValues.insert(value.raw).inserted {
                show(LiveObservation(text: value.formatted, kind: .value, at: segment.start, anchor: nextAnchor()))
            }
        }
        guard let last = segments.last, last.end > lastBoundaryEnd, now - last.end >= detector.pauseGap, detector.isInstruction(last.text) else { return }
        lastBoundaryEnd = last.end
        show(LiveObservation(text: L10n.string("teach.stepDetected"), kind: .step, at: last.end, anchor: nextAnchor()))
    }

    private func show(_ observation: LiveObservation) {
        withDSAnimation(DSMotion.standard(0.22)) { observations.append(observation) }
        let delay = UIAccessibility.isReduceMotionEnabled ? 600 : 1500
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(delay))
            guard let self else { return }
            withDSAnimation(DSMotion.exit(0.32)) { self.observations.removeAll { $0.id == observation.id } }
            self.ticks.append(RibbonTick(at: observation.at, kind: observation.tickKind))
        }
    }

    /// Chips land in the bottom third, alternating sides so they never stack.
    private func nextAnchor() -> UnitPoint {
        chipCount += 1
        let xs: [CGFloat] = [0.46, 0.3, 0.6, 0.38, 0.54]
        let ys: [CGFloat] = [0.58, 0.63, 0.55, 0.61, 0.57]
        return UnitPoint(x: xs[chipCount % xs.count], y: ys[chipCount % ys.count])
    }

    private static func shorten(_ text: String, limit: Int = 32) -> String {
        text.count <= limit ? text : String(text.prefix(limit)).trimmingCharacters(in: .whitespaces) + "…"
    }
}
