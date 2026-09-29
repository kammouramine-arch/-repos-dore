import XCTest
@testable import DoOnceCore

final class AnalysisFrameSamplerTests: XCTestCase {
    func testMarkersFirstThenMomentsThenSpreadWithinCap() {
        let sampler = AnalysisFrameSampler(maxFrames: 4, minSpacing: 1.5, leadIn: 0.8)
        let moments = [
            DetectedMoment(time: 10, kind: .speechCue, confidence: 0.7),
            DetectedMoment(time: 30, kind: .speechCue, confidence: 0.9),
        ]
        let times = sampler.times(duration: 60, moments: moments, markers: [20])
        XCTAssertEqual(times.count, 4)
        XCTAssertEqual(times, times.sorted())
        XCTAssertTrue(times.contains(20.8), "the user's marker is always seen")
        XCTAssertTrue(times.contains(30.8))
        XCTAssertTrue(times.contains(10.8))
    }

    func testFramesStayInsideTheRecordingAndApart() {
        let sampler = AnalysisFrameSampler()
        let times = sampler.times(duration: 12, moments: [DetectedMoment(time: 11.9, kind: .speechCue)], markers: [0, 0.2, 0.4])
        XCTAssertLessThanOrEqual(times.count, 10)
        XCTAssertTrue(times.allSatisfy { $0 >= 0 && $0 <= 11.7 })
        for (a, b) in zip(times, times.dropFirst()) { XCTAssertGreaterThanOrEqual(b - a, 1.2 - 1e-9) }
    }

    func testSilentRecordingStillGetsAnEvenSpread() {
        let times = AnalysisFrameSampler(maxFrames: 5).times(duration: 50, moments: [], markers: [])
        XCTAssertEqual(times, [5, 15, 25, 35, 45])
    }

    func testEmptyRecordingHasNoFrames() {
        XCTAssertEqual(AnalysisFrameSampler().times(duration: 0, moments: [], markers: [1]), [])
    }

    func testFrameIDs() {
        XCTAssertEqual(AnalysisFrameSampler.frameID(0), "f1")
        XCTAssertEqual(AnalysisFrameSampler.frameID(11), "f12")
    }
}

/// Captures the request so tests can see what reached the provider.
actor RequestSpy: ProcedureAnalysisService {
    private(set) var last: ProcedureAnalysisRequest?
    nonisolated var readsKeyFrames: Bool { true }
    func analyze(_ request: ProcedureAnalysisRequest) async throws -> ProcedureAnalysisResponse {
        last = request
        return ProcedureAnalysisResponse(title: "T", steps: [AnalyzedStep(order: 1, instruction: "Open the valve.", sourceStart: 0, sourceEnd: 5, keyFrameReference: "f1", confidence: 0.9, provenance: .observed)])
    }
}

final class FrameAwareGenerationTests: XCTestCase {
    func testOnlyProvidersThatLookAskForFrames() {
        XCTAssertFalse(AnalysisBackedGenerationService(analysis: DeterministicProcedureAnalysisService()).wantsKeyFrames)
        XCTAssertFalse(AnalysisBackedGenerationService(analysis: UnconfiguredProcedureAnalysisService()).wantsKeyFrames)
        let gateway = GatewayProcedureAnalysisService(baseURL: URL(string: "https://x.example")!, transport: StubTransport([]), credentials: AnonymousCredentials())
        XCTAssertTrue(AnalysisBackedGenerationService(analysis: gateway).wantsKeyFrames)
    }

    func testFramesReachTheProviderAndThePinnedFrameBecomesTheStepPicture() async throws {
        let spy = RequestSpy()
        let frame = KeyFrameReference(id: "f1", time: 1.2, jpegBase64: "AAAA")
        let picture = MediaRef(kind: .image, localURL: URL(fileURLWithPath: "/tmp/f1.jpg"), sourceOffset: 1.2)
        let service = AnalysisBackedGenerationService(analysis: spy).withKeyFrames([frame], media: ["f1": picture])
        let context = GenerationContext(householdID: UUID(), creatorID: UUID())
        let memory = try await service.generateMemory(from: SampleData.boilerRecording, transcript: SampleTranscripts.boilerRepressurise, analysis: nil, context: context)
        let sent = await spy.last
        XCTAssertEqual(sent?.keyFrames, [frame])
        XCTAssertEqual(memory.orderedSteps.first?.keyFrame, picture)
    }
}

final class GatewaySessionExchangeTests: XCTestCase {
    let base = URL(string: "https://gw.example/functions/v1/doonce-analyze")!

    func testExchangesTheAppleTokenForAGatewaySession() async throws {
        let body = Data(#"{"accessToken":"gw.jwt.sig","expiresAt":"2026-10-29T12:00:00Z","tokenType":"Bearer"}"#.utf8)
        let transport = StubTransport([.respond(HTTPResponse(status: 200, body: body))])
        let outcome = try await GatewaySessionExchange(baseURL: base, transport: transport).exchange(appleIdentityToken: "apple-token")
        guard case .session(let session) = outcome else { return XCTFail("expected a session") }
        XCTAssertEqual(session.accessToken, "gw.jwt.sig")
        XCTAssertEqual(session.expiresAt, ISO8601DateFormatter().date(from: "2026-10-29T12:00:00Z"))
        let sent = await transport.requests.first
        XCTAssertEqual(sent?.url.absoluteString, "https://gw.example/functions/v1/doonce-analyze/v1/session")
        XCTAssertEqual(sent?.method, "POST")
        XCTAssertEqual(sent?.headers["Authorization"], "Bearer apple-token")
    }

    func testOlderGatewayWithoutSessionsIsUnsupported() async throws {
        for status in [404, 503] {
            let outcome = try await GatewaySessionExchange(baseURL: base, transport: StubTransport([.respond(HTTPResponse(status: status))])).exchange(appleIdentityToken: "t")
            XCTAssertEqual(outcome, .unsupported)
        }
    }

    func testRejectedAppleTokenIsUnauthorized() async {
        do {
            _ = try await GatewaySessionExchange(baseURL: base, transport: StubTransport([.respond(HTTPResponse(status: 401))])).exchange(appleIdentityToken: "t")
            XCTFail("expected unauthorized")
        } catch {
            XCTAssertEqual(error as? GatewayError, .unauthorized)
        }
    }

    func testNoConnectionIsUnavailable() async {
        do {
            _ = try await GatewaySessionExchange(baseURL: base, transport: StubTransport([.fail(URLError(.notConnectedToInternet))])).exchange(appleIdentityToken: "t")
            XCTFail("expected unavailable")
        } catch {
            XCTAssertEqual(error as? GatewayError, .unavailable)
        }
    }

    func testReadsTheExpiryOfAJWT() {
        // {"alg":"RS256"}.{"exp":1790000000,"sub":"x"}.sig
        let header = Data(#"{"alg":"RS256"}"#.utf8).base64EncodedString()
        let payload = Data(#"{"exp":1790000000,"sub":"x"}"#.utf8).base64EncodedString()
            .replacingOccurrences(of: "=", with: "").replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
        XCTAssertEqual(JWTClaims.expiry(of: "\(header).\(payload).sig"), Date(timeIntervalSince1970: 1_790_000_000))
        XCTAssertNil(JWTClaims.expiry(of: "not-a-jwt"))
    }
}
