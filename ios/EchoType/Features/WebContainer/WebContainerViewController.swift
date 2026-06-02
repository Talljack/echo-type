import UIKit
import WebKit
import UniformTypeIdentifiers

final class WebContainerViewController: UIViewController {
    private let initialPath: String
    private let rootPath: String
    private lazy var speechRecognitionService = SpeechRecognitionService(delegate: self)
    private var pendingOpenURL: URL?
    private var currentRouteURL: URL?
    private var currentRouteTitle: String?
    private var lastHomeOwnedPath: String?
    private let navigationBarGlowView = UIView()
    private let navigationBar = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterial))
    private let navigationTitleLabel = UILabel()
    private let navigationSubtitleLabel = UILabel()
    private let backButton = UIButton(type: .system)
    private let chatButton = UIButton(type: .system)
    private let rootMarkerLabel = UILabel()
    private let currentURLMarkerLabel = UILabel()
    private let qaStateMarkerLabel = UILabel()
    private var navigationBarHeightConstraint: NSLayoutConstraint?
    private var navigationTitleCenterYConstraint: NSLayoutConstraint?
    private lazy var webView: WKWebView = {
        let contentController = WKUserContentController()
        contentController.add(self, name: "echoTypeBridge")

        let script = WKUserScript(
            source: BridgeScript.source,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        contentController.addUserScript(script)

        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.allowsInlineMediaPlayback = true
        configuration.userContentController = contentController
        if AppConfig.usesEphemeralWebsiteDataStore {
            configuration.websiteDataStore = .nonPersistent()
        }

        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = self
        view.uiDelegate = self
        view.customUserAgent = AppConfig.customUserAgent
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.scrollView.delegate = self
        view.scrollView.alwaysBounceHorizontal = false
        view.scrollView.showsHorizontalScrollIndicator = false
        view.scrollView.isDirectionalLockEnabled = true
        view.isInspectable = true
        return view
    }()

    private let progressView = UIProgressView(progressViewStyle: .default)
    private var filePickCompletion: (([URL]?) -> Void)?

    init(initialPath: String, rootPath: String) {
        self.initialPath = AppConfig.normalizedPath(initialPath)
        self.rootPath = AppConfig.normalizedPath(rootPath)
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground
        configureNavigationChrome()
        setupSubviews()
        loadInitialPage()
    }

    private func configureNavigationChrome() {
        navigationBarGlowView.translatesAutoresizingMaskIntoConstraints = false
        navigationBarGlowView.isUserInteractionEnabled = false
        navigationBarGlowView.backgroundColor = .clear
        navigationBarGlowView.layer.cornerRadius = 0
        navigationBarGlowView.layer.cornerCurve = .continuous
        navigationBarGlowView.alpha = 0

        navigationBar.translatesAutoresizingMaskIntoConstraints = false
        navigationBar.layer.cornerRadius = 0
        navigationBar.layer.cornerCurve = .continuous
        navigationBar.clipsToBounds = true
        navigationBar.accessibilityIdentifier = "native-navigation-bar"
        navigationBar.layer.borderWidth = 0

        backButton.translatesAutoresizingMaskIntoConstraints = false
        backButton.setImage(UIImage(systemName: "chevron.backward"), for: .normal)
        backButton.setTitle(nil, for: .normal)
        backButton.setPreferredSymbolConfiguration(UIImage.SymbolConfiguration(pointSize: 17, weight: .semibold), forImageIn: .normal)
        backButton.tintColor = .systemIndigo
        backButton.semanticContentAttribute = .forceLeftToRight
        backButton.contentHorizontalAlignment = .leading
        backButton.setContentHuggingPriority(.required, for: .horizontal)
        backButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        backButton.configuration = .plain()
        backButton.configuration?.title = nil
        backButton.configuration?.attributedTitle = AttributedString("")
        backButton.setTitle("", for: .normal)
        backButton.configuration?.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0)
        backButton.configuration?.baseForegroundColor = .systemIndigo
        backButton.accessibilityIdentifier = "native-back-button"
        backButton.accessibilityLabel = "Back"
        backButton.addTarget(self, action: #selector(handleBackButtonTapped), for: .touchUpInside)

        chatButton.translatesAutoresizingMaskIntoConstraints = false
        chatButton.setImage(UIImage(systemName: "message"), for: .normal)
        chatButton.setPreferredSymbolConfiguration(UIImage.SymbolConfiguration(pointSize: 18, weight: .medium), forImageIn: .normal)
        chatButton.tintColor = .systemIndigo
        chatButton.configuration = .plain()
        chatButton.configuration?.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 4, bottom: 4, trailing: 0)
        chatButton.configuration?.baseForegroundColor = .systemIndigo
        chatButton.accessibilityIdentifier = "native-chat-button"
        chatButton.accessibilityLabel = "Open AI chat"
        chatButton.addTarget(self, action: #selector(handleChatButtonTapped), for: .touchUpInside)

        navigationTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        navigationTitleLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        navigationTitleLabel.textColor = .label
        navigationTitleLabel.textAlignment = .center
        navigationTitleLabel.lineBreakMode = .byTruncatingTail
        navigationTitleLabel.text = "EchoType"
        navigationTitleLabel.accessibilityIdentifier = "native-navigation-title"

        navigationSubtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        navigationSubtitleLabel.font = .systemFont(ofSize: 10, weight: .medium)
        navigationSubtitleLabel.textColor = UIColor.secondaryLabel.withAlphaComponent(0.78)
        navigationSubtitleLabel.textAlignment = .center
        navigationSubtitleLabel.lineBreakMode = .byTruncatingTail
        navigationSubtitleLabel.text = ""
        navigationSubtitleLabel.alpha = 0
        navigationSubtitleLabel.accessibilityIdentifier = "native-navigation-subtitle"

        rootMarkerLabel.translatesAutoresizingMaskIntoConstraints = false
        rootMarkerLabel.alpha = 0.01
        rootMarkerLabel.isHidden = false
        rootMarkerLabel.isAccessibilityElement = true
        rootMarkerLabel.accessibilityIdentifier = "native-root-marker"
        rootMarkerLabel.accessibilityTraits = .staticText
        rootMarkerLabel.text = rootPath

        currentURLMarkerLabel.translatesAutoresizingMaskIntoConstraints = false
        currentURLMarkerLabel.alpha = 0.01
        currentURLMarkerLabel.isHidden = false
        currentURLMarkerLabel.isAccessibilityElement = true
        currentURLMarkerLabel.accessibilityIdentifier = "native-current-url"
        currentURLMarkerLabel.accessibilityTraits = .staticText
        currentURLMarkerLabel.text = AppConfig.url(for: initialPath).absoluteString

        qaStateMarkerLabel.translatesAutoresizingMaskIntoConstraints = false
        qaStateMarkerLabel.alpha = 0.01
        qaStateMarkerLabel.isHidden = false
        qaStateMarkerLabel.isAccessibilityElement = true
        qaStateMarkerLabel.accessibilityIdentifier = "native-qa-state"
        qaStateMarkerLabel.accessibilityTraits = .staticText
        qaStateMarkerLabel.text = ""
    }

    private func setupSubviews() {
        view.addSubview(navigationBarGlowView)
        view.addSubview(webView)
        view.addSubview(progressView)
        view.addSubview(navigationBar)
        view.addSubview(rootMarkerLabel)
        view.addSubview(currentURLMarkerLabel)
        view.addSubview(qaStateMarkerLabel)

        navigationBar.contentView.addSubview(backButton)
        navigationBar.contentView.addSubview(navigationTitleLabel)
        navigationBar.contentView.addSubview(navigationSubtitleLabel)
        navigationBar.contentView.addSubview(chatButton)

        navigationBar.contentView.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16)
        webView.translatesAutoresizingMaskIntoConstraints = false
        progressView.translatesAutoresizingMaskIntoConstraints = false

        let titleCenterYConstraint = navigationTitleLabel.centerYAnchor.constraint(
            equalTo: navigationBar.contentView.centerYAnchor,
            constant: -6
        )
        navigationTitleCenterYConstraint = titleCenterYConstraint

        NSLayoutConstraint.activate([
            navigationBarGlowView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            navigationBarGlowView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navigationBarGlowView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            navigationBarGlowView.heightAnchor.constraint(equalToConstant: 1),

            navigationBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            navigationBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navigationBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            backButton.leadingAnchor.constraint(equalTo: navigationBar.contentView.layoutMarginsGuide.leadingAnchor),
            backButton.centerYAnchor.constraint(equalTo: navigationBar.contentView.centerYAnchor),
            backButton.heightAnchor.constraint(equalToConstant: 32),
            backButton.widthAnchor.constraint(equalToConstant: 24),

            chatButton.trailingAnchor.constraint(equalTo: navigationBar.contentView.layoutMarginsGuide.trailingAnchor),
            chatButton.centerYAnchor.constraint(equalTo: navigationBar.contentView.centerYAnchor),
            chatButton.heightAnchor.constraint(equalToConstant: 26),
            chatButton.widthAnchor.constraint(equalToConstant: 26),

            navigationTitleLabel.centerXAnchor.constraint(equalTo: navigationBar.contentView.centerXAnchor),
            titleCenterYConstraint,
            navigationTitleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: backButton.trailingAnchor, constant: 8),
            navigationTitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: chatButton.leadingAnchor, constant: -8),

            navigationSubtitleLabel.topAnchor.constraint(equalTo: navigationTitleLabel.bottomAnchor, constant: 2),
            navigationSubtitleLabel.centerXAnchor.constraint(equalTo: navigationTitleLabel.centerXAnchor),
            navigationSubtitleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: backButton.trailingAnchor, constant: 8),
            navigationSubtitleLabel.trailingAnchor.constraint(lessThanOrEqualTo: chatButton.leadingAnchor, constant: -8),

            progressView.topAnchor.constraint(equalTo: navigationBar.bottomAnchor, constant: 2),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            webView.topAnchor.constraint(equalTo: progressView.bottomAnchor, constant: 0),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        NSLayoutConstraint.activate([
            rootMarkerLabel.topAnchor.constraint(equalTo: view.topAnchor),
            rootMarkerLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            rootMarkerLabel.widthAnchor.constraint(equalToConstant: 1),
            rootMarkerLabel.heightAnchor.constraint(equalToConstant: 1)
        ])

        NSLayoutConstraint.activate([
            currentURLMarkerLabel.topAnchor.constraint(equalTo: view.topAnchor),
            currentURLMarkerLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 2),
            currentURLMarkerLabel.widthAnchor.constraint(equalToConstant: 1),
            currentURLMarkerLabel.heightAnchor.constraint(equalToConstant: 1)
        ])

        NSLayoutConstraint.activate([
            qaStateMarkerLabel.topAnchor.constraint(equalTo: view.topAnchor),
            qaStateMarkerLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 4),
            qaStateMarkerLabel.widthAnchor.constraint(equalToConstant: 1),
            qaStateMarkerLabel.heightAnchor.constraint(equalToConstant: 1)
        ])

        navigationBarHeightConstraint = navigationBar.heightAnchor.constraint(equalToConstant: 48)
        navigationBarHeightConstraint?.isActive = true

        view.bringSubviewToFront(progressView)
        view.bringSubviewToFront(navigationBarGlowView)
        view.bringSubviewToFront(navigationBar)

        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.canGoBack), options: .new, context: nil)
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.title), options: .new, context: nil)
        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.url), options: .new, context: nil)
        updateNavigationChrome()
    }

    deinit {
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.canGoBack))
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.title))
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.url))
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "echoTypeBridge")
    }

    override func observeValue(
        forKeyPath keyPath: String?,
        of object: Any?,
        change: [NSKeyValueChangeKey: Any]?,
        context: UnsafeMutableRawPointer?
    ) {
        switch keyPath {
        case #keyPath(WKWebView.estimatedProgress):
            progressView.isHidden = webView.estimatedProgress >= 1
            progressView.progress = Float(webView.estimatedProgress)
        case #keyPath(WKWebView.canGoBack), #keyPath(WKWebView.title), #keyPath(WKWebView.url):
            updateNavigationChrome()
        default:
            break
        }
    }

    @objc
    private func handleBackButtonTapped() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        if let managedBackPath = preferredManagedBackPath() {
            loadManagedPage(path: managedBackPath)
            return
        }

        if webView.canGoBack {
            webView.goBack()
            return
        }

        guard !isRootPage() else { return }
        loadRootPage()
    }

    @objc
    private func handleChatButtonTapped() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        let script = """
        window.dispatchEvent(new CustomEvent('echotype:native-chat-toggle'));
        true;
        """
        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    private func updateNavigationChrome() {
        let shouldShowNavigationBar = !shouldHideNavigationBar()
        let title = resolvedNavigationTitle()
        let subtitle = shouldShowNavigationBar ? rootSectionTitle() : nil
        let shouldShowSubtitle = shouldShowNavigationBar && shouldDisplaySubtitle(title: title, subtitle: subtitle)

        backButton.isEnabled = shouldShowNavigationBar
        backButton.isHidden = !shouldShowNavigationBar
        backButton.alpha = shouldShowNavigationBar ? 1 : 0.35
        backButton.accessibilityIdentifier = shouldShowNavigationBar ? "native-back-button" : nil
        backButton.accessibilityLabel = shouldShowNavigationBar ? "Back" : nil
        chatButton.isHidden = !shouldShowNavigationBar
        chatButton.accessibilityIdentifier = shouldShowNavigationBar ? "native-chat-button" : nil
        chatButton.accessibilityLabel = shouldShowNavigationBar ? "Open AI chat" : nil
        navigationTitleLabel.text = title
        navigationSubtitleLabel.text = shouldShowSubtitle ? subtitle : nil
        navigationSubtitleLabel.alpha = shouldShowSubtitle ? 1 : 0
        navigationSubtitleLabel.isHidden = !shouldShowSubtitle
        navigationSubtitleLabel.isAccessibilityElement = shouldShowSubtitle
        navigationSubtitleLabel.accessibilityIdentifier = shouldShowSubtitle ? "native-navigation-subtitle" : nil
        navigationTitleCenterYConstraint?.constant = shouldShowSubtitle ? -6 : 0
        navigationBar.isHidden = !shouldShowNavigationBar
        navigationBar.accessibilityElementsHidden = !shouldShowNavigationBar
        navigationBarGlowView.alpha = 0
        navigationBarHeightConstraint?.constant = shouldShowNavigationBar ? 48 : 0
        rootMarkerLabel.accessibilityLabel = rootMarkerText()
        currentURLMarkerLabel.accessibilityLabel = (currentRouteURL ?? webView.url)?.absoluteString ?? ""
    }

    private func shouldHideNavigationBar() -> Bool {
        let path = currentPath()
        if path == rootPath {
            return true
        }

        if rootPath == "/dashboard", let sectionRoot = sectionRootPath(for: path), sectionRoot == path {
            return true
        }

        return false
    }

    private func isRootPage() -> Bool {
        guard let url = currentRouteURL ?? webView.url else { return true }
        let normalizedPath = url.path.isEmpty ? "/" : url.path
        return normalizedPath == rootPath
    }

    private func currentPath() -> String {
        let path = (currentRouteURL ?? webView.url)?.path ?? rootPath
        return path.isEmpty ? "/" : path
    }

    private func isHomeOwnedPath(_ path: String) -> Bool {
        switch path {
        case let value where value.hasPrefix("/dashboard"),
             let value where value.hasPrefix("/library"),
             let value where value.hasPrefix("/settings"),
             let value where value.hasPrefix("/favorites"),
             let value where value.hasPrefix("/weak-spots"):
            return true
        default:
            return false
        }
    }

    private func sectionRootPath(for path: String) -> String? {
        switch path {
        case let value where value.hasPrefix("/dashboard"):
            return "/dashboard"
        case let value where value.hasPrefix("/library"):
            return "/library"
        case let value where value.hasPrefix("/settings"):
            return "/settings"
        case let value where value.hasPrefix("/favorites"):
            return "/favorites"
        case let value where value.hasPrefix("/weak-spots"):
            return "/weak-spots"
        default:
            return nil
        }
    }

    private func preferredManagedBackPath() -> String? {
        let path = currentPath()

        if rootPath == "/dashboard" {
            if let sectionRoot = sectionRootPath(for: path), sectionRoot != path {
                return sectionRoot
            }

            if !isHomeOwnedPath(path), let lastHomeOwnedPath {
                return lastHomeOwnedPath
            }
        }

        let nestedRootPrefix = rootPath == "/" ? "/" : "\(rootPath)/"
        if path != rootPath, path.hasPrefix(nestedRootPrefix) {
            return rootPath
        }

        return nil
    }

    private func resolvedNavigationTitle() -> String {
        if let path = (currentRouteURL ?? webView.url)?.path, let title = preferredTitle(for: path) {
            return title
        }

        if let title = currentRouteTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty, !isGenericTitle(title) {
            return title
        }

        if let title = webView.title?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty, !isGenericTitle(title) {
            return title
        }

        guard let path = (currentRouteURL ?? webView.url)?.path, !path.isEmpty, path != rootPath else {
            return "EchoType"
        }

        let lastComponent = path.split(separator: "/").last.map(String.init) ?? "EchoType"
        return lastComponent.replacingOccurrences(of: "-", with: " ").capitalized
    }

    private func preferredTitle(for path: String) -> String? {
        switch path {
        case "/dashboard":
            return "Dashboard"
        case "/library":
            return "Content Library"
        case "/settings":
            return "Settings"
        case "/favorites":
            return "Favorites"
        case "/review/today":
            return "Today Review"
        case "/speak/free":
            return "Free Conversation"
        case let value where value.hasPrefix("/listen/book/"):
            return "Vocabulary Listening"
        case let value where value.hasPrefix("/read/book/"):
            return "Word Reading"
        case let value where value.hasPrefix("/write/book/"):
            return "Typing Drill"
        case let value where value.hasPrefix("/speak/book/"):
            return "Scenario Practice"
        default:
            return nil
        }
    }

    private func isGenericTitle(_ title: String) -> Bool {
        let normalized = title.lowercased()
        return normalized == "echotype" || normalized.hasPrefix("echotype —")
    }

    private func shouldDisplaySubtitle(title: String, subtitle: String?) -> Bool {
        guard let subtitle, !subtitle.isEmpty else { return false }
        return title.caseInsensitiveCompare(subtitle) != .orderedSame
    }

    private func rootMarkerText() -> String {
        switch rootPath {
        case "/dashboard":
            return "root-dashboard"
        case "/listen":
            return "root-listen"
        case "/speak":
            return "root-speak"
        case "/read":
            return "root-read"
        case "/write":
            return "root-write"
        case "/review/today":
            return "root-review"
        default:
            return "root-\(rootPath)"
        }
    }

    private func rootSectionTitle() -> String? {
        let path = ((currentRouteURL ?? webView.url)?.path).flatMap { $0.isEmpty ? nil : $0 } ?? rootPath

        switch path {
        case let value where value.hasPrefix("/settings"):
            return nil
        case let value where value.hasPrefix("/library"):
            return nil
        case let value where value.hasPrefix("/favorites"):
            return nil
        case let value where value.hasPrefix("/weak-spots"):
            return nil
        case let value where value.hasPrefix("/dashboard"):
            return nil
        default:
            break
        }

        switch rootPath {
        case "/dashboard":
            return nil
        case "/listen":
            return "Listen"
        case "/speak":
            return "Speak"
        case "/read":
            return "Read"
        case "/write":
            return "Write"
        case "/review/today":
            return "Review"
        default:
            return "EchoType"
        }
    }

    private func loadInitialPage() {
        currentRouteURL = AppConfig.url(for: initialPath)
        currentRouteTitle = nil
        lastHomeOwnedPath = rootPath == "/dashboard" && isHomeOwnedPath(initialPath)
            ? (sectionRootPath(for: initialPath) ?? initialPath)
            : nil
        qaStateMarkerLabel.accessibilityLabel = fallbackQAStateLabel(for: currentRouteURL)
        updateNavigationChrome()
        webView.load(URLRequest(url: AppConfig.url(for: initialPath)))
    }

    private func loadRootPage() {
        loadManagedPage(path: rootPath)
    }

    private func loadManagedPage(path: String) {
        let normalizedPath = AppConfig.normalizedPath(path)
        currentRouteURL = AppConfig.url(for: normalizedPath)
        currentRouteTitle = nil
        if rootPath == "/dashboard", isHomeOwnedPath(normalizedPath) {
            lastHomeOwnedPath = normalizedPath
        }
        qaStateMarkerLabel.accessibilityLabel = fallbackQAStateLabel(for: currentRouteURL)
        updateNavigationChrome()
        let payload = [
            "path": normalizedPath,
            "replace": true,
        ] as [String: Any]
        dispatchBridgeEvent(name: "echotype:native-navigate", detail: payload)
        refreshQAStateFromWebView()
    }

    private func handleRouteChanged(payload: [String: Any]) {
        let previousPath = currentPath()
        if let href = payload["href"] as? String, let url = URL(string: href) {
            currentRouteURL = url
        } else {
            currentRouteURL = webView.url
        }

        if let title = payload["title"] as? String, !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            currentRouteTitle = title
        } else {
            currentRouteTitle = webView.title
        }

        let nextPath = currentPath()
        if rootPath == "/dashboard" {
            if isHomeOwnedPath(nextPath) {
                lastHomeOwnedPath = sectionRootPath(for: nextPath) ?? nextPath
            } else if isHomeOwnedPath(previousPath) {
                lastHomeOwnedPath = sectionRootPath(for: previousPath) ?? previousPath
            }
        }

        qaStateMarkerLabel.accessibilityLabel = fallbackQAStateLabel(for: currentRouteURL)
        updateNavigationChrome()
        refreshQAStateFromWebView()
    }

    func handleIncomingURL(_ url: URL) {
        guard url.scheme?.lowercased() == AppConfig.authCallbackScheme else { return }
        pendingOpenURL = url
        if webView.url != nil {
            flushPendingOpenURLIfNeeded()
        }
    }

    func activatePrimaryActionForCurrentTab() {
        guard !isRootPage() else {
            scrollWebContentToTop()
            return
        }
        loadRootPage()
    }

    private func scrollWebContentToTop() {
        let script = """
        (() => {
          const scrollTargets = [
            document.querySelector('main[data-native-host="ios"]'),
            document.querySelector('[data-native-host="ios"]'),
            document.scrollingElement,
            document.documentElement,
            document.body
          ].filter(Boolean);

          for (const target of scrollTargets) {
            if (typeof target.scrollTo === 'function') {
              target.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            } else {
              target.scrollTop = 0;
              target.scrollLeft = 0;
            }
          }

          window.dispatchEvent(new CustomEvent('echotype:native-scroll-to-top'));
          true;
        })();
        """
        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    private func handleBridgeMessage(_ body: [String: Any]) {
        guard let type = body["type"] as? String else { return }
        let payload = body["payload"] as? [String: Any] ?? [:]

        switch type {
        case "routeChanged":
            handleRouteChanged(payload: payload)
        case "qaState":
            let label = payload
                .map { key, value in "\(key)=\(serializedQAValue(value))" }
                .sorted()
                .joined(separator: ";")
            qaStateMarkerLabel.accessibilityLabel = label
        case "share":
            handleShare(payload: payload)
        case "shareFile":
            handleShareFile(payload: payload)
        case "openExternal":
            handleOpenExternal(payload: payload)
        case "haptic":
            handleHaptic(payload: payload)
        case "startSpeechRecognition":
            speechRecognitionService.start(payload: payload)
        case "stopSpeechRecognition":
            speechRecognitionService.stop()
        case "requestMicrophonePermission":
            speechRecognitionService.requestPermissions()
        case "pickFile":
            presentDocumentPicker(payload: payload)
        default:
            break
        }
    }

    private func serializedQAValue(_ value: Any) -> String {
        if let boolValue = value as? Bool {
            return boolValue ? "true" : "false"
        }

        if let numberValue = value as? NSNumber,
           CFGetTypeID(numberValue) == CFBooleanGetTypeID() {
            return numberValue.boolValue ? "true" : "false"
        }

        return String(describing: value)
    }

    private func handleShare(payload: [String: Any]) {
        let text = payload["text"] as? String
        let url = (payload["url"] as? String).flatMap(URL.init(string:))
        let items: [Any] = [text as Any, url as Any].compactMap { item in
            switch item {
            case let value as String:
                return value
            case let value as URL:
                return value
            default:
                return nil
            }
        }
        guard !items.isEmpty else { return }

        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let popover = controller.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        }
        present(controller, animated: true)
    }

    private func handleShareFile(payload: [String: Any]) {
        guard
            let base64 = payload["base64"] as? String,
            let filename = payload["filename"] as? String,
            let data = Data(base64Encoded: base64)
        else { return }

        let temporaryURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        do {
            try data.write(to: temporaryURL, options: .atomic)
        } catch {
            return
        }

        let controller = UIActivityViewController(activityItems: [temporaryURL], applicationActivities: nil)
        if let popover = controller.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        }
        present(controller, animated: true)
    }

    private func handleOpenExternal(payload: [String: Any]) {
        guard
            let rawURL = payload["url"] as? String,
            let url = URL(string: rawURL)
        else { return }

        UIApplication.shared.open(url)
    }

    private func handleHaptic(payload: [String: Any]) {
        let style = payload["style"] as? String ?? "light"

        switch style {
        case "success":
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "warning":
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "error":
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        case "medium":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "heavy":
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        default:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }

    private func presentDocumentPicker(payload: [String: Any]) {
        let acceptsMultiple = payload["allowsMultiple"] as? Bool ?? false
        let allowedExtensions = payload["allowedExtensions"] as? [String] ?? []
        let contentTypes = allowedExtensions.compactMap { UTType(filenameExtension: $0) }
        let picker = UIDocumentPickerViewController(
            forOpeningContentTypes: contentTypes.isEmpty ? [.item] : contentTypes,
            asCopy: true
        )
        picker.allowsMultipleSelection = acceptsMultiple
        picker.delegate = self
        present(picker, animated: true)
    }

    fileprivate func dispatchBridgeEvent(name: String, detail: [String: Any]) {
        guard
            let jsonData = try? JSONSerialization.data(withJSONObject: detail),
            let jsonString = String(data: jsonData, encoding: .utf8)
        else { return }

        let script = """
        window.dispatchEvent(new CustomEvent('\(name)', { detail: \(jsonString) }));
        """
        webView.evaluateJavaScript(script)
    }

    private func flushPendingOpenURLIfNeeded() {
        guard let pendingOpenURL else { return }
        self.pendingOpenURL = nil
        dispatchBridgeEvent(name: "echotype:native-auth-callback", detail: ["url": pendingOpenURL.absoluteString])
    }

    private func dispatchNativeReadyEvent() {
        dispatchBridgeEvent(name: "echotype:native-ready", detail: ["platform": "ios"])
    }

    private func fallbackQAStateLabel(for url: URL?) -> String {
        let candidatePath = url?.path ?? currentRouteURL?.path
        guard let path = candidatePath, !path.isEmpty else { return "" }

        switch path {
        case "/dashboard":
            return "page=dashboard"
        case "/listen":
            return "page=listen"
        case let value where value.hasPrefix("/listen/"):
            return "page=listen-detail"
        case "/speak":
            return "page=speak"
        case "/speak/free":
            return "page=speak-free"
        case let value where value.hasPrefix("/speak/"):
            return "page=speak-detail"
        case "/read":
            return "page=read"
        case let value where value.hasPrefix("/read/"):
            return "page=read-detail"
        case "/write":
            return "page=write"
        case let value where value.hasPrefix("/write/"):
            return "page=write-detail"
        case "/review/today":
            return "page=review"
        default:
            return "page=unknown"
        }
    }

    private func refreshQAStateFromWebView() {
        let script = """
        (() => {
          const collectHorizontalOverflow = () => {
            const scrollingElement = document.scrollingElement ?? document.documentElement;
            const viewportWidth = window.innerWidth || scrollingElement?.clientWidth || 0;
            const scrollWidth = Math.round(scrollingElement?.scrollWidth || 0);
            const clientWidth = Math.round(scrollingElement?.clientWidth || viewportWidth || 0);
            let widestElement = 'none';
            let maxOverflow = 0;

            for (const element of Array.from(document.querySelectorAll('body *'))) {
              if (!(element instanceof HTMLElement)) continue;
              const rect = element.getBoundingClientRect();
              const overflow = rect.right - viewportWidth;
              if (overflow > maxOverflow + 1) {
                const tag = element.tagName.toLowerCase();
                const ariaLabel = element.getAttribute('aria-label');
                const testId = element.dataset?.testid ? `[data-testid=${element.dataset.testid}]` : '';
                const className =
                  typeof element.className === 'string'
                    ? element.className.trim().split(/\\s+/).slice(0, 3).join('.')
                    : '';
                const text = (element.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 36);
                const html = (element.outerHTML || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
                const ancestors = [];
                let current = element.parentElement;
                while (current && ancestors.length < 3) {
                  const currentClassName =
                    typeof current.className === 'string'
                      ? current.className.trim().split(/\\s+/).slice(0, 2).join('.')
                      : '';
                  ancestors.push(
                    `${current.tagName.toLowerCase()}${currentClassName ? `.${currentClassName}` : ''}`
                  );
                  current = current.parentElement;
                }
                widestElement = [
                  [tag, testId, ariaLabel ? `[aria=${ariaLabel}]` : '', className ? `.${className}` : '']
                    .filter(Boolean)
                    .join(''),
                  ancestors.length > 0 ? `ancestors=${ancestors.join('>')}` : '',
                  text ? `text=${text}` : '',
                  html ? `html=${html}` : ''
                ]
                .filter(Boolean)
                .join('|');
                maxOverflow = overflow;
              }
            }

            return [
              `scrollWidth=${scrollWidth}`,
              `clientWidth=${clientWidth}`,
              `overflowDelta=${Math.max(0, Math.round(Math.max(scrollWidth - clientWidth, maxOverflow)))}`,
              `widestElement=${widestElement}`
            ];
          };

          const direct = window.__ECHOTYPE_LAST_QA_STATE__;
          let entries = [];
          if (direct && typeof direct === 'object') {
            entries = Object.entries(direct)
              .map(([key, value]) => `${key}=${String(value)}`)
              .sort((left, right) => left[0].localeCompare(right[0]));
          } else {
            const serialized = document.documentElement?.dataset?.nativeQaState || '';
            if (serialized) {
              entries = serialized.split(';').filter(Boolean);
            }
          }

          if (window.location.pathname.startsWith('/dashboard')) {
            const existingKeys = new Set(entries.map((entry) => entry.split('=')[0]));
            if (!existingKeys.has('page')) {
              entries.push('page=dashboard');
            }
            entries = entries.filter((entry) => {
              const key = entry.split('=')[0];
              return !['scrollWidth', 'clientWidth', 'overflowDelta', 'widestElement'].includes(key);
            });
            entries.push(...collectHorizontalOverflow());
          }

          return entries
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right))
            .join(';');
        })();
        """
        let delays: [TimeInterval] = [0.05, 0.2, 0.6, 1.2, 2.5, 5.0]
        for delay in delays {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                guard let self else { return }
                self.webView.evaluateJavaScript(script) { result, _ in
                    guard let label = result as? String else { return }
                    guard !label.isEmpty else { return }
                    self.qaStateMarkerLabel.accessibilityLabel = label
                }
            }
        }
    }

    private func mimeType(for url: URL) -> String {
        if let type = UTType(filenameExtension: url.pathExtension) {
            return type.preferredMIMEType ?? "application/octet-stream"
        }
        return "application/octet-stream"
    }
}

