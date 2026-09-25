import XCTest
@testable import DoOnceCore

final class AnalysisContractTests: XCTestCase {
    let recording = SampleData.boilerRecording
    let transcript = SampleTranscripts.boilerRepressurise
    let analysis = SampleTranscripts.boilerRepressuriseAnalysis
    let context = GenerationContext(householdID: SampleIDs.household, creatorID: SampleIDs.amine, objectID: SampleIDs.boiler, spaceID: SampleIDs.utilityRoom, demonstratorID: SampleIDs.julien)

    var request: ProcedureAnalysisRequest {
        ProcedureAnalysisRequest(
            recordingID: recording.id, duration: recording.duration, locale: "en", transcript: transcript,
            markers: [35], moments: analysis.moments,
            keyFrames: [KeyFrameReference(id: "kf-14", time: 14, jpegBase64: "/9j/4AAQ"), KeyFrameReference(id: "kf-36", time: 36, url: URL(string: "https://media.doonce.app/frames/kf-36.jpg")), KeyFrameReference(id: "kf-40", time: 40)],
            objectHint: ObjectHint(SampleData.objects[0]), demonstratorName: "Julien"
        )
    }

    func testRequestAndResponseUseCamelCaseJSON() throws {
        let data = try StoreCoding.encoder().encode(request)
        let text = try XCTUnwrap(String(data: data, encoding: .utf8))
        for key in ["\"recordingID\"", "\"keyFrames\"", "\"jpegBase64\"", "\"objectHint\"", "\"demonstratorName\"", "\"userMarked\""] {
            XCTAssertTrue(text.contains(key), "missing \(key)")
        }
        XCTAssertFalse(text.contains("recording_id"))
        XCTAssertEqual(try StoreCoding.decoder().decode(ProcedureAnalysisRequest.self, from: data), request)

        let step = AnalyzedStep(order: 1, instruction: "Open the valve.", sourceStart: 14, sourceEnd: 35, sourceTranscript: "open this black valve", keyFrameReference: "kf-14", confidence: 0.9, provenance: .observed)
        let response = ProcedureAnalysisResponse(title: "Repressurise boiler", shortDescription: "d", objectCandidate: ObjectCandidate(name: "Boiler", category: "Boiler", confidence: 0.8), durationEstimate: 118, tools: [], warnings: ["Blue first"], riskLevel: .medium, steps: [step], uncertainties: [])
        let encoded = try StoreCoding.encoder().encode(response)
        XCTAssertTrue(String(decoding: encoded, as: UTF8.self).contains("\"keyFrameReference\" : \"kf-14\""))
        XCTAssertEqual(try StoreCoding.decoder().decode(ProcedureAnalysisResponse.self, from: encoded), response)
        XCTAssertEqual(step.id, "1")
        XCTAssertEqual(AnalyzedStep(order: 2, instruction: "x", sourceStart: 5, confidence: 1, provenance: .inferred).sourceRange, 5...5)
    }

    func testDeterministicProviderReproducesTheAssembler() async throws {
        let response = try await DeterministicProcedureAnalysisService().analyze(request)
        let expected = ProcedureAssembler().assemble(transcript: transcript, moments: analysis.moments)
        XCTAssertEqual(response.steps.map(\.instruction), expected.steps.map(\.instruction))
        XCTAssertEqual(response.steps.map(\.provenance), expected.steps.map(\.provenance))
        XCTAssertEqual(response.steps.map(\.sourceStart), expected.steps.map { $0.sourceRange?.lowerBound })
        XCTAssertEqual(response.steps.map(\.sourceTranscript), expected.steps.map(\.sourceTranscript))
        XCTAssertEqual(response.steps.map(\.keyFrameReference), [nil, "kf-14", "kf-36", nil, nil], "closest frame inside each step's window")
        XCTAssertEqual(response.title, "Repressurise boiler")
        XCTAssertEqual(response.riskLevel, .medium)
        XCTAssertEqual(response.warnings, expected.warnings.map(\.text))
        XCTAssertEqual(response.objectCandidate?.brand, "Vaillant")
        XCTAssertTrue(response.steps.allSatisfy { $0.confidence == 0.9 })

        var markersOnly = request
        markersOnly.moments = []
        markersOnly.markers = [0, 35]
        let fromMarkers = try await DeterministicProcedureAnalysisService().analyze(markersOnly)
        XCTAssertEqual(fromMarkers.steps.count, 2)
        XCTAssertEqual(fromMarkers.steps.map(\.provenance), [.observed, .observed])
    }

