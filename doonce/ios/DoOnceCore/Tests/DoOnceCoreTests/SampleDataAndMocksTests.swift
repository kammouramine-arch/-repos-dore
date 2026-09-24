import XCTest
@testable import DoOnceCore

final class SampleDataTests: XCTestCase {
    func testSeedShape() {
        let snapshot = SampleData.snapshot
        XCTAssertEqual(snapshot.households.first?.name, "Home")
        XCTAssertEqual(snapshot.households.first?.members.count, 2)
        XCTAssertEqual(snapshot.spaces.map(\.name), ["Kitchen", "Utility room", "Garage"])
        XCTAssertEqual(snapshot.objects.count, 6)
        XCTAssertEqual(snapshot.memories(forObject: SampleIDs.boiler).count, 3)
        XCTAssertEqual(snapshot.memories(forObject: SampleIDs.espressoMachine).count, 5)
        XCTAssertEqual(snapshot.memories.count, 12)
        XCTAssertEqual(snapshot.people.filter(\.isSelf).count, 1)
        XCTAssertNotNil(snapshot.person(id: SampleIDs.julien)?.contact?.phone)
    }

    func testJuliensMemoryHasProvenanceEverywhere() throws {
        let memory = try XCTUnwrap(SampleData.snapshot.memory(id: SampleIDs.repressuriseBoiler))
        XCTAssertEqual(memory.demonstratorID, SampleIDs.julien)
        XCTAssertEqual(FreshnessPolicy.utcCalendar.dateComponents([.year, .month, .day], from: memory.createdAt), DateComponents(year: 2026, month: 3, day: 18))
        XCTAssertEqual(memory.steps.count, 5)
        XCTAssertEqual(memory.steps[3].completionRule, .gaugeReaches(value: 1.5, unit: "bar"))
        XCTAssertTrue(memory.steps.allSatisfy { $0.sourceRange != nil && $0.sourceTranscript != nil && $0.clip != nil })
        XCTAssertEqual(memory.sourceRecordingID, SampleIDs.boilerRecording)
        XCTAssertEqual(SampleData.boilerRecording.transcript?.segments.count, 16)
        XCTAssertFalse(SampleData.boilerRecording.transcript?.segments[0].words.isEmpty ?? true)
    }

    func testInProgressMemory() {
        let progress = SampleData.espressoProgress
        XCTAssertEqual(progress.completedCount, 2)
        XCTAssertEqual(progress.totalSteps, 7)
        XCTAssertEqual(progress.nextStepOrder, 3)
        XCTAssertFalse(progress.isComplete)
        XCTAssertEqual(SampleData.snapshot.memory(id: progress.memoryID)?.steps.count, 7)
    }

    func testRiskLevelsAndAuthors() {
        let snapshot = SampleData.snapshot
        XCTAssertEqual(snapshot.memory(id: SampleIDs.emergencyShutoff)?.riskLevel, .high)
        XCTAssertEqual(snapshot.memory(id: SampleIDs.resetRouter)?.creatorID, SampleIDs.alex)
        XCTAssertEqual(snapshot.memory(id: SampleIDs.dadsSettings)?.demonstratorID, SampleIDs.dad)
    }

    func testSnapshotRoundTripsThroughJSON() throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let data = try encoder.encode(SampleData.snapshot)
        let decoded = try decoder.decode(MemoryStoreSnapshot.self, from: data)
        XCTAssertEqual(decoded, SampleData.snapshot)
    }

    func testStepIDsAreUnique() {
        let ids = SampleData.memories.flatMap(\.steps).map(\.id)
        XCTAssertEqual(ids.count, Set(ids).count)
    }
}

final class MockGenerationTests: XCTestCase {
    func testMockPipelineProducesARealMemoryFromTheTranscript() async throws {
        let recording = SampleData.boilerRecording
        let transcript = try await MockTranscriptionService().transcribe(recording)
        XCTAssertEqual(transcript.segments.count, 16)
        XCTAssertEqual(transcript.segments[9].words.first?.text, "Stop")

        let context = GenerationContext(householdID: SampleIDs.household, creatorID: SampleIDs.amine, objectID: SampleIDs.boiler, demonstratorID: SampleIDs.julien)
        let memory = try await MockProcedureGenerationService().generateMemory(from: recording, transcript: transcript, analysis: recording.analysis, context: context)

        XCTAssertEqual(memory.title, "Repressurise boiler")
        XCTAssertEqual(memory.steps.count, 5)
        XCTAssertEqual(memory.riskLevel, .medium)
        XCTAssertEqual(memory.sourceRecordingID, recording.id)
        XCTAssertEqual(memory.steps[3].completionRule, .gaugeReaches(value: 1.5, unit: "bar"))
        XCTAssertTrue(memory.steps.allSatisfy { $0.clip?.localURL == recording.localURL })
        XCTAssertEqual(memory.steps[2].clip?.sourceOffset, 35)
        XCTAssertFalse(memory.warnings.isEmpty)
    }

    func testDifferentTranscriptGivesDifferentSteps() async throws {
        let transcript = Transcript(segments: [
            TranscriptSegment(start: 0, end: 5, text: "Unplug the router."),
            TranscriptSegment(start: 5, end: 12, text: "Wait thirty seconds, then plug it back in."),
        ])
        var recording = SampleData.boilerRecording
        recording.userMarkers = [0, 5]
        let context = GenerationContext(householdID: SampleIDs.household, creatorID: SampleIDs.alex, preferredTitle: "Reset router")
        let memory = try await MockProcedureGenerationService().generateMemory(from: recording, transcript: transcript, analysis: nil, context: context)
        XCTAssertEqual(memory.title, "Reset router")
        XCTAssertEqual(memory.steps.map(\.instruction), ["Unplug the router.", "Wait thirty seconds, then plug it back in."])
        XCTAssertEqual(memory.riskLevel, .low)
    }
}