extension WebContainerViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "echoTypeBridge", let body = message.body as? [String: Any] else { return }
        handleBridgeMessage(body)
    }
}

extension WebContainerViewController: UIScrollViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        guard scrollView === webView.scrollView else { return }
        guard abs(scrollView.contentOffset.x) > 0.5 else { return }
        scrollView.contentOffset.x = 0
    }
}

extension WebContainerViewController: WKNavigationDelegate, WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if url.scheme?.lowercased() == AppConfig.authCallbackScheme {
            handleIncomingURL(url)
            decisionHandler(.cancel)
            return
        }

        if navigationAction.targetFrame == nil {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        if AppConfig.isManagedWebAppURL(url) {
            decisionHandler(.allow)
            return
        }

        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        progressView.isHidden = true
        dispatchNativeReadyEvent()
        refreshQAStateFromWebView()
        flushPendingOpenURLIfNeeded()
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            UIApplication.shared.open(url)
        }
        return nil
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = UIAlertController(title: "EchoType", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completionHandler()
        })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = UIAlertController(title: "EchoType", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        decisionHandler(.grant)
    }

    @available(iOS 18.4, *)
    func webView(
        _ webView: WKWebView,
        runOpenPanelWith parameters: WKOpenPanelParameters,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping ([URL]?) -> Void
    ) {
        filePickCompletion = completionHandler
        presentDocumentPicker(payload: ["allowsMultiple": parameters.allowsMultipleSelection])
    }
}