    func testMapperCarriesEverythingIntoTheMemory() throws {
        let step = AnalyzedStep(order: 1, instruction: "Stop when the pressure reaches 1.5 bar.", detail: "Watch the needle.", sourceStart: 58, sourceEnd: 86, sourceTranscript: "Stop when the pressure reaches 1.5 bar.", keyFrameReference: "kf-40", warning: "Never open it fast.", confidence: 0.9, provenance: .observed)
        let response = ProcedureAnalysisResponse(title: "From provider", shortDescription: "Summary", tools: ["radiator key"], warnings: ["Blue first, always.", "Careful, it's hot."], riskLevel: .medium, steps: [step])
        let frame = MediaRef(kind: .image, localURL: URL(string: "file:///frames/00040.000.jpg")!, sourceOffset: 40)
        let clip = MediaRef(kind: .video, localURL: URL(string: "file:///clips/step-01.mp4")!, sourceOffset: 58, duration: 28)

        let memory = MemoryMapper.memory(from: response, request: request, context: context, keyFrames: ["kf-40": frame], clips: [1: clip])
        XCTAssertEqual(memory.title, "From provider")
        XCTAssertEqual(memory.summary, "Summary")
        XCTAssertEqual(memory.householdID, SampleIDs.household)
        XCTAssertEqual(memory.objectID, SampleIDs.boiler)
        XCTAssertEqual(memory.spaceID, SampleIDs.utilityRoom)
        XCTAssertEqual(memory.demonstratorID, SampleIDs.julien)
        XCTAssertEqual(memory.creatorID, SampleIDs.amine)
        XCTAssertEqual(memory.sourceRecordingID, recording.id)
        XCTAssertEqual(memory.duration, recording.duration)
        XCTAssertEqual(memory.riskLevel, .medium)
        XCTAssertEqual(memory.tools, ["radiator key"])
        XCTAssertEqual(memory.warnings.map(\.text), ["Blue first, always.", "Careful, it's hot."])
        XCTAssertEqual(memory.warnings.map(\.trigger), ["always", "careful"])
        XCTAssertEqual(memory.warnings.map(\.severity), [.medium, .medium])

        let mapped = try XCTUnwrap(memory.steps.first)
        XCTAssertEqual(mapped.sourceRange, 58...86)
        XCTAssertEqual(mapped.sourceTranscript, step.sourceTranscript)
        XCTAssertEqual(mapped.details, "Watch the needle.")
        XCTAssertEqual(mapped.keyFrame, frame)
        XCTAssertEqual(mapped.clip, clip)
        XCTAssertEqual(mapped.warning?.text, "Never open it fast.")
        XCTAssertEqual(mapped.warning?.trigger, "never")
        XCTAssertEqual(mapped.provenance, .observed)
        XCTAssertEqual(mapped.completionRule, .gaugeReaches(value: 1.5, unit: "bar"))

        var titled = context
        titled.preferredTitle = "My title"
        XCTAssertEqual(MemoryMapper.memory(from: response, request: request, context: titled, keyFrames: [:]).title, "My title")
        let plain = AnalyzedStep(order: 1, instruction: "Open the lid.", confidence: 0.9, provenance: .observed)
        XCTAssertEqual(MemoryMapper.step(from: plain, keyFrames: [:], clips: [:]).completionRule, .manual)
    }

    func testAnalysisBackedServiceMatchesTheMockPipeline() async throws {
        let backed = AnalysisBackedGenerationService(analysis: DeterministicProcedureAnalysisService())
        let memory = try await backed.generateMemory(from: recording, transcript: transcript, analysis: analysis, context: context)
        let mock = try await MockProcedureGenerationService().generateMemory(from: recording, transcript: transcript, analysis: analysis, context: context)

        XCTAssertEqual(memory.title, "Repressurise boiler")
        XCTAssertEqual(memory.steps.map(\.instruction), mock.steps.map(\.instruction))
        XCTAssertEqual(memory.steps.map(\.provenance), mock.steps.map(\.provenance))
        XCTAssertEqual(memory.steps.map(\.sourceRange), mock.steps.map(\.sourceRange))
        XCTAssertEqual(memory.steps.map(\.completionRule), mock.steps.map(\.completionRule))
        XCTAssertEqual(memory.steps.map(\.warning?.text), mock.steps.map(\.warning?.text))
        XCTAssertEqual(memory.steps.map(\.clip), mock.steps.map(\.clip))
        XCTAssertEqual(memory.riskLevel, .medium)
        XCTAssertEqual(memory.tools, mock.tools)
        XCTAssertEqual(memory.createdAt, recording.recordedAt)
        XCTAssertEqual(memory.sourceRecordingID, recording.id)
    }

    func testAnalysisBackedServiceAppliesTheValidator() async throws {
        let provider = ScriptedAnalysisService(response: ProcedureAnalysisResponse(
            title: "  ",
            steps: [AnalyzedStep(order: 2, instruction: "Set it to 3 bar.", sourceStart: 500, sourceEnd: 600, confidence: 0.95, provenance: .observed)]
        ))
        let backed = AnalysisBackedGenerationService(analysis: provider, untitledFallback: "Untitled")
        let memory = try await backed.generateMemory(from: recording, transcript: transcript, analysis: analysis, context: context)
        XCTAssertEqual(memory.title, "Untitled")
        XCTAssertEqual(memory.steps.count, 1)
        XCTAssertEqual(memory.steps[0].order, 1)
        XCTAssertEqual(memory.steps[0].provenance, .inferred)
        XCTAssertEqual(memory.steps[0].sourceRange, 118...118)
        XCTAssertEqual(memory.riskLevel, .medium, "the transcript talks about a boiler and pressure")
    }
}

/// A provider that returns a fixed response.
struct ScriptedAnalysisService: ProcedureAnalysisService {
    var response: ProcedureAnalysisResponse
    func analyze(_ request: ProcedureAnalysisRequest) async throws -> ProcedureAnalysisResponse { response }
}
