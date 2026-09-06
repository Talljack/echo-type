import Foundation

enum AppConfig {
    static let customUserAgent = "EchoType-iOS/1.0 WKWebView"
    static let authCallbackScheme = "echotype"

    static var configuredWebAppURL: URL {
        let environment = ProcessInfo.processInfo.environment
        if let override = environment["ECHOTYPE_WEB_URL"], let url = URL(string: override), !override.isEmpty {
            return url
        }
        return URL(string: "https://echo-type.app")!
    }

    static var webAppURL: URL {
        initialURL
    }

    static var webAppOriginURL: URL {
        guard var components = URLComponents(url: configuredWebAppURL, resolvingAgainstBaseURL: false) else {
            return configuredWebAppURL
        }

        components.path = ""
        components.query = nil
        components.fragment = nil
        return components.url ?? configuredWebAppURL
    }

    static var usesEphemeralWebsiteDataStore: Bool {
        guard let host = configuredWebAppURL.host?.lowercased() else { return false }
        return host == "127.0.0.1" || host == "localhost"
    }

    static var initialPath: String {
        let path = configuredWebAppURL.path.trimmingCharacters(in: .whitespacesAndNewlines)
        return path.isEmpty ? "/dashboard" : path
    }

    /// The launch URL, including query parameters supplied by deep links.
    /// Query state is used by native QA and by practice pages (for example
    /// dictation/result modes), so it must not be discarded at app startup.
    static var initialURL: URL {
        guard var components = URLComponents(url: configuredWebAppURL, resolvingAgainstBaseURL: false) else {
            return configuredWebAppURL
        }

        components.path = normalizedPath(initialPath)
        var queryItems = components.queryItems ?? []
        if !queryItems.contains(where: { $0.name == "nativeHost" }) {
            queryItems.append(URLQueryItem(name: "nativeHost", value: "ios"))
        }
        components.queryItems = queryItems
        components.fragment = nil
        return components.url ?? configuredWebAppURL
    }

    static func url(for path: String) -> URL {
        guard var components = URLComponents(url: configuredWebAppURL, resolvingAgainstBaseURL: false) else {
            return configuredWebAppURL
        }

        components.path = normalizedPath(path)
        var queryItems = components.queryItems ?? []
        if !queryItems.contains(where: { $0.name == "nativeHost" }) {
            queryItems.append(URLQueryItem(name: "nativeHost", value: "ios"))
        }
        components.queryItems = queryItems
        components.fragment = nil
        return components.url ?? configuredWebAppURL
    }

    static func isManagedWebAppURL(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return false }
        guard scheme == "http" || scheme == "https" else { return false }

        guard
            let appHost = webAppOriginURL.host?.lowercased(),
            let targetHost = url.host?.lowercased()
        else {
            return false
        }

        let appPort = webAppOriginURL.port ?? defaultPort(for: webAppOriginURL.scheme)
        let targetPort = url.port ?? defaultPort(for: url.scheme)

        return appHost == targetHost && appPort == targetPort
    }

    static func normalizedPath(_ path: String) -> String {
        if path.isEmpty || path == "/" {
            return "/"
        }

        return path.hasPrefix("/") ? path : "/\(path)"
    }

    private static func defaultPort(for scheme: String?) -> Int? {
        switch scheme?.lowercased() {
        case "http":
            return 80
        case "https":
            return 443
        default:
            return nil
        }
    }
}
