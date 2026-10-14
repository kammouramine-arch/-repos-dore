import ExpoModulesCore
import AVFoundation
import UIKit
import Speech
import MapKit
import SherpaOnnxC

private final class AvyroSuggestions: NSObject, MKLocalSearchCompleterDelegate {
  let completer = MKLocalSearchCompleter()
  var complete: (([MKLocalSearchCompletion]) -> Void)?
  var fail: ((Error) -> Void)?
  func start(_ query: String, latitude: Double?, longitude: Double?) {
    completer.delegate = self
    completer.resultTypes = [.address, .pointOfInterest]
    if let latitude, let longitude { completer.region = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude), latitudinalMeters: 50000, longitudinalMeters: 50000) }
    completer.queryFragment = query
  }
  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) { complete?(completer.results); complete = nil; fail = nil; completer.delegate = nil }
  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) { fail?(error); complete = nil; fail = nil; completer.delegate = nil }
  func cancel() { completer.cancel(); fail?(NSError(domain: "AvyroSearch", code: 1, userInfo: [NSLocalizedDescriptionKey: "Search superseded"])); complete = nil; fail = nil; completer.delegate = nil }
}

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
  private var suggestions: AvyroSuggestions?
  private var completionResults: [String: MKLocalSearchCompletion] = [:]
  private var commandFile: AVAudioFile?
  private var commandURL: URL?
  private var rollingAudio: [[Float]] = []
  private var acceptedAudioSeconds = 0.0
  private var handoffAudio: (samples: [Float], rate: Double, at: Date)?

  private var models: Bundle? {
    guard let url = Bundle(for: AvyroWakeModule.self).url(forResource: "AvyroWakeModels", withExtension: "bundle") else { return nil }
    return Bundle(url: url)
  }

  public func definition() -> ModuleDefinition {
    Name("AvyroWake")
    Events("detected", "failure", "transcript", "speechEnd")
    AsyncFunction("suggestPlaces") { (query: String, latitude: Double?, longitude: Double?, promise: Promise) in
      self.suggestions?.cancel()
      let search = AvyroSuggestions()
      search.complete = { [weak self] results in
        guard let self else { promise.resolve([]); return }
        self.completionResults = [:]
        let items: [[String: Any]] = results.prefix(8).map { item in
          let id = UUID().uuidString
          self.completionResults[id] = item
          return ["id": id, "name": item.title, "address": item.subtitle]
        }
        promise.resolve(items)
      }
      search.fail = { error in promise.reject(error) }
      self.suggestions = search
      search.start(query, latitude: latitude, longitude: longitude)
    }.runOnQueue(.main)
    AsyncFunction("resolvePlaceSuggestion") { (id: String) async throws -> [[String: Any]] in
      let cached = await MainActor.run { self.completionResults[id] }
      guard let completion = cached else { throw self.wakeError("Search changed. Choose a current suggestion.") }
      let response = try await MKLocalSearch(request: MKLocalSearch.Request(completion: completion)).start()
      return response.mapItems.prefix(1).map { item in
        let address = item.placemark
        let street = [address.subThoroughfare, address.thoroughfare].compactMap { $0 }.joined(separator: " ")
        let fullAddress = [street, address.locality, address.postalCode, address.country].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
        return ["name": item.name ?? street, "address": fullAddress, "houseNumber": address.subThoroughfare ?? "", "latitude": address.coordinate.latitude, "longitude": address.coordinate.longitude]
      }
    }
    AsyncFunction("searchPlaces") { (query: String, latitude: Double?, longitude: Double?) async throws -> [[String: Any]] in
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query
      request.resultTypes = [.address, .pointOfInterest]
      if let latitude, let longitude {
        request.region = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude), latitudinalMeters: 50000, longitudinalMeters: 50000)
      }
      let response = try await MKLocalSearch(request: request).start()
      return response.mapItems.prefix(8).map { item in
        let address = item.placemark
        let street = [address.subThoroughfare, address.thoroughfare].compactMap { $0 }.joined(separator: " ")
        let fullAddress = [street, address.locality, address.postalCode, address.country].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
        return ["name": item.name ?? street, "address": fullAddress, "houseNumber": address.subThoroughfare ?? "", "latitude": address.coordinate.latitude, "longitude": address.coordinate.longitude]
      }
    }
    AsyncFunction("supportsOnDevice") { (locale: String) -> Bool in
      SFSpeechRecognizer(locale: Locale(identifier: locale))?.supportsOnDeviceRecognition == true
    }
    AsyncFunction("startSpeech") { (locales: [String], continuous: Bool) throws in
      try self.startSpeechCapture(locales: locales, continuous: continuous)
    }.runOnQueue(.main)
    AsyncFunction("finishSpeech") {
      if let capture = self.engine {
        capture.inputNode.removeTap(onBus: 0)
        capture.stop(); capture.reset(); self.engine = nil
      }
      self.recognitionRequests.forEach { $0.endAudio() }
      self.commandFile = nil
    }.runOnQueue(.main)
    AsyncFunction("isAvailable") { () -> Bool in
      self.models?.path(forResource: "encoder", ofType: "onnx") != nil
    }
    AsyncFunction("start") { () throws in try self.startCapture() }.runOnQueue(.main)
    AsyncFunction("stop") { self.stopCapture() }.runOnQueue(.main)
    OnCreate {
      // Remove only this module's temporary clips left by a previous crash.
      let temporary = FileManager.default.temporaryDirectory
      if let files = try? FileManager.default.contentsOfDirectory(at: temporary, includingPropertiesForKeys: nil) {
        for file in files where file.lastPathComponent.hasPrefix("Avyro-command-") && file.pathExtension == "caf" { try? FileManager.default.removeItem(at: file) }
      }
      for name in [UIApplication.didEnterBackgroundNotification, AVAudioSession.interruptionNotification, AVAudioSession.routeChangeNotification] {
        self.observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] notification in
          guard let self, self.engine != nil || !self.recognitionTasks.isEmpty || self.handoffAudio != nil else { return }
          if name == AVAudioSession.routeChangeNotification {
            let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt
            if reason == AVAudioSession.RouteChangeReason.categoryChange.rawValue || reason == AVAudioSession.RouteChangeReason.routeConfigurationChange.rawValue { return }
          }
          if name == AVAudioSession.interruptionNotification,
             notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt != AVAudioSession.InterruptionType.began.rawValue { return }
          self.stopCapture()
          self.handoffAudio = nil
          self.sendEvent("failure", ["kind": "audio-interrupted", "message": "Listening paused. Re-enable voice when the app and audio are available."])
        })
      }
    }
    OnDestroy {
      self.observers.forEach(NotificationCenter.default.removeObserver)
      DispatchQueue.main.async { self.suggestions?.cancel(); self.handoffAudio = nil; self.stopCapture() }
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
    config.max_active_paths = 8
    config.num_trailing_blanks = 1
    config.keywords_score = 1.5
    config.keywords_threshold = 0.1
    config.keywords_file = UnsafePointer(pointers[4])
    let created = SherpaOnnxCreateKeywordSpotter(&config)
    guard let created else { throw wakeError("Wake model could not be loaded.") }
    guard let createdStream = SherpaOnnxCreateKeywordStream(created) else {
      SherpaOnnxDestroyKeywordSpotter(created)
      throw wakeError("Wake stream could not be created.")
    }
    inference.sync { self.spotter = created; self.stream = createdStream; self.triggered = false }
    let captureGeneration = generation
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
          self.rollingAudio.append(samples)
          self.acceptedAudioSeconds += Double(samples.count) / Double(rate)
          while self.rollingAudio.reduce(0, { $0 + $1.count }) > Int(rate) * 2 { self.rollingAudio.removeFirst() }
          samples.withUnsafeBufferPointer { ptr in
            SherpaOnnxOnlineStreamAcceptWaveform(stream, rate, ptr.baseAddress, Int32(ptr.count))
          }
          while SherpaOnnxIsKeywordStreamReady(kws, stream) != 0 {
            SherpaOnnxDecodeKeywordStream(kws, stream)
            if let result = SherpaOnnxGetKeywordResult(kws, stream) {
              let detected = result.pointee.keyword.map { String(cString: $0) } ?? ""
              let keywordStart = result.pointee.count > 0 ? result.pointee.timestamps.map { Double(result.pointee.start_time) + Double($0[0]) } : nil
              SherpaOnnxDestroyKeywordResult(result)
              if !detected.isEmpty {
                self.triggered = true
                let buffered = self.rollingAudio.flatMap { $0 }
                let bufferStart = self.acceptedAudioSeconds - Double(buffered.count) / Double(rate)
                // Preserve only the detected utterance, never the conversation
                // before the wake phrase. Missing timestamps disable pre-roll.
                var audioSamples: [Float] = []
                if let keywordStart, keywordStart.isFinite, keywordStart >= 0, keywordStart <= self.acceptedAudioSeconds {
                  let seconds = max(0, min(Double(buffered.count) / Double(rate), keywordStart - bufferStart))
                  audioSamples = Array(buffered.dropFirst(Int(seconds * Double(rate))))
                }
                DispatchQueue.main.async {
                  guard self.generation == captureGeneration else { return }
                  let at = Date()
                  self.handoffAudio = (samples: audioSamples, rate: Double(rate), at: at)
                  self.stopCapture()
                  self.sendEvent("detected", [:])
                  DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                    if self?.handoffAudio?.at == at { self?.handoffAudio = nil }
                  }
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
    commandFile = nil
    if let url = commandURL { try? FileManager.default.removeItem(at: url) }
    commandURL = nil
    inference.sync {
      if let stream { SherpaOnnxDestroyOnlineStream(stream) }
      if let spotter { SherpaOnnxDestroyKeywordSpotter(spotter) }
      stream = nil; spotter = nil; triggered = false
      rollingAudio = []
      acceptedAudioSeconds = 0
    }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    // Recognition uses measurement mode. Restore normal playback before TTS
    // so guidance does not inherit the capture session's reduced output level.
    try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.duckOthers])
  }

  // One active speech task at a time. For commands, replay the short local
  // recording through the second language after the first task completes.
  private func startSpeechCapture(locales: [String], continuous: Bool) throws {
    stopCapture()
    let handoff = handoffAudio
    handoffAudio = nil
    guard UIApplication.shared.applicationState == .active else { throw wakeError("Open Avyro to use voice.") }
    guard AVAudioSession.sharedInstance().recordPermission == .granted else { throw wakeError("Microphone permission is required.") }
    let supported = locales.reduce(into: [String]()) { result, locale in
      if ["en-US", "fr-FR"].contains(locale) && !result.contains(locale) { result.append(locale) }
    }
    guard !supported.isEmpty, supported.count <= 2 else { throw wakeError("Select French or English.") }
    let recognizers = try supported.map { locale -> SFSpeechRecognizer in
      guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale)), recognizer.isAvailable,
            recognizer.supportsOnDeviceRecognition else { throw wakeError("Download the on-device speech language in iPhone Settings.") }
      return recognizer
    }
    let currentGeneration = generation
    var primaryCompleted = false
    var secondaryCompleted = false
    var finals: [[String: Any]] = []
    speechRecognizers = recognizers
    let hints = ["Hey Avyro", "Hé Avyro", "Aviro", "What is the speed limit here", "Quelle est la limitation de vitesse ici", "Take me home", "Emmène-moi à la maison", "Paris", "Lille"]
    func event(_ result: SFSpeechRecognitionResult, _ locale: String) -> [String: Any] {
      let segments = result.bestTranscription.segments
      let confidence = segments.isEmpty ? 0 : segments.reduce(0.0) { $0 + Double($1.confidence) } / Double(segments.count)
      return ["text": result.bestTranscription.formattedString, "isFinal": result.isFinal, "locale": locale, "confidence": confidence]
    }
    func complete() {
      guard self.generation == currentGeneration else { return }
      self.stopCapture()
      if finals.isEmpty { self.sendEvent("failure", ["kind": "runtime-error", "message": "Offline recognition did not return a command. Check the installed voice languages."]) }
      else { finals.forEach { self.sendEvent("transcript", $0) }; self.sendEvent("speechEnd", [:]) }
    }
    func replaySecondary() {
      if let capture = self.engine { capture.inputNode.removeTap(onBus: 0); capture.stop(); capture.reset(); self.engine = nil }
      self.commandFile = nil
      guard !continuous, supported.count > 1, let url = self.commandURL else { complete(); return }
      let request = SFSpeechURLRecognitionRequest(url: url)
      request.requiresOnDeviceRecognition = true
      request.shouldReportPartialResults = false
      request.taskHint = .dictation
      request.contextualStrings = hints
      self.recognitionTasks.first?.cancel()
      self.recognitionTasks.append(recognizers[1].recognitionTask(with: request) { [weak self] result, error in
        DispatchQueue.main.async {
          guard let self, self.generation == currentGeneration, !secondaryCompleted else { return }
          if let result, result.isFinal { finals.append(event(result, supported[1])); secondaryCompleted = true; complete() }
          else if error != nil { secondaryCompleted = true; complete() }
        }
      })
      DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
        guard let self, self.generation == currentGeneration, !secondaryCompleted else { return }
        secondaryCompleted = true; complete()
      }
    }
    let request = SFSpeechAudioBufferRecognitionRequest()
    request.requiresOnDeviceRecognition = true
    request.shouldReportPartialResults = true
    request.taskHint = .dictation
    request.contextualStrings = hints
    recognitionRequests = [request]
    recognitionTasks = [recognizers[0].recognitionTask(with: request) { [weak self] result, error in
      DispatchQueue.main.async {
        guard let self, self.generation == currentGeneration, !primaryCompleted else { return }
        if let result {
          if result.isFinal { finals.append(event(result, supported[0])); primaryCompleted = true; replaySecondary() }
          else { self.sendEvent("transcript", event(result, supported[0])) }
        }
        if error != nil && !primaryCompleted { primaryCompleted = true; replaySecondary() }
      }
    }]
    do {
      let audio = AVAudioSession.sharedInstance()
      try audio.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothHFP])
      try audio.setActive(true)
      let capture = AVAudioEngine(), input = capture.inputNode
      let format = input.outputFormat(forBus: 0)
      guard format.sampleRate > 0, format.channelCount > 0 else { throw wakeError("No microphone is available.") }
      if !continuous && supported.count > 1 {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Avyro-command-\(UUID().uuidString).caf")
        commandURL = url
        commandFile = try AVAudioFile(forWriting: url, settings: format.settings)
      }
      if let handoff, !handoff.samples.isEmpty, Date().timeIntervalSince(handoff.at) < 2,
         let sourceFormat = AVAudioFormat(standardFormatWithSampleRate: handoff.rate, channels: 1),
         let source = AVAudioPCMBuffer(pcmFormat: sourceFormat, frameCapacity: AVAudioFrameCount(handoff.samples.count)),
         let converter = AVAudioConverter(from: sourceFormat, to: format),
         let converted = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(Double(handoff.samples.count) * format.sampleRate / handoff.rate + 1024)) {
        source.frameLength = AVAudioFrameCount(handoff.samples.count)
        handoff.samples.withUnsafeBufferPointer { values in source.floatChannelData?[0].update(from: values.baseAddress!, count: values.count) }
        var provided = false
        var conversionError: NSError?
        _ = converter.convert(to: converted, error: &conversionError) { _, status in
          if provided { status.pointee = .endOfStream; return nil }
          provided = true; status.pointee = .haveData; return source
        }
        if conversionError == nil && converted.frameLength > 0 { request.append(converted); try commandFile?.write(from: converted) }
      }
      let recordingFile = commandFile
      input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
        request.append(buffer)
        try? recordingFile?.write(from: buffer)
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
