import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// The smallest HTTP surface the gateway client needs, so tests can script responses without a server.
public struct HTTPRequest: Sendable, Hashable {
    public var url: URL
    public var method: String
    public var headers: [String: String]
    public var body: Data?

    public init(url: URL, method: String = "GET", headers: [String: String] = [:], body: Data? = nil) {
        self.url = url
        self.method = method
        self.headers = headers
        self.body = body
    }
}

public struct HTTPResponse: Sendable, Hashable {
    public var status: Int
    public var headers: [String: String]
    public var body: Data

    public init(status: Int, headers: [String: String] = [:], body: Data = Data()) {
        self.status = status
        self.headers = headers
        self.body = body
    }

    public var isSuccess: Bool { (200..<300).contains(status) }
}

/// Sends one request and returns whatever came back. Throws only when nothing came back at all
/// (no connection, timeout); an HTTP error status is a response, not an error.
public protocol HTTPTransport: Sendable {
    func send(_ request: HTTPRequest) async throws -> HTTPResponse
}

public enum HTTPTransportError: Swift.Error, Equatable {
    /// The server answered with something that was not HTTP.
    case notHTTP
    case cancelled
}

/// The real transport, on `URLSession`. Works on Linux through `FoundationNetworking`.
public struct URLSessionTransport: HTTPTransport {
    public var session: URLSession
    public var timeout: TimeInterval

    public init(session: URLSession = .shared, timeout: TimeInterval = 120) {
        self.session = session
        self.timeout = timeout
    }

    public func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        var urlRequest = URLRequest(url: request.url, timeoutInterval: timeout)
        urlRequest.httpMethod = request.method
        urlRequest.httpBody = request.body
        for (name, value) in request.headers {
            urlRequest.setValue(value, forHTTPHeaderField: name)
        }

        // A continuation over dataTask rather than the async API, so behaviour is identical on
        // Darwin and swift-corelibs-foundation.
        let (data, response): (Data, URLResponse) = try await withCheckedThrowingContinuation { continuation in
            let task = session.dataTask(with: urlRequest) { data, response, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let response {
                    continuation.resume(returning: (data ?? Data(), response))
                } else {
                    continuation.resume(throwing: HTTPTransportError.notHTTP)
                }
            }
            task.resume()
        }

        guard let http = response as? HTTPURLResponse else { throw HTTPTransportError.notHTTP }
        var headers: [String: String] = [:]
        for (name, value) in http.allHeaderFields {
            if let name = name as? String, let value = value as? String { headers[name] = value }
        }
        return HTTPResponse(status: http.statusCode, headers: headers, body: data)
    }
}
