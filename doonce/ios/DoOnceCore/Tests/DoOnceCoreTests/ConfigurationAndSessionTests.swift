import XCTest
@testable import DoOnceCore

final class ServiceConfigurationTests: XCTestCase {
    func testDefaultsToDemoWithoutAGatewayAndLiveWithOne() {
        let demo = ServiceConfiguration.resolve(environment: [:], info: [:])
        XCTAssertEqual(demo.mode, .demo)
        XCTAssertFalse(demo.isLive)
        XCTAssertTrue(demo.sampleContent)
        XCTAssertNil(demo.gatewayURL)

        let live = ServiceConfiguration.resolve(environment: [:], info: ["DoOnceGatewayURL": "https://api.doonce.app", "DoOnceProductIDs": ["app.doonce.plus.monthly", "app.doonce.plus.yearly"]])
        XCTAssertEqual(live.mode, .live)
        XCTAssertTrue(live.isLive)
        XCTAssertFalse(live.sampleContent)
        XCTAssertEqual(live.gatewayURL, URL(string: "https://api.doonce.app"))
        XCTAssertEqual(live.subscriptionProductIDs, ["app.doonce.plus.monthly", "app.doonce.plus.yearly"])
    }

    func testEnvironmentBeatsInfoBeatsDefault() {
        let info: [String: Any] = ["DoOnceServiceMode": "live", "DoOnceGatewayURL": "https://info.example", "DoOnceUploadEndpoint": "https://info.example/upload"]
        let fromInfo = ServiceConfiguration.resolve(environment: [:], info: info)
        XCTAssertEqual(fromInfo.mode, .live)
        XCTAssertEqual(fromInfo.gatewayURL?.host, "info.example")
        XCTAssertEqual(fromInfo.uploadEndpoint?.path, "/upload")

        let environment = ["DOONCE_SERVICE_MODE": "demo", "DOONCE_GATEWAY_URL": "https://env.example", "DOONCE_UPLOAD_ENDPOINT": "https://env.example/up"]
        let fromEnvironment = ServiceConfiguration.resolve(environment: environment, info: info)
        XCTAssertEqual(fromEnvironment.mode, .demo, "the scheme's override wins")
        XCTAssertEqual(fromEnvironment.gatewayURL?.host, "env.example")
        XCTAssertEqual(fromEnvironment.uploadEndpoint?.path, "/up")
        XCTAssertTrue(fromEnvironment.sampleContent, "demo mode seeds samples unless told otherwise")
    }

    func testSampleContentFlagAndBadValues() {
        let liveWithSamples = ServiceConfiguration.resolve(environment: ["DOONCE_SAMPLE_CONTENT": "1"], info: ["DoOnceGatewayURL": "https://api.doonce.app"])
        XCTAssertEqual(liveWithSamples.mode, .live)
        XCTAssertTrue(liveWithSamples.sampleContent)
        let demoWithout = ServiceConfiguration.resolve(environment: ["DOONCE_SERVICE_MODE": "DEMO", "DOONCE_SAMPLE_CONTENT": "0"], info: [:])
        XCTAssertEqual(demoWithout.mode, .demo)
        XCTAssertFalse(demoWithout.sampleContent)

        let garbage = ServiceConfiguration.resolve(environment: ["DOONCE_SERVICE_MODE": "staging", "DOONCE_GATEWAY_URL": "  "], info: ["DoOnceServiceMode": 7])
        XCTAssertEqual(garbage.mode, .demo, "unknown modes and blank URLs fall through to the default")
        XCTAssertNil(garbage.gatewayURL)
        XCTAssertEqual(garbage, ServiceConfiguration(mode: .demo, sampleContent: true))
    }
}

final class AuthSessionTests: XCTestCase {
    var directory: URL!

    override func setUpWithError() throws {
        directory = FileManager.default.temporaryDirectory.appendingPathComponent("doonce-session-\(UUID().uuidString)")
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: directory)
    }

    private func session(expiresAt: Date? = nil, token: String? = "tok") -> AuthSession {
        AuthSession(userID: SampleIDs.amine, provider: "apple", providerUserID: "001234.abc", displayName: "Amine", email: "amine@example.com", issuedAt: SampleDates.date(2026, 9, 25), accessToken: token, refreshToken: "ref", expiresAt: expiresAt)
    }

    func testExpiry() {
        XCTAssertFalse(session().isExpired, "no expiry means never expires")
        XCTAssertTrue(session(expiresAt: Date(timeIntervalSinceNow: -1)).isExpired)
        XCTAssertFalse(session(expiresAt: Date(timeIntervalSinceNow: 3600)).isExpired)
        XCTAssertTrue(session(expiresAt: SampleDates.date(2026, 1, 1)).isExpired(at: SampleDates.date(2026, 1, 1)))
    }

    func testFileSessionStoreRoundTripsClearsAndRestrictsPermissions() async throws {
        let store = FileSessionStore(directory: directory)
        let none = try await store.load()
        XCTAssertNil(none)
        let saved = session(expiresAt: SampleDates.date(2027, 1, 1))
        try await store.save(saved)
        let loaded = try await store.load()
        XCTAssertEqual(loaded, saved)
        XCTAssertEqual(store.fileURL.lastPathComponent, "session.json")
        let permissions = try FileManager.default.attributesOfItem(atPath: store.fileURL.path)[.posixPermissions] as? Int
        XCTAssertEqual(permissions, 0o600)

        try await store.clear()
        let cleared = try await store.load()
        XCTAssertNil(cleared)
        try await store.clear()
    }

    func testSessionCredentialsSendBearerOnlyForLiveTokens() async throws {
        let live = SessionCredentials(store: InMemorySessionStore(session: session(expiresAt: Date(timeIntervalSinceNow: 600))))
        let header = try await live.authorizationHeader()
        XCTAssertEqual(header, "Bearer tok")

        let expired = SessionCredentials(store: InMemorySessionStore(session: session(expiresAt: Date(timeIntervalSinceNow: -600))))
        let expiredHeader = try await expired.authorizationHeader()
        XCTAssertNil(expiredHeader)

        let tokenless = SessionCredentials(store: InMemorySessionStore(session: session(token: nil)))
        let tokenlessHeader = try await tokenless.authorizationHeader()
        XCTAssertNil(tokenlessHeader)

        let signedOut = SessionCredentials(store: InMemorySessionStore())
        let anonymous = try await signedOut.authorizationHeader()
        XCTAssertNil(anonymous)
    }

    func testDeleteAccountDefaultsToUnsupported() async throws {
        struct MinimalAuth: AuthService {
            func currentUser() async -> User? { nil }
            func signInWithApple(identityToken: String, displayName: String?) async throws -> User { User(displayName: "x") }
            func signIn(email: String) async throws -> User { User(displayName: "x") }
            func signOut() async {}
        }
        do {
            try await MinimalAuth().deleteAccount()
            XCTFail("expected unsupported")
        } catch {
            XCTAssertEqual(error as? AuthError, .unsupported)
        }

        let mock = MockAuthService(signedInAs: SampleData.users[0])
        try await mock.deleteAccount()
        let after = await mock.currentUser()
        XCTAssertNil(after)
    }
}
