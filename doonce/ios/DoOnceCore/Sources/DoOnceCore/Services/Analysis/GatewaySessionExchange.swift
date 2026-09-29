import Foundation

/// Trades a Sign in with Apple identity token, which Apple makes valid for minutes, for the
/// gateway's own session token, valid for weeks: `POST {baseURL}/v1/session`.
///
/// The phone never holds anything that could call the model provider directly; the session token
/// only opens this gateway, for this user.
public struct GatewaySessionExchange: Sendable {
    public static let sessionPath = "v1/session"

    public struct Session: Sendable, Equatable {
        public var accessToken: String
        public var expiresAt: Date
    }

    public enum Outcome: Sendable, Equatable {
        case session(Session)
        /// The gateway has no session endpoint or sessions are switched off (404, 503): keep
        /// using the Apple token until it expires.
        case unsupported
    }

    private struct Body: Decodable {
        var accessToken: String
        var expiresAt: Date
    }

    public var baseURL: URL
    public var transport: any HTTPTransport
    public var clientVersion: String

    public init(baseURL: URL, transport: any HTTPTransport, clientVersion: String = "1.0") {
        self.baseURL = baseURL
        self.transport = transport
        self.clientVersion = clientVersion
    }

    public func exchange(appleIdentityToken token: String) async throws -> Outcome {
        let request = HTTPRequest(
            url: baseURL.appendingPathComponent(Self.sessionPath),
            method: "POST",
            headers: [
                "Authorization": "Bearer \(token)",
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-DoOnce-Client": "ios/\(clientVersion)",
            ],
            body: Data("{}".utf8)
        )
        let response: HTTPResponse
        do {
            response = try await transport.send(request)
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            throw GatewayError.unavailable
        }
        switch response.status {
        case 200..<300:
            guard let body = try? StoreCoding.decoder().decode(Body.self, from: response.body), !body.accessToken.isEmpty else {
                throw GatewayError.malformedResponse
            }
            return .session(Session(accessToken: body.accessToken, expiresAt: body.expiresAt))
        case 401, 403:
            throw GatewayError.unauthorized
        case 404, 501, 503:
            return .unsupported
        case 400..<500:
            throw GatewayError.rejected(status: response.status, message: GatewayProcedureAnalysisService.message(in: response.body))
        default:
            throw GatewayError.unavailable
        }
    }
}

/// Reads the `exp` claim of a JWT without verifying it: only to know locally when a token Apple
/// issued stops being worth sending. The gateway does the verifying.
public enum JWTClaims {
    public static func expiry(of token: String) -> Date? {
        let parts = token.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 3 else { return nil }
        var payload = parts[1].replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload += "=" }
        guard let data = Data(base64Encoded: payload),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = (object["exp"] as? NSNumber)?.doubleValue else { return nil }
        return Date(timeIntervalSince1970: exp)
    }
}
