import ExpoModulesCore
import AVFoundation
import UIKit
import Speech
import SherpaOnnxC

// Audio lifecycle stays on main; model ownership stays on the inference queue.
// Stop drains that queue before resolving, so a command never races the wake tap.
public final class AvyroWakeModule: Module {
  private var engine: AVAudioEngine?
  private let inference = DispatchQueue(label: "app.avyro.wake", qos: .userInitiated)
  private let capacity = DispatchSemaphore(value: 2)
  private var spotter: OpaquePointer?
  private var stream: OpaquePointer?
  private var triggered = false
  private var observers: [NSObjectProtocol] = []
  private var recognitionTasks: [SFSpeechRecognitionTask] = []
  private var speechRecognizers: [SFSpeechRecognizer] = []
  private var recognitionRequests: [SFSpeechAudioBufferRecognitionRequest] = []
  private var generation = 0

  private var models: Bundle? {
    guard let url = Bundle(for: AvyroWakeModule.self).url(forResource: "AvyroWakeModels", withExtension: "bundle") else { return nil }
    return Bundle(url: url)
  }

  public func definition() -> ModuleDefinition {
    Name("AvyroWake")
    Events("detected", "failure", "transcript", "speechEnd")
    AsyncFunction("supportsOnDevice") { (locale: String) -> Bool in
      SFSpeechRecognizer(locale: Locale(identifier: locale))?.supportsOnDeviceRecognition == true
    }
    AsyncFunction("startSpeech") { (locales: [String]) throws in
      try self.startSpeechCapture(locales: locales)
    }.runOnQueue(.main)
    AsyncFunction("finishSpeech") {
      if let capture = self.engine {
        capture.inputNode.removeTap(onBus: 0)
        capture.stop(); capture.reset(); self.engine = nil
      }
      self.recognitionRequests.forEach { $0.endAudio() }
    }.runOnQueue(.main)
    AsyncFunction("isAvailable") { () -> Bool in
      self.models?.path(forResource: "encoder", ofType: "onnx") != nil
    }
    AsyncFunction("start") { () throws in try self.startCapture() }.runOnQueue(.main)
    AsyncFunction("stop") { self.stopCapture() }.runOnQueue(.main)
    OnCreate {
      for name in [UIApplication.didEnterBackgroundNotification, AVAudioSession.interruptionNotification, AVAudioSession.routeChangeNotification] {
        self.observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] notification in
          guard let self, self.engine != nil else { return }
          if name == AVAudioSession.routeChangeNotification {
            let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt
            if reason == AVAudioSession.RouteChangeReason.categoryChange.rawValue || reason == AVAudioSession.RouteChangeReason.routeConfigurationChange.rawValue { return }
          }
          if name == AVAudioSession.interruptionNotification,
             notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt != AVAudioSession.InterruptionType.began.rawValue { return }
          self.stopCapture()
          self.sendEvent("failure", ["kind": "audio-interrupted", "message": "Listening paused. Re-enable voice when the app and audio are available."])
        })
      }
    }
    OnDestroy {
      self.observers.forEach(NotificationCenter.default.removeObserver)
      DispatchQueue.main.async { self.stopCapture() }
    }
  }

  private func startCapture() throws {
    stopCapture()
    guard UIApplication.shared.applicationState == .active else { throw wakeError("Open Avyro to use hands-free voice.") }
    guard AVAudioSession.sharedInstance().recordPermission == .granted else { throw wakeError("Microphone permission is required.") }
    guard let models else { throw wakeError("Wake model is missing from this build.") }
    let names = ["encoder.onnx", "decoder.onnx", "joiner.onnx", "tokens.txt", "keywords.txt"]
    let paths = try names.map { name -> String in
      guard let path = models.path(forResource: name, ofType: nil) else { throw wakeError("Wake model is incomplete.") }
      return path
    }
    let pointers = paths.map { strdup($0) }
    defer { pointers.forEach { free($0) } }
    var config = SherpaOnnxKeywordSpotterConfig()
    config.feat_config.sample_rate = 16000
    config.feat_config.feature_dim = 80
    config.model_config.transducer.encoder = UnsafePointer(pointers[0])
    config.model_config.transducer.decoder = UnsafePointer(pointers[1])
    config.model_config.transducer.joiner = UnsafePointer(pointers[2])
    config.model_config.tokens = UnsafePointer(pointers[3])
    config.model_config.num_threads = 1
    config.max_active_paths = 4
    config.num_trailing_blanks = 1
    config.keywords_score = 5
    config.keywords_threshold = 0.1
    config.keywords_file = UnsafePointer(pointers[4])
    let created = SherpaOnnxCreateKeywordSpotter(&config)
    guard let created else { throw wakeError("Wake model could not be loaded.") }
    guard let createdStream = SherpaOnnxCreateKeywordStream(created) else {
      SherpaOnnxDestroyKeywordSpotter(created)
      throw wakeError("Wake stream could not be created.")
    }
    inference.sync { self.spotter = created; self.stream = createdStream; self.triggered = false }
    do {
      let audio = AVAudioSession.sharedInstance()
      try audio.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothHFP])
      try audio.setActive(true)
      let capture = AVAudioEngine()
      let input = capture.inputNode
      let format = input.outputFormat(forBus: 0)
      guard format.sampleRate > 0, format.channelCount > 0 else { throw wakeError("No microphone is available.") }
      input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
        guard let self, let channels = buffer.floatChannelData, self.capacity.wait(timeout: .now()) == .success else { return }
        let samples = Array(UnsafeBufferPointer(start: channels[0], count: Int(buffer.frameLength)))
        let rate = Int32(format.sampleRate)
        self.inference.async {
          defer { self.capacity.signal() }
          guard !self.triggered, let kws = self.spotter, let stream = self.stream else { return }
          samples.withUnsafeBufferPointer { ptr in
            SherpaOnnxOnlineStreamAcceptWaveform(stream, rate, ptr.baseAddress, Int32(ptr.count))
          }
          while SherpaOnnxIsKeywordStreamReady(kws, stream) != 0 {
            SherpaOnnxDecodeKeywordStream(kws, stream)
            if let result = SherpaOnnxGetKeywordResult(kws, stream) {
              let detected = result.pointee.keyword.map { String(cString: $0) } ?? ""
              SherpaOnnxDestroyKeywordResult(result)
              if !detected.isEmpty {
                self.triggered = true
                DispatchQueue.main.async {
                  self.stopCapture()
                  self.sendEvent("detected", [:])
                }
                break
              }
            }
          }
        }
      }
      engine = capture
      capture.prepare()
      try capture.start()
    } catch { stopCapture(); throw error }
  }

  private func stopCapture() {
    generation += 1
    recognitionRequests.forEach { $0.endAudio() }
    recognitionTasks.forEach { $0.cancel() }
    recognitionTasks = []; recognitionRequests = []
    speechRecognizers = []
    if let capture = engine {
      capture.inputNode.removeTap(onBus: 0)
      capture.stop()
      capture.reset()
      engine = nil
    }
    inference.sync {
      if let stream { SherpaOnnxDestroyOnlineStream(stream) }
      if let spotter { SherpaOnnxDestroyKeywordSpotter(spotter) }
      stream = nil; spotter = nil; triggered = false
    }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  // Both language models consume the same microphone buffers. Ambient audio
  // remains on device: every request is explicitly on-device or refused.
  private func startSpeechCapture(locales: [String]) throws {
    stopCapture()
    guard UIApplication.shared.applicationState == .active else { throw wakeError("Open Avyro to use voice.") }
    guard AVAudioSession.sharedInstance().recordPermission == .granted else { throw wakeError("Microphone permission is required.") }
    let supported = Array(Set(locales)).sorted().filter { ["en-US", "fr-FR"].contains($0) }
    guard !supported.isEmpty, supported.count <= 2 else { throw wakeError("Select French or English.") }
    let recognizers = try supported.map { locale -> SFSpeechRecognizer in
      guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale)), recognizer.isAvailable,
            recognizer.supportsOnDeviceRecognition else { throw wakeError("Download the on-device speech language in iPhone Settings.") }
      return recognizer
    }
    let currentGeneration = generation
    var completed = Set<String>()
    var hasFinal = false
    speechRecognizers = recognizers
    for (index, recognizer) in recognizers.enumerated() {
      let locale = supported[index]
      let request = SFSpeechAudioBufferRecognitionRequest()
      request.requiresOnDeviceRecognition = true
      request.shouldReportPartialResults = true
      request.taskHint = .dictation
      request.contextualStrings = ["Hey Avyro", "Hé Avyro", "Aviro", "Take me home", "Emmène-moi à la maison", "Paris", "Lille"]
      recognitionRequests.append(request)
      recognitionTasks.append(recognizer.recognitionTask(with: request) { [weak self] result, error in
        DispatchQueue.main.async {
          guard let self, self.generation == currentGeneration else { return }
          if let result {
            let segments = result.bestTranscription.segments
            let confidence = segments.isEmpty ? 0 : segments.reduce(0.0) { $0 + Double($1.confidence) } / Double(segments.count)
            self.sendEvent("transcript", ["text": result.bestTranscription.formattedString, "isFinal": result.isFinal, "locale": locale, "confidence": confidence])
            if result.isFinal { hasFinal = true; completed.insert(locale) }
          }
          if error != nil { completed.insert(locale) }
          if completed.count == supported.count {
            self.stopCapture()
            if hasFinal { self.sendEvent("speechEnd", [:]) }
            else { self.sendEvent("failure", ["kind": "runtime-error", "message": "The iPhone speech service stopped. Try one voice language in Settings."]) }
          }
        }
      })
    }
    do {
      let audio = AVAudioSession.sharedInstance()
      try audio.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothHFP])
      try audio.setActive(true)
      let capture = AVAudioEngine(), input = capture.inputNode
      let format = input.outputFormat(forBus: 0)
      guard format.sampleRate > 0, format.channelCount > 0 else { throw wakeError("No microphone is available.") }
      let requests = recognitionRequests
      input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
        requests.forEach { $0.append(buffer) }
      }
      engine = capture
      capture.prepare()
      try capture.start()
    } catch { stopCapture(); throw error }
  }

  private func wakeError(_ message: String) -> NSError {
    NSError(domain: "AvyroWake", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }
}
