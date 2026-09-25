import XCTest
@testable import DoOnceCore

/// Records every request and answers from a script, one entry per call; a thrown entry simulates
/// a dropped connection.
actor StubTransport: HTTPTransport {
    enum Scripted {
        case respond(HTTPResponse)
        case fail(any Error)
    }

    private(set) var requests: [HTTPRequest] = []
    private var script: [Scripted]

    init(_ script: [Scripted]) {
        self.script = script
    }

    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        requests.append(request)
        guard !script.isEmpty else { return HTTPResponse(status: 599) }
        switch script.removeFirst() {
        case .respond(let response): return response
        case .fail(let error): throw error
        }
    }
}

actor SleepRecorder {
    private(set) var delays: [TimeInterval] = []
    func record(_ delay: TimeInterval) { delays.append(delay) }
}

struct FixedCredentials: GatewayCredentials {
    var header: String?
    func authorizationHeader() async throws -> String? { header }
}

final class GatewayClientTests: XCTestCase {
    let baseURL = URL(string: "https://api.doonce.app")!
    let request = AnalysisBackedGenerationService.request(for: SampleData.boilerRecording, transcript: SampleTranscripts.boilerRepressurise, analysis: SampleTranscripts.boilerRepressuriseAnalysis, locale: "en", keyFrames: [])
    let goodResponse = ProcedureAnalysisResponse(title: "Repressurise boiler", steps: [AnalyzedStep(order: 1, instruction: "Find the filling loop.", sourceStart: 0, sourceEnd: 14, confidence: 0.9, provenance: .observed)])

    private func service(_ transport: StubTransport, credentials: String? = "Bearer token-1", maxAttempts: Int = 3, sleeper: SleepRecorder? = nil) -> GatewayProcedureAnalysisService {
        GatewayProcedureAnalysisService(
            baseURL: baseURL, transport: transport, credentials: FixedCredentials(header: credentials),
            timeout: 5, maxAttempts: maxAttempts, clientVersion: "1.2.3",
            sleep: { delay in await sleeper?.record(delay) }
        )
    }

    private func ok(_ response: ProcedureAnalysisResponse) throws -> StubTransport.Scripted {
        .respond(HTTPResponse(status: 200, headers: ["Content-Type": "application/json"], body: try StoreCoding.encoder().encode(response)))
    }

    func testSendsTheContractRequest() async throws {
        let transport = StubTransport([try ok(goodResponse)])
        let response = try await service(transport).analyze(request)
        XCTAssertEqual(response, goodResponse)

        let requests = await transport.requests
        let sent = try XCTUnwrap(requests.first)
        XCTAssertEqual(sent.url.absoluteString, "https://api.doonce.app/v1/analyze")
        XCTAssertEqual(sent.method, "POST")
        XCTAssertEqual(sent.headers["Content-Type"], "application/json")
        XCTAssertEqual(sent.headers["Accept"], "application/json")
        XCTAssertEqual(sent.headers["Authorization"], "Bearer token-1")
        XCTAssertEqual(sent.headers["X-DoOnce-Client"], "ios/1.2.3")
        XCTAssertEqual(sent.headers["Idempotency-Key"], SampleIDs.boilerRecording.uuidString)
        let body = try StoreCoding.decoder().decode(ProcedureAnalysisRequest.self, from: try XCTUnwrap(sent.body))
        XCTAssertEqual(body, request)
        XCTAssertTrue(String(decoding: sent.body!, as: UTF8.self).contains("\"recordingID\""))
    }

    func testAnonymousWhenNoCredentials() async throws {
        let transport = StubTransport([try ok(goodResponse)])
        _ = try await service(transport, credentials: nil).analyze(request)
        let requests = await transport.requests
        let sent = try XCTUnwrap(requests.first)
        XCTAssertNil(sent.headers["Authorization"])
    }

    func testRetriesServerErrorsAndConnectionFailuresThenSucceeds() async throws {
        let sleeper = SleepRecorder()
        let transport = StubTransport([.respond(HTTPResponse(status: 503)), .fail(URLError(.networkConnectionLost)), try ok(goodResponse)])
        let response = try await service(transport, sleeper: sleeper).analyze(request)
        XCTAssertEqual(response.title, "Repressurise boiler")
        let count = await transport.requests.count
        XCTAssertEqual(count, 3)
        let delays = await sleeper.delays
        XCTAssertEqual(delays, [0.5, 1])
        let keys = await transport.requests.map { $0.headers["Idempotency-Key"] }
        XCTAssertEqual(Set(keys).count, 1, "retries reuse the idempotency key")
    }

    func testGivesUpAsUnavailableAfterMaxAttempts() async throws {
        let transport = StubTransport([.respond(HTTPResponse(status: 500)), .respond(HTTPResponse(status: 502)), .respond(HTTPResponse(status: 503)), try ok(goodResponse)])
        await assertThrows(service(transport, maxAttempts: 3), .unavailable)
        let count = await transport.requests.count
        XCTAssertEqual(count, 3)
    }

    func testClientErrorsAreFinal() async throws {
        let transport = StubTransport([.respond(HTTPResponse(status: 400, body: Data("{\"message\": \"transcript too long\"}".utf8))), try ok(goodResponse)])
        await assertThrows(service(transport), .rejected(status: 400, message: "transcript too long"))
        let count = await transport.requests.count
        XCTAssertEqual(count, 1, "a 400 is not retried")

        let plain = StubTransport([.respond(HTTPResponse(status: 422, body: Data("nope\n".utf8)))])
        await assertThrows(service(plain), .rejected(status: 422, message: "nope"))
    }

    func testUnauthorized() async throws {
        for status in [401, 403] {
            let transport = StubTransport([.respond(HTTPResponse(status: status))])
            await assertThrows(service(transport), .unauthorized)
        }
    }

    func testMalformedSuccessBody() async throws {
        let transport = StubTransport([.respond(HTTPResponse(status: 200, body: Data("{\"title\": 42}".utf8)))])
        await assertThrows(service(transport), .malformedResponse)
        let count = await transport.requests.count
        XCTAssertEqual(count, 1, "a bad body from a healthy server is not retried")
    }

    func testUnconfiguredServiceRefuses() async {
        await assertThrows(UnconfiguredProcedureAnalysisService(), .notConfigured)
    }

    func testBackoffScheduleRepeatsTheLastDelay() {
        let service = GatewayProcedureAnalysisService(baseURL: baseURL, transport: StubTransport([]), credentials: AnonymousCredentials(), maxAttempts: 5)
        XCTAssertEqual(service.delay(beforeAttempt: 2), 0.5)
        XCTAssertEqual(service.delay(beforeAttempt: 3), 1)
        XCTAssertEqual(service.delay(beforeAttempt: 4), 1)
        XCTAssertEqual(GatewayProcedureAnalysisService.message(in: Data("{\"error\": \"bad\"}".utf8)), "bad")
    }

    private func assertThrows(_ service: any ProcedureAnalysisService, _ expected: GatewayError, file: StaticString = #filePath, line: UInt = #line) async {
        do {
            _ = try await service.analyze(request)
            XCTFail("expected \(expected)", file: file, line: line)
        } catch {
            XCTAssertEqual(error as? GatewayError, expected, file: file, line: line)
        }
    }
}
