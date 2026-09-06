import UIKit

final class RootViewController: UIViewController {
    private enum Tab: CaseIterable {
        case home
        case listen
        case speak
        case read
        case write
        case review

        var path: String {
            switch self {
            case .home:
                return "/dashboard"
            case .listen:
                return "/listen"
            case .speak:
                return "/speak"
            case .read:
                return "/read"
            case .write:
                return "/write"
            case .review:
                return "/review/today"
            }
        }

        var title: String {
            switch self {
            case .home:
                return "Home"
            case .listen:
                return "Listen"
            case .speak:
                return "Speak"
            case .read:
                return "Read"
            case .write:
                return "Write"
            case .review:
                return "Review"
            }
        }

        var imageName: String {
            switch self {
            case .home:
                return "house.fill"
            case .listen:
                return "headphones"
            case .speak:
                return "mic.fill"
            case .read:
                return "book.closed.fill"
            case .write:
                return "pencil.line"
            case .review:
                return "clock.arrow.circlepath"
            }
        }

        var accentColor: UIColor {
            switch self {
            case .home:
                return UIColor(red: 0.29, green: 0.42, blue: 0.96, alpha: 1.0)
            case .listen:
                return UIColor(red: 0.31, green: 0.35, blue: 0.89, alpha: 1.0)
            case .speak:
                return UIColor(red: 0.03, green: 0.63, blue: 0.64, alpha: 1.0)
            case .read:
                return UIColor(red: 0.95, green: 0.60, blue: 0.18, alpha: 1.0)
            case .write:
                return UIColor(red: 0.56, green: 0.34, blue: 0.95, alpha: 1.0)
            case .review:
                return UIColor(red: 0.11, green: 0.73, blue: 0.38, alpha: 1.0)
            }
        }
    }

    private final class TabButton: UIControl {
        let tab: Tab

        private let iconPlateView = UIView()
        private let iconView = UIImageView()
        private let titleLabelView = UILabel()
        private let stackView = UIStackView()
        private var iconPlateWidthConstraint: NSLayoutConstraint?
        private var iconPlateHeightConstraint: NSLayoutConstraint?

        private var isTabSelected = false

        init(tab: Tab) {
            self.tab = tab
            super.init(frame: .zero)

            translatesAutoresizingMaskIntoConstraints = false
            isAccessibilityElement = true
            accessibilityIdentifier = "native-tab-\(tab.title.lowercased())"
            accessibilityLabel = tab.title
            accessibilityTraits = [.button]
            clipsToBounds = false

            iconPlateView.translatesAutoresizingMaskIntoConstraints = false
            iconPlateView.isUserInteractionEnabled = false
            iconPlateView.layer.cornerRadius = 14
            iconPlateView.layer.cornerCurve = .continuous
            iconPlateView.backgroundColor = .clear

            iconView.translatesAutoresizingMaskIntoConstraints = false
            iconView.isUserInteractionEnabled = false
            iconView.image = UIImage(systemName: tab.imageName)
            iconView.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 19, weight: .medium)
            iconView.contentMode = .scaleAspectFit

            titleLabelView.translatesAutoresizingMaskIntoConstraints = false
            titleLabelView.isUserInteractionEnabled = false
            titleLabelView.text = tab.title
            titleLabelView.font = .systemFont(ofSize: 10.5, weight: .medium)
            titleLabelView.textAlignment = .center
            titleLabelView.adjustsFontSizeToFitWidth = true
            titleLabelView.minimumScaleFactor = 0.8

            stackView.translatesAutoresizingMaskIntoConstraints = false
            stackView.isUserInteractionEnabled = false
            stackView.axis = .vertical
            stackView.alignment = .center
            stackView.distribution = .fill
            stackView.spacing = 3
            stackView.addArrangedSubview(iconPlateView)
            stackView.addArrangedSubview(titleLabelView)

            addSubview(stackView)
            iconPlateView.addSubview(iconView)

            iconPlateWidthConstraint = iconPlateView.widthAnchor.constraint(equalToConstant: 32)
            iconPlateHeightConstraint = iconPlateView.heightAnchor.constraint(equalToConstant: 32)

            NSLayoutConstraint.activate([
                heightAnchor.constraint(equalToConstant: 56),

                stackView.centerXAnchor.constraint(equalTo: centerXAnchor),
                stackView.centerYAnchor.constraint(equalTo: centerYAnchor),
                stackView.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 2),
                stackView.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -2),

