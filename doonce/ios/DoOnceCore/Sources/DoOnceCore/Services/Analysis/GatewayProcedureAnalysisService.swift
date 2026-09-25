import Foundation

/// Supplies the `Authorization` header for gateway calls; nil means call anonymously.
public protocol GatewayCredentials: Sendable {
    func authorizationHeader() async throws -> String?
}

/// Credentials that never authenticate.
public struct AnonymousCredentials: GatewayCredentials {
    public init() {}
    public func authorizationHeader() async throws -> String? { nil }
}

/// Why a gateway call did not produce a response the app can use.
public enum GatewayError: Swift.Error, Equatable {
    /// 401 or 403: sign in again.
    case unauthorized
    /// Any other 4xx: the request itself was wrong, retrying will not help.
    case rejected(status: Int, message: String)
    /// 5xx, timeout or no connection, after every retry.
    case unavailable
    /// 2xx with a body that is not a `ProcedureAnalysisResponse`.
    case malformedResponse
    /// No gateway URL was configured for this build.
    case notConfigured
}

/// Calls `POST {baseURL}/v1/analyze` on the DoOnce gateway.
///
/// Retries only what can succeed on retry (5xx, timeouts, dropped connections) with a short
/// backoff, and sends `Idempotency-Key: <recordingID>` so a retried analysis is never billed or
/// stored twice. 4xx answers are final. The body is the request as camelCase JSON with ISO-8601 dates.
public struct GatewayProcedureAnalysisService: ProcedureAnalysisService {
    public static let analyzePath = "v1/analyze"

    public var baseURL: URL
    public var transport: any HTTPTransport
    public var credentials: any GatewayCredentials
    public var timeout: TimeInterval
    public var maxAttempts: Int
    /// Sent as `X-DoOnce-Client: ios/<clientVersion>`.
    public var clientVersion: String
    /// Delay before attempt 2, 3, …; the last value repeats.
    public var retryDelays: [TimeInterval]
    /// How to wait; tests inject a no-op.
    public var sleep: @Sendable (TimeInterval) async throws -> Void

    public init(
        baseURL: URL,
        transport: any HTTPTransport,
        credentials: any GatewayCredentials,
        timeout: TimeInterval = 120,
        maxAttempts: Int = 3,
        clientVersion: String = "1.0",
        retryDelays: [TimeInterval] = [0.5, 1],
        sleep: @escaping @Sendable (TimeInterval) async throws -> Void = { try await Task.sleep(for: .seconds($0)) }
    ) {
        self.baseURL = baseURL
        self.transport = transport
        self.credentials = credentials
        self.timeout = timeout
        self.maxAttempts = max(1, maxAttempts)
        self.clientVersion = clientVersion
        self.retryDelays = retryDelays
        self.sleep = sleep
    }

    public func analyze(_ request: ProcedureAnalysisRequest) async throws -> ProcedureAnalysisResponse {
        let httpRequest = try await makeRequest(request)
        var attempt = 0
        while true {
            attempt += 1
            let response: HTTPResponse
            do {
                response = try await send(httpRequest)
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                guard attempt < maxAttempts else { throw GatewayError.unavailable }
                try await sleep(delay(beforeAttempt: attempt + 1))
                continue
            }

            switch response.status {
            case 200..<300:
                return try decode(response.body)
            case 401, 403:
                throw GatewayError.unauthorized
            case 400..<500:
                throw GatewayError.rejected(status: response.status, message: Self.message(in: response.body))
            default:
                guard attempt < maxAttempts else { throw GatewayError.unavailable }
                try await sleep(delay(beforeAttempt: attempt + 1))
            }
        }
    }

    /// The exact request that will be sent, for logging and tests.
    public func makeRequest(_ request: ProcedureAnalysisRequest) async throws -> HTTPRequest {
        var headers = [
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-DoOnce-Client": "ios/\(clientVersion)",
            "Idempotency-Key": request.recordingID.uuidString,
        ]
        if let authorization = try await credentials.authorizationHeader() {
            headers["Authorization"] = authorization
        }
        return HTTPRequest(url: baseURL.appendingPathComponent(Self.analyzePath), method: "POST", headers: headers, body: try StoreCoding.encoder().encode(request))
    }

    func delay(beforeAttempt attempt: Int) -> TimeInterval {
        guard let last = retryDelays.last else { return 0 }
        let index = attempt - 2
        return index < retryDelays.count ? retryDelays[max(0, index)] : last
    }

    /// The transport's own timeout may be longer than ours; race it so a hung connection retries.
    private func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        let transport = self.transport
        let timeout = self.timeout
        return try await withThrowingTaskGroup(of: HTTPResponse.self) { group in
            group.addTask { try await transport.send(request) }
            group.addTask {
                try await Task.sleep(for: .seconds(timeout))
                throw GatewayError.unavailable
            }
            let first = try await group.next()!
            group.cancelAll()
            return first
        }
    }

    private func decode(_ body: Data) throws -> ProcedureAnalysisResponse {
        do {
            return try StoreCoding.decoder().decode(ProcedureAnalysisResponse.self, from: body)
        } catch {
            throw GatewayError.malformedResponse
        }
    }

    /// `{"message": …}` or `{"error": …}` when the gateway explains itself; the raw text otherwise.
    static func message(in body: Data) -> String {
        if let object = try? JSONSerialization.jsonObject(with: body) as? [String: Any] {
            if let message = object["message"] as? String { return message }
            if let error = object["error"] as? String { return error }
        }
        return String(data: body, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }
}
