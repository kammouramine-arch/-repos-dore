import Foundation

/// Whether the app talks to real services or runs entirely on device with sample content.
public enum ServiceMode: String, Codable, Sendable {
    case live
    case demo
}

/// Where the app's services are, resolved once at launch.
///
/// Precedence is environment variable, then Info.plist, then a default, so a developer can
/// override a build's configuration from the Xcode scheme without touching the plist, and CI can
/// force demo mode with no gateway at all.
public struct ServiceConfiguration: Sendable, Equatable {
    public var mode: ServiceMode
    public var gatewayURL: URL?
    public var uploadEndpoint: URL?
    public var subscriptionProductIDs: [String]
    /// Seed the store with `SampleData` on first run.
    public var sampleContent: Bool

    public init(mode: ServiceMode, gatewayURL: URL? = nil, uploadEndpoint: URL? = nil, subscriptionProductIDs: [String] = [], sampleContent: Bool = false) {
        self.mode = mode
        self.gatewayURL = gatewayURL
        self.uploadEndpoint = uploadEndpoint
        self.subscriptionProductIDs = subscriptionProductIDs
        self.sampleContent = sampleContent
    }

    public var isLive: Bool { mode == .live }

    /// Keys read from the process environment.
    public enum EnvironmentKey {
        public static let mode = "DOONCE_SERVICE_MODE"
        public static let gatewayURL = "DOONCE_GATEWAY_URL"
        public static let uploadEndpoint = "DOONCE_UPLOAD_ENDPOINT"
        public static let sampleContent = "DOONCE_SAMPLE_CONTENT"
    }

    /// Keys read from the app's Info.plist.
    public enum InfoKey {
        public static let mode = "DoOnceServiceMode"
        public static let gatewayURL = "DoOnceGatewayURL"
        public static let uploadEndpoint = "DoOnceUploadEndpoint"
        public static let productIDs = "DoOnceProductIDs"
    }

    /// Resolves the configuration from `environment` (highest precedence) and `info` (the Info.plist).
    ///
    /// - mode: `DOONCE_SERVICE_MODE` > `DoOnceServiceMode` > live when a gateway URL exists, else demo.
    /// - gateway: `DOONCE_GATEWAY_URL` > `DoOnceGatewayURL`; upload: `DOONCE_UPLOAD_ENDPOINT` > `DoOnceUploadEndpoint`.
    /// - products: `DoOnceProductIDs` (array of strings).
    /// - sampleContent: `DOONCE_SAMPLE_CONTENT == "1"`, else false in live and true in demo.
    public static func resolve(environment: [String: String], info: [String: Any]) -> ServiceConfiguration {
        let gatewayURL = url(environment[EnvironmentKey.gatewayURL]) ?? url(info[InfoKey.gatewayURL] as? String)
        let uploadEndpoint = url(environment[EnvironmentKey.uploadEndpoint]) ?? url(info[InfoKey.uploadEndpoint] as? String)
        let products = (info[InfoKey.productIDs] as? [String]) ?? (info[InfoKey.productIDs] as? [Any])?.compactMap { $0 as? String } ?? []

        let mode = ServiceMode(rawValue: environment[EnvironmentKey.mode]?.lowercased() ?? "")
            ?? ServiceMode(rawValue: (info[InfoKey.mode] as? String)?.lowercased() ?? "")
            ?? (gatewayURL == nil ? .demo : .live)

        let sampleContent: Bool
        if let flag = environment[EnvironmentKey.sampleContent] {
            sampleContent = flag == "1"
        } else {
            sampleContent = mode == .demo
        }

        return ServiceConfiguration(
            mode: mode,
            gatewayURL: gatewayURL,
            uploadEndpoint: uploadEndpoint,
            subscriptionProductIDs: products,
            sampleContent: sampleContent
        )
    }

    /// A URL from a string, ignoring blanks and strings that do not parse.
    private static func url(_ text: String?) -> URL? {
        guard let text = text?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return nil }
        return URL(string: text)
    }
}