                iconPlateWidthConstraint!,
                iconPlateHeightConstraint!,
                iconView.widthAnchor.constraint(equalToConstant: 20),
                iconView.heightAnchor.constraint(equalToConstant: 20),
                iconView.centerXAnchor.constraint(equalTo: iconPlateView.centerXAnchor),
                iconView.centerYAnchor.constraint(equalTo: iconPlateView.centerYAnchor)
            ])

            updateAppearance(selected: false)
        }

        @available(*, unavailable)
        required init?(coder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }

        func updateAppearance(selected: Bool) {
            isTabSelected = selected

            let activeTint = tab.accentColor
            let inactiveTint = UIColor(red: 0.44, green: 0.48, blue: 0.57, alpha: 1.0)

            iconPlateView.backgroundColor = selected ? activeTint.withAlphaComponent(0.12) : .clear
            iconPlateView.layer.borderWidth = selected ? 0.6 : 0
            iconPlateView.layer.borderColor = selected ? activeTint.withAlphaComponent(0.09).cgColor : UIColor.clear.cgColor
            iconPlateView.layer.shadowColor = selected ? activeTint.withAlphaComponent(0.12).cgColor : UIColor.clear.cgColor
            iconPlateView.layer.shadowOpacity = selected ? 1 : 0
            iconPlateView.layer.shadowRadius = selected ? 7 : 0
            iconPlateView.layer.shadowOffset = CGSize(width: 0, height: 3)
            iconView.tintColor = selected ? activeTint : inactiveTint
            iconView.preferredSymbolConfiguration = UIImage.SymbolConfiguration(
                pointSize: selected ? 18 : 17.5,
                weight: selected ? .semibold : .regular
            )
            iconPlateWidthConstraint?.constant = selected ? 31 : 30
            iconPlateHeightConstraint?.constant = selected ? 31 : 30
            titleLabelView.textColor = selected ? activeTint : inactiveTint
            titleLabelView.font = .systemFont(ofSize: 10.5, weight: selected ? .semibold : .medium)
            transform = .identity
            accessibilityTraits = selected ? [.button, .selected] : [.button]
            accessibilityValue = selected ? "Selected" : "Tab"
        }

        func animateSelectionTransition(selected: Bool) {
            UIView.animate(
                withDuration: 0.28,
                delay: 0,
                usingSpringWithDamping: 0.82,
                initialSpringVelocity: 0.4,
                options: [.allowUserInteraction, .beginFromCurrentState]
            ) {
                self.updateAppearance(selected: selected)
                self.layoutIfNeeded()
            }
        }

        func pulseFeedback() {
            UIView.animate(withDuration: 0.13, animations: {
                self.transform = CGAffineTransform(scaleX: 0.96, y: 0.96)
            }) { _ in
                UIView.animate(
                    withDuration: 0.32,
                    delay: 0,
                    usingSpringWithDamping: 0.65,
                    initialSpringVelocity: 0.5,
                    options: [.allowUserInteraction, .beginFromCurrentState]
                ) {
                    self.transform = .identity
                }
            }
        }

        override var isHighlighted: Bool {
            didSet {
                UIView.animate(withDuration: 0.14, delay: 0, options: [.allowUserInteraction, .beginFromCurrentState]) {
                    let restingTransform = CGAffineTransform.identity
                    self.transform = self.isHighlighted
                        ? restingTransform.scaledBy(x: 0.95, y: 0.95)
                        : restingTransform
                    self.alpha = self.isHighlighted && !self.isTabSelected ? 0.8 : 1
                }
            }
        }
    }

    private let contentContainer = UIView()
    private let tabBarContainer = UIView()
    private let tabBarBackground = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterial))
    private let topHairlineView = UIView()
    private let tabStackView = UIStackView()

    private var controllersByTab: [Tab: WebContainerViewController] = [:]
    private var buttonsByTab: [Tab: TabButton] = [:]
    private var currentTab: Tab?
    private var tabsToPrewarm: [Tab] = []
    private let initialManagedPath: String = AppConfig.initialPath

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground
        setupLayout()
        setupTabs()
        selectTab(initialTab(), animated: false)
        scheduleTabPrewarming()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        .darkContent
    }

    func handleIncomingURL(_ url: URL) {
        controllersByTab.values.forEach { $0.handleIncomingURL(url) }
    }

    private func setupLayout() {
        contentContainer.translatesAutoresizingMaskIntoConstraints = false
        contentContainer.clipsToBounds = true

        tabBarContainer.translatesAutoresizingMaskIntoConstraints = false
        tabBarContainer.backgroundColor = .clear

        tabBarBackground.translatesAutoresizingMaskIntoConstraints = false
        tabBarBackground.isUserInteractionEnabled = false
        tabBarBackground.layer.cornerRadius = 26
        tabBarBackground.layer.cornerCurve = .continuous
        tabBarBackground.clipsToBounds = true
        tabBarBackground.layer.borderWidth = 0.8
        tabBarBackground.layer.borderColor = UIColor.white.withAlphaComponent(0.82).cgColor

        topHairlineView.translatesAutoresizingMaskIntoConstraints = false
        topHairlineView.isUserInteractionEnabled = false
        topHairlineView.backgroundColor = UIColor.white.withAlphaComponent(0.78)

        tabStackView.translatesAutoresizingMaskIntoConstraints = false
        tabStackView.axis = .horizontal
        tabStackView.alignment = .fill
        tabStackView.distribution = .fillEqually
        tabStackView.spacing = 0
        tabStackView.isLayoutMarginsRelativeArrangement = true
        tabStackView.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 7, leading: 14, bottom: 8, trailing: 14)

        view.addSubview(contentContainer)
        view.addSubview(tabBarContainer)
        tabBarContainer.addSubview(tabBarBackground)
        tabBarContainer.addSubview(topHairlineView)
        tabBarContainer.addSubview(tabStackView)

        tabBarContainer.layer.shadowColor = UIColor.black.withAlphaComponent(0.045).cgColor
        tabBarContainer.layer.shadowOpacity = 1
        tabBarContainer.layer.shadowRadius = 16
        tabBarContainer.layer.shadowOffset = CGSize(width: 0, height: 6)

        NSLayoutConstraint.activate([
            contentContainer.topAnchor.constraint(equalTo: view.topAnchor),
            contentContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            contentContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            contentContainer.bottomAnchor.constraint(equalTo: tabBarContainer.topAnchor),

            tabBarContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 18),
            tabBarContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),
            tabBarContainer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -4),
            tabBarContainer.heightAnchor.constraint(equalToConstant: 76),

            tabBarBackground.topAnchor.constraint(equalTo: tabBarContainer.topAnchor),
            tabBarBackground.leadingAnchor.constraint(equalTo: tabBarContainer.leadingAnchor),
            tabBarBackground.trailingAnchor.constraint(equalTo: tabBarContainer.trailingAnchor),
            tabBarBackground.bottomAnchor.constraint(equalTo: tabBarContainer.bottomAnchor),

            topHairlineView.topAnchor.constraint(equalTo: tabBarContainer.topAnchor),
            topHairlineView.leadingAnchor.constraint(equalTo: tabBarContainer.leadingAnchor, constant: 24),
            topHairlineView.trailingAnchor.constraint(equalTo: tabBarContainer.trailingAnchor, constant: -24),
            topHairlineView.heightAnchor.constraint(equalToConstant: 1),

            tabStackView.topAnchor.constraint(equalTo: tabBarContainer.topAnchor),
            tabStackView.leadingAnchor.constraint(equalTo: tabBarContainer.leadingAnchor),
            tabStackView.trailingAnchor.constraint(equalTo: tabBarContainer.trailingAnchor),
            tabStackView.bottomAnchor.constraint(equalTo: tabBarContainer.bottomAnchor)
        ])

        if let vibrancyView = tabBarBackground.contentView as UIView? {
            let tintLayer = UIView()
            tintLayer.translatesAutoresizingMaskIntoConstraints = false
            tintLayer.isUserInteractionEnabled = false
            tintLayer.backgroundColor = UIColor.white.withAlphaComponent(0.28)
            vibrancyView.addSubview(tintLayer)
            NSLayoutConstraint.activate([
                tintLayer.topAnchor.constraint(equalTo: vibrancyView.topAnchor),
                tintLayer.leadingAnchor.constraint(equalTo: vibrancyView.leadingAnchor),
                tintLayer.trailingAnchor.constraint(equalTo: vibrancyView.trailingAnchor),
                tintLayer.bottomAnchor.constraint(equalTo: vibrancyView.bottomAnchor)
            ])
            vibrancyView.sendSubviewToBack(tintLayer)
        }
    }

    private func setupTabs() {
        let entryTab = initialTab()

        Tab.allCases.forEach { tab in
            let initialPath: String
            if initialManagedPath.hasPrefix(tab.path) {
                initialPath = initialManagedPath
            } else if tab == entryTab {
                initialPath = initialManagedPath
            } else {
                initialPath = tab.path
            }
            let controller = WebContainerViewController(initialPath: initialPath, rootPath: tab.path)
            controllersByTab[tab] = controller

            // Non-entry tabs are prewarmed after the first screen is mounted.
            // Their loading overlay stays disabled so a tab switch never
            // covers the transition with a native Loading card.
            if tab != entryTab {
                controller.setLoadingOverlayEnabled(false)
            }

            let button = TabButton(tab: tab)
            button.addTarget(self, action: #selector(handleTabTapped(_:)), for: .touchUpInside)
            buttonsByTab[tab] = button
            tabStackView.addArrangedSubview(button)
        }
    }

    private func scheduleTabPrewarming() {
        let entryTab = initialTab()
        tabsToPrewarm = Tab.allCases.filter { $0 != entryTab }
        prewarmNextTab()
    }

    private func prewarmNextTab() {
        guard !tabsToPrewarm.isEmpty else { return }
        let tab = tabsToPrewarm.removeFirst()
        controllersByTab[tab]?.loadViewIfNeeded()

        // Keep WebKit startup work spread across the run loop so the visible
        // entry page remains responsive during app launch.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            self?.prewarmNextTab()
        }
    }

    @objc
    private func handleTabTapped(_ sender: TabButton) {
        if currentTab == sender.tab {
            UIImpactFeedbackGenerator(style: .soft).impactOccurred()
            sender.pulseFeedback()
            controllersByTab[sender.tab]?.activatePrimaryActionForCurrentTab()
            return
        }

        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        selectTab(sender.tab, animated: true)
    }

    private func initialTab() -> Tab {
        let path = AppConfig.initialPath
        return owningTab(for: path)
    }

    private func owningTab(for path: String) -> Tab {
        if let matchedTab = Tab.allCases.first(where: { path.hasPrefix($0.path) }) {
            return matchedTab
        }

        switch path {
        case let value where value.hasPrefix("/settings"),
             let value where value.hasPrefix("/library"),
             let value where value.hasPrefix("/favorites"),
             let value where value.hasPrefix("/journal"),
             let value where value.hasPrefix("/pronunciation"),
             let value where value.hasPrefix("/weak-spots"),
             let value where value.hasPrefix("/dashboard"):
            return .home
        default:
            return .home
        }
    }

    private func selectTab(_ tab: Tab, animated: Bool) {
        guard currentTab != tab, let nextController = controllersByTab[tab] else { return }

        // Once the shell has an active tab, returning to any tab should reveal
        // its cached WebView immediately, even if its first navigation is
        // still settling in the background.
        if currentTab != nil {
            nextController.setLoadingOverlayEnabled(false)
        }

        let previousController = currentTab.flatMap { controllersByTab[$0] }
        previousController?.view.isHidden = true

        if nextController.parent == nil {
            addChild(nextController)
            contentContainer.addSubview(nextController.view)
            nextController.view.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                nextController.view.topAnchor.constraint(equalTo: contentContainer.topAnchor),
                nextController.view.leadingAnchor.constraint(equalTo: contentContainer.leadingAnchor),
                nextController.view.trailingAnchor.constraint(equalTo: contentContainer.trailingAnchor),
                nextController.view.bottomAnchor.constraint(equalTo: contentContainer.bottomAnchor)
            ])
            nextController.didMove(toParent: self)
        }
        nextController.view.alpha = animated ? 0.84 : 1
        nextController.view.transform = animated ? CGAffineTransform(translationX: 0, y: 10) : .identity
        nextController.view.isHidden = false

        currentTab = tab
        updateTabSelection()

        if animated {
            UIView.animate(
                withDuration: 0.34,
                delay: 0,
                usingSpringWithDamping: 0.9,
                initialSpringVelocity: 0.45,
                options: [.allowUserInteraction, .beginFromCurrentState]
            ) {
                nextController.view.alpha = 1
                nextController.view.transform = .identity
                self.view.layoutIfNeeded()
            }
        }
    }

    private func updateTabSelection() {
        buttonsByTab.forEach { tab, button in
            button.animateSelectionTransition(selected: tab == currentTab)
        }
    }
}