extension WebContainerViewController: UIDocumentPickerDelegate {
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        filePickCompletion?(urls)
        filePickCompletion = nil

        let details = urls.compactMap { url -> [String: Any]? in
            let didAccess = url.startAccessingSecurityScopedResource()
            defer {
                if didAccess {
                    url.stopAccessingSecurityScopedResource()
                }
            }

            guard let data = try? Data(contentsOf: url) else { return nil }
            return [
                "name": url.lastPathComponent,
                "mimeType": mimeType(for: url),
                "base64": data.base64EncodedString(),
                "size": data.count,
                "lastModified": Int(Date().timeIntervalSince1970 * 1000)
            ]
        }
        dispatchBridgeEvent(name: "echotype:native-file-picked", detail: ["files": details])
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        filePickCompletion?(nil)
        filePickCompletion = nil
        dispatchBridgeEvent(name: "echotype:native-file-cancelled", detail: [:])
    }
}

extension WebContainerViewController: SpeechRecognitionServiceDelegate {
    func speechRecognitionServiceDidUpdateAvailability(isAvailable: Bool) {
        dispatchBridgeEvent(name: "echotype:native-speech-availability", detail: ["available": isAvailable])
    }

    func speechRecognitionServiceDidReceive(result: SpeechRecognitionResult) {
        dispatchBridgeEvent(name: "echotype:native-speech-result", detail: result.asDictionary)
    }

    func speechRecognitionServiceDidFail(message: String) {
        dispatchBridgeEvent(name: "echotype:native-speech-error", detail: ["message": message])
    }
}
