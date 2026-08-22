import XCTest

final class NativeNavigationUITests: XCTestCase {
    private let launchTimeout: TimeInterval = 20

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testBottomTabsNavigateAcrossPrimaryModules() throws {
        let app = makeApp(initialPath: "/dashboard")
        app.launch()

        XCTAssertTrue(app.buttons["native-tab-home"].waitForExistence(timeout: 20))
        XCTAssertTrue(app.staticTexts["native-root-marker"].waitForExistence(timeout: launchTimeout))

        assertTabNavigation(app, tabIdentifier: "native-tab-listen", expectedRootMarker: "root-listen")
        assertCurrentURLContains(app, path: "/listen")
        assertQAStateContains(app, fragments: ["page=listen"])
        assertTabNavigation(app, tabIdentifier: "native-tab-speak", expectedRootMarker: "root-speak")
        assertCurrentURLContains(app, path: "/speak")
        assertQAStateContains(app, fragments: ["page=speak"])
        assertTabNavigation(app, tabIdentifier: "native-tab-read", expectedRootMarker: "root-read")
        assertCurrentURLContains(app, path: "/read")
        assertQAStateContains(app, fragments: ["page=read"])
        assertTabNavigation(app, tabIdentifier: "native-tab-write", expectedRootMarker: "root-write")
        assertCurrentURLContains(app, path: "/write")
        assertQAStateContains(app, fragments: ["page=write"])
        assertTabNavigation(app, tabIdentifier: "native-tab-review", expectedRootMarker: "root-review")
        assertCurrentURLContains(app, path: "/review/today")
        assertQAStateContains(app, fragments: ["page=review"])
        assertTabNavigation(app, tabIdentifier: "native-tab-home", expectedRootMarker: "root-dashboard")
        assertCurrentURLContains(app, path: "/dashboard")
        assertQAStateContains(app, fragments: ["page=dashboard"])
    }

    func testDefaultWebOriginMatchesTheNativeAppProductionOrigin() {
        XCTAssertEqual(resolvedDefaultWebOrigin(), "https://echo-type.app")
    }

    func testNativeQARoutesUseTheLocalOrigin() {
        XCTAssertEqual(makeWebURL(path: "/listen/ios-qa-import-item", nativeQAMode: "deep-flows").host, "127.0.0.1")
    }

    @MainActor
    func testLandingPageRendersInNativeShell() throws {
        let app = makeApp(initialPath: "/")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/")
        assertStaticTextContains(app, fragment: "Learn English in one calm, focused daily flow")
        XCTAssertTrue(app.links["Open Dashboard"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.links["Try Speaking"].waitForExistence(timeout: launchTimeout))
    }

    @MainActor
    func testLoginPageRendersInNativeShell() throws {
        let app = makeApp(initialPath: "/login")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/login")
        XCTAssertTrue(
            app.staticTexts["Sign in to EchoType"].waitForExistence(timeout: launchTimeout)
                || app.staticTexts["登录 EchoType"].waitForExistence(timeout: launchTimeout)
        )
        XCTAssertTrue(app.textFields["Email"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(
            app.buttons["Continue with Email"].waitForExistence(timeout: launchTimeout)
                || app.buttons["使用邮箱继续"].waitForExistence(timeout: launchTimeout)
                || app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Continue")).firstMatch.waitForExistence(timeout: launchTimeout)
        )
    }

    @MainActor
    func testDesktopCallbackPageRendersErrorStateInNativeShell() throws {
        let app = makeApp(initialPath: "/auth/desktop-callback")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/auth/desktop-callback")
        XCTAssertTrue(app.staticTexts["Login failed"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(
            app.staticTexts["No tokens received"].waitForExistence(timeout: launchTimeout)
                || app.staticTexts["Missing exchange ID"].waitForExistence(timeout: launchTimeout)
                || app.staticTexts["Failed to complete sign-in"].waitForExistence(timeout: launchTimeout)
        )
    }

    @MainActor
    func testPrimaryTabsRenderEchoTypeRootContent() throws {
        let app = makeApp(initialPath: "/dashboard")
        app.launch()

        assertSelectedTab(app, identifier: "native-tab-home")
        assertCurrentURLContains(app, path: "/dashboard")
        assertStaticTextContains(app, fragment: "Welcome to EchoType")
        assertStaticTextContains(app, fragment: "Master English through")

        assertTabNavigation(app, tabIdentifier: "native-tab-listen", expectedRootMarker: "root-listen")
        assertCurrentURLContains(app, path: "/listen")
        assertStaticTextContains(app, fragment: "Listen to English content")
        assertStaticTextContains(app, fragment: "No word books imported")

        assertTabNavigation(app, tabIdentifier: "native-tab-speak", expectedRootMarker: "root-speak")
        assertCurrentURLContains(app, path: "/speak")
        assertStaticTextContains(app, fragment: "Practice English through")
        assertStaticTextContains(app, fragment: "Start Free Conversation")

        assertTabNavigation(app, tabIdentifier: "native-tab-read", expectedRootMarker: "root-read")
        assertCurrentURLContains(app, path: "/read")
        assertStaticTextContains(app, fragment: "Read English content aloud")
        assertStaticTextContains(app, fragment: "No word books imported")

        assertTabNavigation(app, tabIdentifier: "native-tab-write", expectedRootMarker: "root-write")
        assertCurrentURLContains(app, path: "/write")
        assertStaticTextContains(app, fragment: "Practice typing English")
        assertStaticTextContains(app, fragment: "No word books imported")

        assertTabNavigation(app, tabIdentifier: "native-tab-review", expectedRootMarker: "root-review")
        assertCurrentURLContains(app, path: "/review/today")
        assertStaticTextContains(app, fragment: "Today's Review")
        assertStaticTextContains(app, fragment: "No reviews due right now")
    }

    @MainActor
    func testInternalPageShowsNativeBackAndReturnsToTabRoot() throws {
        let app = makeApp(initialPath: "/speak/free")
        app.launch()

        let nativeBackButton = app.buttons["native-back-button"]
        XCTAssertTrue(nativeBackButton.waitForExistence(timeout: 20))
        XCTAssertTrue(nativeBackButton.isHittable)
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/speak/free"))
        assertQAStateContains(app, fragments: ["page=speak-free"])

        nativeBackButton.tap()

        let rootMarker = app.staticTexts["root-speak"]
        XCTAssertTrue(rootMarker.waitForExistence(timeout: 20))
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/speak"))
        assertBackButtonHidden(app, message: "Expected native back button to disappear after returning to /speak")
    }

    @MainActor
    func testPrimaryTabsOpenRepresentativeFlowsAndReturnToRoot() throws {
        let app = makeApp(initialPath: "/dashboard")
        app.launch()

        XCTAssertTrue(app.buttons["native-tab-home"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.staticTexts["native-root-marker"].waitForExistence(timeout: launchTimeout))

        assertTabNavigation(app, tabIdentifier: "native-tab-home", expectedRootMarker: "root-dashboard")
        assertQAStateContains(app, fragments: ["page=dashboard"])

        assertTabNavigation(app, tabIdentifier: "native-tab-listen", expectedRootMarker: "root-listen")
        assertQAStateContains(app, fragments: ["page=listen"])
        openDeepLinkedPageAndReturn(
            app,
            tabIdentifier: "native-tab-listen",
            rootPath: "/listen",
            detailPath: "/listen/book/daily-vocab",
            detailQAFragments: ["page=wordbook-practice", "module=listen", "bookId=daily-vocab"]
        )

        assertTabNavigation(app, tabIdentifier: "native-tab-speak", expectedRootMarker: "root-speak")
        assertQAStateContains(app, fragments: ["page=speak"])
        openDeepLinkedPageAndReturn(
            app,
            tabIdentifier: "native-tab-speak",
            rootPath: "/speak",
            detailPath: "/speak/free",
            detailQAFragments: ["page=speak-free"]
        )

        assertTabNavigation(app, tabIdentifier: "native-tab-read", expectedRootMarker: "root-read")
        assertQAStateContains(app, fragments: ["page=read"])
        openDeepLinkedPageAndReturn(
            app,
            tabIdentifier: "native-tab-read",
            rootPath: "/read",
            detailPath: "/read/book/daily-vocab",
            detailQAFragments: ["page=wordbook-practice", "module=read", "bookId=daily-vocab"]
        )

        assertTabNavigation(app, tabIdentifier: "native-tab-write", expectedRootMarker: "root-write")
        assertQAStateContains(app, fragments: ["page=write"])
        openDeepLinkedPageAndReturn(
            app,
            tabIdentifier: "native-tab-write",
            rootPath: "/write",
            detailPath: "/write/book/daily-vocab",
            detailQAFragments: ["page=wordbook-practice", "module=write", "bookId=daily-vocab"]
        )

        assertTabNavigation(app, tabIdentifier: "native-tab-review", expectedRootMarker: "root-review")
        assertReviewTabRenders(app)
    }

    @MainActor
    func testRetappingActiveTabReturnsToRootFromNestedPage() throws {
        let app = makeApp(initialPath: "/read/book/daily-vocab")
        app.launch()

        let nativeBackButton = app.buttons["native-back-button"]
        XCTAssertTrue(nativeBackButton.waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/read/book/daily-vocab"))
        assertQAStateContains(app, fragments: ["page=wordbook-practice", "module=read", "bookId=daily-vocab"])

        let readTab = app.buttons["native-tab-read"]
        XCTAssertTrue(readTab.waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(readTab.isHittable)
        readTab.tap()

        let rootMarker = app.staticTexts["root-read"]
        XCTAssertTrue(rootMarker.waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/read"))
        XCTAssertFalse(app.staticTexts["native-current-url"].label.contains("/read/book/daily-vocab"))
        XCTAssertFalse(nativeBackButton.exists)
        assertQAStateContains(app, fragments: ["page=read"])
    }

    @MainActor
    func testHomeOwnedRoutesPreserveNativeChromeAndSelectedHomeTab() throws {
        let app = makeApp(initialPath: "/library")
        app.launch()

        assertSelectedTab(app, identifier: "native-tab-home")
        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        XCTAssertFalse(app.buttons["native-back-button"].exists)
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/library"))
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Content Library"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Bring books, phrases, scenarios")).firstMatch,
            ]
        )

        app.terminate()
        app.launchEnvironment["ECHOTYPE_WEB_URL"] = makeWebURL(path: "/settings").absoluteString
        app.launch()

        assertSelectedTab(app, identifier: "native-tab-home")
        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        XCTAssertFalse(app.buttons["native-back-button"].exists)
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/settings"))
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Settings"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Configure AI providers")).firstMatch,
            ]
        )

        app.terminate()
        app.launchEnvironment["ECHOTYPE_WEB_URL"] = makeWebURL(path: "/favorites").absoluteString
        app.launch()

        assertSelectedTab(app, identifier: "native-tab-home")
        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        XCTAssertFalse(app.buttons["native-back-button"].exists)
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/favorites"))
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Favorites"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Save words, phrases, and sentences")).firstMatch,
            ]
        )
    }

    @MainActor
    func testRepresentativeDetailPagesKeepNativeBackChatAndTabBar() throws {
        let app = makeApp(initialPath: "/listen/book/cet4")
        app.launch()

        assertNestedChrome(app, urlFragment: "/listen/book/cet4", expectedSubtitle: "Listen", expectedTab: "native-tab-listen")
        app.buttons["native-back-button"].tap()
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/listen"))

        app.terminate()
        app.launchEnvironment["ECHOTYPE_WEB_URL"] = makeWebURL(path: "/read/book/cet4").absoluteString
        app.launch()

        assertNestedChrome(app, urlFragment: "/read/book/cet4", expectedSubtitle: "Read", expectedTab: "native-tab-read")
        app.buttons["native-back-button"].tap()
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/read"))

        app.terminate()
        app.launchEnvironment["ECHOTYPE_WEB_URL"] = makeWebURL(path: "/write/book/cet4").absoluteString
        app.launch()

        assertNestedChrome(app, urlFragment: "/write/book/cet4", expectedSubtitle: "Write", expectedTab: "native-tab-write")
        app.buttons["native-back-button"].tap()
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/write"))
    }

    @MainActor
    func testImportPracticeFlowCoversListenReadAndWrite() throws {
        let app = makeApp(initialPath: "/library/import", nativeQAMode: "deep-flows")
        app.launch()

        let titleField = app.textFields["Import title"]
        XCTAssertTrue(titleField.waitForExistence(timeout: launchTimeout))
        titleField.tap()
        titleField.typeText("iOS QA Imported Item")

        let contentField = app.textViews["Import text content"]
        XCTAssertTrue(contentField.waitForExistence(timeout: launchTimeout))
        contentField.tap()
        contentField.typeText("native shell practice check")

        app.buttons["Submit text import"].tap()

        XCTAssertTrue(app.staticTexts["Import complete"].waitForExistence(timeout: launchTimeout))
        app.buttons["Back to library after import"].tap()
        assertCurrentURLContains(app, path: "/library")
        assertSelectedTab(app, identifier: "native-tab-home")
        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        XCTAssertFalse(app.buttons["native-back-button"].exists)

        app.buttons["Library listen iOS QA Imported Item"].tap()
        assertCurrentURLContains(app, path: "/listen/")
        assertQAStateContains(app, fragments: ["page=listen-detail", "title=iOS QA Imported Item"])

        app.buttons["native-back-button"].tap()
        assertCurrentURLContains(app, path: "/library")

        app.buttons["Library read iOS QA Imported Item"].tap()
        assertCurrentURLContains(app, path: "/read/")
        assertQAStateContains(app, fragments: ["page=read-detail", "title=iOS QA Imported Item"])

        app.buttons["native-back-button"].tap()
        assertCurrentURLContains(app, path: "/library")

        app.buttons["Library write iOS QA Imported Item"].tap()
        assertCurrentURLContains(app, path: "/write/")
        assertQAStateContains(app, fragments: ["page=write-detail", "title=iOS QA Imported Item"])
    }

    @MainActor
    func testListenDetailSupportsHideRevealAndDictationLoop() throws {
        let app = makeApp(initialPath: "/listen/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        assertCurrentURLContains(app, path: "/listen/ios-qa-import-item")
        assertCurrentURLContains(app, path: "nativeQA=deep-flows")
        assertQAStateContains(app, fragments: ["page=listen-detail", "hasContent=true", "listenMode=normal"])

        firstExistingElement(in: [app.buttons["Hide text"], app.buttons["隐藏文本"]], timeout: launchTimeout, failureMessage: "Missing hide text button").tap()
        assertQAStateContains(app, fragments: ["page=listen-detail", "listenMode=hide-text"])
        XCTAssertTrue(
            app.staticTexts["Transcript is hidden for this mode."].waitForExistence(timeout: launchTimeout)
                || app.staticTexts["当前已隐藏文本"].waitForExistence(timeout: launchTimeout)
        )

        firstExistingElement(in: [app.buttons["Reveal transcript"], app.buttons["显示文本"]], timeout: launchTimeout, failureMessage: "Missing reveal transcript button").tap()
        assertQAStateContains(app, fragments: ["page=listen-detail", "listenMode=hide-text"])
        XCTAssertTrue(app.buttons["Dictation"].waitForExistence(timeout: launchTimeout) || app.buttons["听写"].waitForExistence(timeout: launchTimeout))

        firstExistingElement(in: [app.buttons["Dictation"], app.buttons["听写"]], timeout: launchTimeout, failureMessage: "Missing dictation mode button").tap()
        assertQAStateContains(app, fragments: ["page=listen-detail", "listenMode=dictation"])

        let dictationInput = firstExistingElement(
            in: [
                app.textViews["Type what you heard..."],
                app.textFields["Type what you heard..."],
                app.textViews["请输入你听到的内容..."],
                app.textFields["请输入你听到的内容..."],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing listen dictation input"
        )
        dictationInput.tap()
        dictationInput.typeText("native shell practice check")

        firstExistingElement(in: [app.buttons["Check dictation"], app.buttons["检查听写"]], timeout: launchTimeout, failureMessage: "Missing dictation check button").tap()

        assertQAStateContains(
            app,
            fragments: ["page=listen-detail", "listenMode=dictation"]
        )
        _ = firstExistingElement(
            in: [
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Accuracy 100%")).firstMatch,
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "准确率 100%")).firstMatch,
            ],
            timeout: launchTimeout,
            failureMessage: "Missing dictation accuracy result"
        )
    }

    @MainActor
    func testReadDetailSupportsNativeVoicePracticeLoop() throws {
        let app = makeApp(initialPath: "/read/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        assertCurrentURLContains(app, path: "/read/ios-qa-import-item")
        assertQAStateContains(app, fragments: ["page=read-detail", "hasContent=true", "phase=idle"])
        _ = firstExistingElement(
            in: [app.buttons["Reset"], app.buttons["重置"]],
            timeout: launchTimeout,
            failureMessage: "Missing native read reset button"
        )

        let startButton = firstExistingElement(
            in: [
                app.buttons["Start recording"],
                app.buttons["Processing speech"],
                app.buttons["Stop recording"],
                app.buttons["开始录音"],
                app.buttons["正在处理语音"],
                app.buttons["停止录音"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing read start recording button"
        )
        startButton.tap()

        let stopButton = firstExistingElement(
            in: [
                app.buttons["Stop recording"],
                app.buttons["Start recording"],
                app.buttons["停止录音"],
                app.buttons["开始录音"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing read stop recording button"
        )
        stopButton.tap()

        assertQAStateContains(app, fragments: ["page=read-detail", "phase=completed"])
        XCTAssertTrue(app.staticTexts["Your Results"].waitForExistence(timeout: launchTimeout) || app.staticTexts["你的成绩"].waitForExistence(timeout: launchTimeout))
    }

    @MainActor
    func testWriteDetailSupportsTypingCompletionLoop() throws {
        let app = makeApp(initialPath: "/write/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        assertCurrentURLContains(app, path: "/write/ios-qa-import-item")
        assertQAStateContains(app, fragments: ["page=write-detail", "hasContent=true", "mode=idle"])

        let focusButton = firstExistingElement(
            in: [
                app.buttons["Focus typing input"],
                app.textFields["Typing input"],
                app.textFields["打字输入"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing write typing focus control"
        )
        focusButton.tap()

        let typingInput = firstExistingElement(
            in: [app.textFields["Typing input"], app.textFields["打字输入"]],
            timeout: launchTimeout,
            failureMessage: "Missing write typing input"
        )
        typingInput.typeText("native shell practice check")

        assertQAStateContains(app, fragments: ["page=write-detail", "mode=finished"])
        XCTAssertTrue(app.staticTexts["Session Complete!"].waitForExistence(timeout: launchTimeout) || app.staticTexts["练习完成！"].waitForExistence(timeout: launchTimeout))
    }

    @MainActor
    func testHeroScreenshotLibrary() throws {
        let app = makeApp(initialPath: "/library", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-home")
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Content Library"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Bring books, phrases, scenarios")).firstMatch,
            ]
        )
        attachFullScreenshot(app, name: "hero-library")
    }

    @MainActor
    func testHeroScreenshotFavorites() throws {
        let app = makeApp(initialPath: "/favorites", nativeQAMode: "favorites-populated")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-home")
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Favorites"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Save words, phrases, and sentences")).firstMatch,
            ]
        )
        attachFullScreenshot(app, name: "hero-favorites")
    }

    @MainActor
    func testHeroScreenshotReview() throws {
        let app = makeApp(initialPath: "/review/today", nativeQAMode: "review-due")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-review"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-review")
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Today's Review"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Today's Review")).firstMatch,
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "1 review left")).firstMatch,
                app.buttons["review-open-practice"],
            ]
        )
        attachFullScreenshot(app, name: "hero-review")
    }

    @MainActor
    func testHeroScreenshotSettings() throws {
        let app = makeApp(initialPath: "/settings")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-home")
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Settings"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Configure AI providers")).firstMatch,
            ]
        )
        attachFullScreenshot(app, name: "hero-settings")
    }

    @MainActor
    func testHeroScreenshotListen() throws {
        let app = makeApp(initialPath: "/listen", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-listen"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-listen")
        attachFullScreenshot(app, name: "hero-listen")
    }

    @MainActor
    func testHeroScreenshotRead() throws {
        let app = makeApp(initialPath: "/read", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-read"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-read")
        attachFullScreenshot(app, name: "hero-read")
    }

    @MainActor
    func testHeroScreenshotWrite() throws {
        let app = makeApp(initialPath: "/write", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-write"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-write")
        attachFullScreenshot(app, name: "hero-write")
    }

    @MainActor
    func testHeroScreenshotSpeak() throws {
        let app = makeApp(initialPath: "/speak", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-speak"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-speak")
        attachFullScreenshot(app, name: "hero-speak")
    }

    @MainActor
    func testHeroScreenshotDashboard() throws {
        let app = makeApp(initialPath: "/dashboard", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-home")
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Welcome to EchoType"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Welcome to EchoType")).firstMatch,
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Master English through")).firstMatch,
            ]
        )
        attachFullScreenshot(app, name: "hero-dashboard")
    }

    @MainActor
    func testDashboardNativeChatButtonOpensAndClosesPanel() throws {
        let app = makeApp(initialPath: "/dashboard", nativeQAMode: "dashboard-rich")
        app.launch()

        let chatButton = firstExistingElement(
            in: [app.buttons["native-chat-button"], app.buttons["Open AI chat"]],
            timeout: launchTimeout,
            failureMessage: "Missing dashboard chat entry"
        )
        chatButton.tap()

        let closeChatButton = app.buttons["Close chat"]
        XCTAssertTrue(closeChatButton.waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "AI English Tutor")).firstMatch.waitForExistence(timeout: launchTimeout)
        )

        closeChatButton.tap()

        XCTAssertFalse(app.buttons["Close chat"].waitForExistence(timeout: 2))
    }

    @MainActor
    func testSpeakNativeChatButtonOpensAndClosesPanel() throws {
        let app = makeApp(initialPath: "/speak", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-speak"].waitForExistence(timeout: launchTimeout))
        let chatButton = firstExistingElement(
            in: [app.buttons["native-chat-button"], app.buttons["Open AI chat"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak chat entry"
        )
        chatButton.tap()

        let closeChatButton = app.buttons["Close chat"]
        XCTAssertTrue(closeChatButton.waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Hi! I'm your English tutor.")).firstMatch.waitForExistence(timeout: launchTimeout)
        )

        closeChatButton.tap()

        XCTAssertFalse(app.buttons["Close chat"].waitForExistence(timeout: 2))
    }

    @MainActor
    func testHeroScreenshotListenDetail() throws {
        let app = makeApp(initialPath: "/listen/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        assertCurrentURLContains(app, path: "/listen/ios-qa-import-item")
        assertQAStateContains(app, fragments: ["page=listen-detail", "title=iOS QA Practice Line"])
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["iOS QA Practice Line"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "iOS QA Practice Line")).firstMatch,
                app.buttons["Hide text"],
            ]
        )
        attachFullScreenshot(app, name: "hero-listen-detail")
    }

    @MainActor
    func testHeroScreenshotReadDetail() throws {
        let app = makeApp(initialPath: "/read/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        assertCurrentURLContains(app, path: "/read/ios-qa-import-item")
        assertQAStateContains(app, fragments: ["page=read-detail"])
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["iOS QA Practice Line"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "iOS QA Practice Line")).firstMatch,
                app.buttons["Start recording"],
            ]
        )
        attachFullScreenshot(app, name: "hero-read-detail")
    }

    @MainActor
    func testHeroScreenshotWriteDetail() throws {
        let app = makeApp(initialPath: "/write/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        assertCurrentURLContains(app, path: "/write/ios-qa-import-item")
        assertQAStateContains(app, fragments: ["page=write-detail"])
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["iOS QA Practice Line"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "iOS QA Practice Line")).firstMatch,
                app.buttons["Focus typing input"],
            ]
        )
        attachFullScreenshot(app, name: "hero-write-detail")
    }

    @MainActor
    func testHeroScreenshotSpeakFree() throws {
        let app = makeApp(initialPath: "/speak/free", nativeQAMode: "speak-free")
        app.launch()

        assertCurrentURLContains(app, path: "/speak/free")
        assertQAStateContains(app, fragments: ["page=speak-free"])
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Free Conversation"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Suggested Topics")).firstMatch,
                app.textFields["Speak free input"],
            ]
        )
        attachFullScreenshot(app, name: "hero-speak-free")
    }

    @MainActor
    func testStateScreenshotLibraryImportReady() throws {
        let app = makeApp(initialPath: "/library/import", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.textFields["Import title"].waitForExistence(timeout: launchTimeout))
        let titleField = app.textFields["Import title"]
        titleField.tap()
        titleField.typeText("iOS QA Imported Item")

        let contentField = app.textViews["Import text content"]
        XCTAssertTrue(contentField.waitForExistence(timeout: launchTimeout))
        contentField.tap()
        contentField.typeText("native shell practice check")

        attachFullScreenshot(app, name: "state-library-import-ready")
    }

    @MainActor
    func testStateScreenshotImportComplete() throws {
        let app = makeApp(initialPath: "/library/import", nativeQAMode: "deep-flows")
        app.launch()

        let titleField = app.textFields["Import title"]
        XCTAssertTrue(titleField.waitForExistence(timeout: launchTimeout))
        titleField.tap()
        titleField.typeText("iOS QA Imported Item")

        let contentField = app.textViews["Import text content"]
        XCTAssertTrue(contentField.waitForExistence(timeout: launchTimeout))
        contentField.tap()
        contentField.typeText("native shell practice check")

        app.buttons["Submit text import"].tap()
        XCTAssertTrue(app.staticTexts["Import complete"].waitForExistence(timeout: launchTimeout))

        attachFullScreenshot(app, name: "state-import-complete")
    }

    @MainActor
    func testLibraryImportSupportsDocumentMediaAndAITabs() throws {
        let app = makeApp(initialPath: "/library/import", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.buttons["library-import-tab-document"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["library-import-tab-media"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["library-import-tab-ai"].waitForExistence(timeout: launchTimeout))
        assertQAStateContains(app, fragments: ["page=library-import", "activeTab=document"])

        app.buttons["library-import-document-url"].tap()
        XCTAssertTrue(app.textFields["URL"].waitForExistence(timeout: launchTimeout) || app.textFields["Article URL"].waitForExistence(timeout: launchTimeout))
        app.buttons["library-import-tab-media"].tap()
        assertQAStateContains(app, fragments: ["page=library-import", "activeTab=media"])
        app.buttons["library-import-tab-ai"].tap()
        assertQAStateContains(app, fragments: ["page=library-import", "activeTab=ai"])
        app.buttons["import-back-library"].tap()
        assertCurrentURLContains(app, path: "/library")
    }

    @MainActor
    func testStateScreenshotFavoritesDetail() throws {
        let app = makeApp(initialPath: "/favorites", nativeQAMode: "favorites-populated")
        app.launch()

        assertQAStateContains(app, fragments: ["page=favorites", "isEmpty=false", "totalCount=1"])
        let favoriteRow = firstExistingElement(
            in: [
                app.buttons["favorite-toggle-ios-qa-favorite-item"],
                app.otherElements["favorite-toggle-ios-qa-favorite-item"],
                app.otherElements["favorite-row-ios-qa-favorite-item"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing populated favorite row"
        )
        favoriteRow.tap()
        XCTAssertTrue(
            app.otherElements["favorite-detail-ios-qa-favorite-item"].waitForExistence(timeout: launchTimeout)
                || app.buttons["favorite-rate-ios-qa-favorite-item-3"].waitForExistence(timeout: launchTimeout),
            "Expected favorite detail panel to render"
        )

        attachFullScreenshot(app, name: "state-favorites-detail")
    }

    @MainActor
    func testStateScreenshotReviewRatingCard() throws {
        let app = makeApp(initialPath: "/review/today", nativeQAMode: "review-due")
        app.launch()

        assertCurrentURLContains(app, path: "/review/today")
        assertQAStateContains(app, fragments: ["page=review", "hasCurrentItem=true", "remainingCount=1"])

        let typingInput = firstExistingElement(
            in: [app.textFields["Typing input"], app.textFields["Wordbook typing input"]],
            timeout: launchTimeout,
            failureMessage: "Missing review typing input"
        )
        typingInput.tap()
        typingInput.typeText("review rating loop")

        let checkButton = firstExistingElement(
            in: [app.buttons["Check"], app.buttons["检查"]],
            timeout: launchTimeout,
            failureMessage: "Missing review write check button"
        )
        checkButton.tap()

        XCTAssertTrue(
            app.otherElements["review-rating-card"].waitForExistence(timeout: launchTimeout)
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "How well")).firstMatch.waitForExistence(timeout: launchTimeout)
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "怎么样")).firstMatch.waitForExistence(timeout: launchTimeout),
            "Expected review rating card screenshot state to render"
        )
        attachFullScreenshot(app, name: "state-review-rating-card")
    }

    @MainActor
    func testStateScreenshotReadResults() throws {
        let app = makeApp(initialPath: "/read/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        let startButton = firstExistingElement(
            in: [
                app.buttons["Start recording"],
                app.buttons["Processing speech"],
                app.buttons["Stop recording"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing read start recording button"
        )
        startButton.tap()

        let stopButton = firstExistingElement(
            in: [
                app.buttons["Stop recording"],
                app.buttons["Start recording"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing read stop recording button"
        )
        stopButton.tap()

        XCTAssertTrue(app.staticTexts["Your Results"].waitForExistence(timeout: launchTimeout))
        attachFullScreenshot(app, name: "state-read-results")
    }

    @MainActor
    func testStateScreenshotWriteComplete() throws {
        let app = makeApp(initialPath: "/write/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        let focusButton = firstExistingElement(
            in: [
                app.buttons["Focus typing input"],
                app.textFields["Typing input"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing write typing focus control"
        )
        focusButton.tap()

        let typingInput = firstExistingElement(
            in: [app.textFields["Typing input"]],
            timeout: launchTimeout,
            failureMessage: "Missing write typing input"
        )
        typingInput.tap()
        typingInput.typeText("native shell practice check")

        XCTAssertTrue(app.staticTexts["Session Complete!"].waitForExistence(timeout: launchTimeout))
        attachFullScreenshot(app, name: "state-write-complete")
    }

    @MainActor
    func testStateScreenshotListenDictationResult() throws {
        let app = makeApp(initialPath: "/listen/ios-qa-import-item?mode=dictation&qaState=result", nativeQAMode: "deep-flows")
        app.launch()

        assertCurrentURLContains(app, path: "/listen/ios-qa-import-item")
        assertQAStateContains(app, fragments: ["page=listen-detail", "listenMode=dictation"])
        assertQAStateContains(app, fragments: ["page=listen-detail", "listenMode=dictation", "hasDictationResult=true"])
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Accuracy")).firstMatch.waitForExistence(timeout: launchTimeout)
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "准确率")).firstMatch.waitForExistence(timeout: launchTimeout)
        )
        attachFullScreenshot(app, name: "state-listen-dictation-result")
    }

    @MainActor
    func testStateScreenshotSpeakVoiceActive() throws {
        let app = makeApp(initialPath: "/speak/free", nativeQAMode: "speak-free")
        app.launch()

        let startVoiceButton = firstExistingElement(
            in: [app.buttons["Start voice input"], app.buttons["speak-free-voice-toggle"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak free voice start button"
        )
        startVoiceButton.tap()

        let stopVoiceButton = firstExistingElement(
            in: [app.buttons["Stop voice input"], app.buttons["speak-free-voice-toggle"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak free voice stop button"
        )
        XCTAssertTrue(stopVoiceButton.exists)
        attachFullScreenshot(app, name: "state-speak-voice-active")
    }

    @MainActor
    func testStateScreenshotReviewCompletedEmpty() throws {
        let app = makeApp(initialPath: "/review/today", nativeQAMode: "review-due")
        app.launch()

        let typingInput = firstExistingElement(
            in: [app.textFields["Typing input"], app.textFields["Wordbook typing input"]],
            timeout: launchTimeout,
            failureMessage: "Missing review typing input"
        )
        typingInput.tap()
        typingInput.typeText("review rating loop")

        let checkButton = firstExistingElement(
            in: [app.buttons["Check"], app.buttons["检查"]],
            timeout: launchTimeout,
            failureMessage: "Missing review write check button"
        )
        checkButton.tap()

        let reviewRateButton = firstExistingElement(
            in: [
                app.buttons["review-rate-3"],
                app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Good")).firstMatch,
            ],
            timeout: launchTimeout,
            failureMessage: "Missing review good rating button"
        )
        reviewRateButton.tap()

        assertQAStateContains(app, fragments: ["page=review", "hasCurrentItem=false", "loading=false"])
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Today's reviews are done")).firstMatch.waitForExistence(timeout: launchTimeout)
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "No reviews due right now")).firstMatch.waitForExistence(timeout: launchTimeout)
        )
        attachFullScreenshot(app, name: "state-review-completed-empty")
    }

    @MainActor
    func testStateScreenshotFavoritesAfterRating() throws {
        let app = makeApp(initialPath: "/favorites", nativeQAMode: "favorites-populated")
        app.launch()

        let favoriteRow = firstExistingElement(
            in: [
                app.buttons["favorite-toggle-ios-qa-favorite-item"],
                app.otherElements["favorite-toggle-ios-qa-favorite-item"],
                app.otherElements["favorite-row-ios-qa-favorite-item"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing populated favorite row"
        )
        favoriteRow.tap()

        let rateButton = firstExistingElement(
            in: [
                app.buttons["favorite-rate-ios-qa-favorite-item-3"],
                app.buttons["Favorite rate 3"],
                app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Good")).firstMatch,
            ],
            timeout: launchTimeout,
            failureMessage: "Missing favorite review rate button"
        )
        rateButton.tap()

        assertQAStateContains(app, fragments: ["page=favorites", "hasExpandedItem=true", "isEmpty=false"])
        attachFullScreenshot(app, name: "state-favorites-after-rating")
    }

    @MainActor
    func testStateScreenshotDashboardRichContent() throws {
        let app = makeApp(initialPath: "/dashboard", nativeQAMode: "dashboard-rich")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertQAStateContains(app, fragments: ["page=dashboard"])

        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Today's Review")).firstMatch.waitForExistence(timeout: launchTimeout)
        )

        let startLearningAnchor = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Start Learning")).firstMatch
        if !startLearningAnchor.isHittable {
            app.swipeUp()
            app.swipeUp()
        }

        XCTAssertTrue(startLearningAnchor.waitForExistence(timeout: launchTimeout))
        attachFullScreenshot(app, name: "state-dashboard-rich-content")
    }

    @MainActor
    func testDashboardDoesNotReportHorizontalOverflow() throws {
        let app = makeApp(initialPath: "/dashboard", nativeQAMode: "dashboard-rich")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertQAStateContains(
            app,
            fragments: ["page=dashboard", "overflowDelta=0"]
        )
    }

    @MainActor
    func testRetappingActiveRootTabScrollsDashboardToTop() throws {
        let app = makeApp(initialPath: "/dashboard", nativeQAMode: "dashboard-rich")
        app.launch()

        let homeTab = app.buttons["native-tab-home"]
        XCTAssertTrue(homeTab.waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: "native-tab-home")

        let topTitle = app.staticTexts["Welcome to EchoType"]
        XCTAssertTrue(topTitle.waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(topTitle.isHittable)

        let lowerAnchor = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Start Learning")).firstMatch
        for _ in 0..<6 where !lowerAnchor.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(lowerAnchor.waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(lowerAnchor.isHittable, "Expected dashboard to scroll down before retapping the active tab")

        homeTab.tap()
        assertElementBecomesHittable(topTitle, message: "Expected retapping active Home tab to scroll dashboard back to top")
    }

    @MainActor
    func testStateScreenshotDashboardChatOpen() throws {
        let app = makeApp(initialPath: "/dashboard", nativeQAMode: "dashboard-rich")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        scrollToTopUntilVisible(
            app,
            anchors: [
                app.staticTexts["Welcome to EchoType"],
                app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Today's Review")).firstMatch,
            ]
        )

        let chatButton = firstExistingElement(
            in: [app.buttons["native-chat-button"], app.buttons["Open AI chat"]],
            timeout: launchTimeout,
            failureMessage: "Missing dashboard chat entry"
        )
        chatButton.tap()

        XCTAssertTrue(app.buttons["Close chat"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(
            app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "AI English Tutor")).firstMatch.waitForExistence(timeout: launchTimeout)
        )
        attachFullScreenshot(app, name: "state-dashboard-chat-open")
    }

    @MainActor
    func testStateScreenshotSpeakFreeConversation() throws {
        let app = makeApp(initialPath: "/speak/free", nativeQAMode: "deep-flows")
        app.launch()

        assertCurrentURLContains(app, path: "/speak/free")
        assertQAStateContains(app, fragments: ["page=speak-free"])

        let input = firstExistingElement(
            in: [app.textFields["Speak free input"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak free input"
        )
        input.tap()
        input.typeText("Hello from iOS QA")

        let sendButton = firstExistingElement(
            in: [app.buttons["Send speak free message"], app.buttons["speak-free-send"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak free send button"
        )
        sendButton.tap()

        assertQAStateContains(app, fragments: ["page=speak-free", "messageCount=3"])
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Mocked iOS reply")).firstMatch.waitForExistence(timeout: launchTimeout))
        attachFullScreenshot(app, name: "state-speak-free-conversation")
    }

    @MainActor
    func testStateScreenshotListenDictationInput() throws {
        let app = makeApp(initialPath: "/listen/ios-qa-import-item?mode=dictation", nativeQAMode: "deep-flows")
        app.launch()

        assertQAStateContains(app, fragments: ["page=listen-detail", "listenMode=dictation"])

        let dictationInput = firstExistingElement(
            in: [
                app.textViews["Type what you heard..."],
                app.textFields["Type what you heard..."],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing listen dictation input"
        )
        dictationInput.tap()
        dictationInput.typeText("native shell")

        assertQAStateContains(app, fragments: ["page=listen-detail", "listenMode=dictation", "hasDictationResult=false"])
        attachFullScreenshot(app, name: "state-listen-dictation-input")
    }

    @MainActor
    func testStateScreenshotReadListening() throws {
        let app = makeApp(initialPath: "/read/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        let startButton = firstExistingElement(
            in: [
                app.buttons["Start recording"],
                app.buttons["Processing speech"],
                app.buttons["Stop recording"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing read start recording button"
        )
        startButton.tap()

        assertQAStateContains(app, fragments: ["page=read-detail", "phase=listening", "isListening=true"])
        attachFullScreenshot(app, name: "state-read-listening")
    }

    @MainActor
    func testStateScreenshotWriteTypingInProgress() throws {
        let app = makeApp(initialPath: "/write/ios-qa-import-item", nativeQAMode: "deep-flows")
        app.launch()

        let focusButton = firstExistingElement(
            in: [
                app.buttons["Focus typing input"],
                app.textFields["Typing input"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing write typing focus control"
        )
        focusButton.tap()

        let typingInput = firstExistingElement(
            in: [app.textFields["Typing input"]],
            timeout: launchTimeout,
            failureMessage: "Missing write typing input"
        )
        typingInput.tap()
        typingInput.typeText("native")

        assertQAStateContains(app, fragments: ["page=write-detail", "mode=typing"])
        attachFullScreenshot(app, name: "state-write-typing-in-progress")
    }

    @MainActor
    func testSpeakFreeSupportsSendAndVoiceFlow() throws {
        let app = makeApp(initialPath: "/speak/free", nativeQAMode: "deep-flows")
        app.launch()

        let input = app.textFields["Speak free input"]
        XCTAssertTrue(input.waitForExistence(timeout: launchTimeout))
        input.tap()
        input.typeText("Hello from iOS QA")
        let sendButton = firstExistingElement(
            in: [app.buttons["Send speak free message"], app.buttons["speak-free-send"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak free send button"
        )
        sendButton.tap()

        assertQAStateContains(app, fragments: ["page=speak-free", "messageCount=3"])

        let startVoiceButton = firstExistingElement(
            in: [app.buttons["Start voice input"], app.buttons["speak-free-voice-toggle"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak free voice start button"
        )
        startVoiceButton.tap()

        let stopVoiceButton = firstExistingElement(
            in: [app.buttons["Stop voice input"], app.buttons["speak-free-voice-toggle"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak free voice stop button"
        )
        stopVoiceButton.tap()

        assertQAStateContains(app, fragments: ["page=speak-free", "messageCount=5"])
    }

    @MainActor
    func testFavoritesCoversEmptyAndPopulatedStates() throws {
        let emptyApp = makeApp(initialPath: "/favorites", nativeQAMode: "favorites-empty")
        emptyApp.launch()

        assertCurrentURLContains(emptyApp, path: "/favorites")
        assertQAStateContains(emptyApp, fragments: ["page=favorites", "isEmpty=true", "totalCount=0"])
        XCTAssertTrue(
            emptyApp.otherElements["favorites-empty-state"].waitForExistence(timeout: launchTimeout)
                || emptyApp.staticTexts["还没有收藏内容"].waitForExistence(timeout: launchTimeout),
            "Expected favorites empty state to render"
        )

        emptyApp.terminate()

        let populatedApp = makeApp(initialPath: "/favorites", nativeQAMode: "favorites-populated")
        populatedApp.launch()

        assertQAStateContains(populatedApp, fragments: ["page=favorites", "isEmpty=false", "hasExpandedItem=false"])
        let favoriteRow = firstExistingElement(
            in: [
                populatedApp.buttons["favorite-toggle-ios-qa-favorite-item"],
                populatedApp.otherElements["favorite-toggle-ios-qa-favorite-item"],
                populatedApp.otherElements["favorite-row-ios-qa-favorite-item"],
                populatedApp.buttons.containing(NSPredicate(format: "label CONTAINS %@", "native shell")).firstMatch,
                populatedApp.staticTexts["native shell"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing populated favorite row"
        )
        favoriteRow.tap()

        XCTAssertTrue(
            populatedApp.buttons["favorite-rate-ios-qa-favorite-item-3"].waitForExistence(timeout: launchTimeout)
                || populatedApp.otherElements["favorite-detail-ios-qa-favorite-item"].waitForExistence(timeout: launchTimeout)
                || populatedApp.staticTexts["Translation"].waitForExistence(timeout: launchTimeout),
            "Expected favorite detail panel to render"
        )
        let rateButton = firstExistingElement(
            in: [
                populatedApp.buttons["favorite-rate-ios-qa-favorite-item-3"],
                populatedApp.buttons["Favorite rate 3"],
                populatedApp.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Good")).firstMatch,
            ],
            timeout: launchTimeout,
            failureMessage: "Missing favorite review rate button"
        )
        rateButton.tap()
        assertQAStateContains(populatedApp, fragments: ["page=favorites", "hasExpandedItem=true", "isEmpty=false"])
    }

    @MainActor
    func testReviewDueItemCompletesRatingLoop() throws {
        let app = makeApp(initialPath: "/review/today", nativeQAMode: "review-due")
        app.launch()

        assertCurrentURLContains(app, path: "/review/today")
        assertQAStateContains(app, fragments: ["page=review", "hasCurrentItem=true", "remainingCount=1"])
        XCTAssertTrue(
            app.staticTexts["review-current-title"].waitForExistence(timeout: launchTimeout)
                || app.staticTexts["iOS QA Review Line"].waitForExistence(timeout: launchTimeout),
            "Expected current review item title"
        )

        let typingInput = firstExistingElement(
            in: [app.textFields["Typing input"], app.textFields["Wordbook typing input"]],
            timeout: launchTimeout,
            failureMessage: "Missing review typing input"
        )
        typingInput.tap()
        typingInput.typeText("review rating loop")

        let checkButton = firstExistingElement(
            in: [
                app.buttons["Check"],
                app.buttons["检查"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing review write check button"
        )
        checkButton.tap()

        let reviewRateButton = firstExistingElement(
            in: [
                app.buttons["review-rate-3"],
                app.otherElements["review-rating-card"],
                app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Good")).firstMatch,
                app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "熟练")).firstMatch,
                app.buttons["review-rate-3"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing review rating state"
        )
        XCTAssertTrue(reviewRateButton.exists)
        if reviewRateButton.elementType != .button {
            let goodButton = firstExistingElement(
                in: [
                    app.buttons["review-rate-3"],
                    app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Good")).firstMatch,
                    app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "熟练")).firstMatch,
                ],
                timeout: launchTimeout,
                failureMessage: "Missing review good rating button"
            )
            goodButton.tap()
        } else {
            reviewRateButton.tap()
        }

        assertQAStateContains(app, fragments: ["page=review", "hasCurrentItem=false", "loading=false"])
    }

    @MainActor
    func testDashboardAnalyticsRouteShowsAndReturns() throws {
        let app = makeApp(initialPath: "/dashboard/analytics", nativeQAMode: "dashboard-rich")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/dashboard/analytics")
        assertQAStateContains(app, fragments: ["page=dashboard-analytics", "loading=false", "hasData=true"])
        XCTAssertTrue(
            app.staticTexts["native-navigation-title"].waitForExistence(timeout: launchTimeout)
        )
        let analyticsTitle = app.staticTexts["native-navigation-title"].label
        XCTAssertTrue(
            analyticsTitle.contains("Analytics") || analyticsTitle.contains("学习分析"),
            "Expected localized analytics navigation title but got '\(analyticsTitle)'"
        )

        app.buttons["native-back-button"].tap()
        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/dashboard")
    }

    @MainActor
    func testFavoritesReviewRouteCompletesDedicatedLoop() throws {
        let app = makeApp(initialPath: "/favorites/review", nativeQAMode: "favorites-populated")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/favorites/review")
        assertQAStateContains(app, fragments: ["page=favorites-review", "isLoaded=true", "totalCount=1"])

        let reviewCard = app.otherElements["favorites-review-card"]
        XCTAssertTrue(reviewCard.waitForExistence(timeout: launchTimeout))
        reviewCard.tap()

        let rateButton = firstExistingElement(
            in: [
                app.buttons["favorites-review-rate-2"],
                app.buttons["favorites-review-rate-3"],
            ],
            timeout: launchTimeout,
            failureMessage: "Missing favorites review rate button"
        )
        rateButton.tap()

        assertQAStateContains(app, fragments: ["page=favorites-review", "completedCount=1"])
        XCTAssertTrue(
            app.buttons["Back to favorites"].waitForExistence(timeout: launchTimeout)
                || app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "已完成")).firstMatch.waitForExistence(timeout: launchTimeout)
        )
    }

    @MainActor
    func testWordBooksRootRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/library/wordbooks")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/library/wordbooks")
        assertQAStateContains(app, fragments: ["page=wordbooks", "activeTab=vocabulary"])
    }

    @MainActor
    func testWordBooksSupportsTabsFiltersAndLibraryReturn() throws {
        let app = makeApp(initialPath: "/library/wordbooks", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.buttons["wordbooks-tab-vocabulary"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["wordbooks-tab-scenarios"].waitForExistence(timeout: launchTimeout))
        app.buttons["wordbooks-tab-scenarios"].tap()
        assertQAStateContains(app, fragments: ["page=wordbooks", "activeTab=scenarios"])
        XCTAssertTrue(app.buttons["wordbooks-filter-travel"].waitForExistence(timeout: launchTimeout))
        app.buttons["wordbooks-filter-travel"].tap()
        assertQAStateContains(app, fragments: ["page=wordbooks", "activeTab=scenarios", "activeFilter=Travel"])

        app.buttons["wordbooks-tab-vocabulary"].tap()
        assertQAStateContains(app, fragments: ["page=wordbooks", "activeTab=vocabulary", "activeFilter=All"])
        let firstBook = app.links.matching(NSPredicate(format: "identifier BEGINSWITH 'wordbook-open-'")).firstMatch
        XCTAssertTrue(firstBook.waitForExistence(timeout: launchTimeout))
        firstBook.tap()
        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        app.buttons["native-back-button"].tap()
        assertCurrentURLContains(app, path: "/library/wordbooks")

        app.buttons["View library"].tap()
        assertCurrentURLContains(app, path: "/library")
    }

    @MainActor
    func testWordBookDetailRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/library/wordbooks/airport", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        let currentURL = app.staticTexts["native-current-url"]
        XCTAssertTrue(currentURL.waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(currentURL.label.contains("/library/wordbooks/airport"), "Expected wordbook detail URL but got '\(currentURL.label)'")
        assertElementLabelContains(
            app.staticTexts["native-qa-state"],
            fragments: ["page=wordbook-detail", "bookId=airport", "loadingItems=false", "filteredCount=18"],
            missingMessage: "Expected wordbook detail QA state"
        )
    }

    @MainActor
    func testPronunciationRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/pronunciation", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/pronunciation")
        assertQAStateContains(
            app,
            fragments: ["page=pronunciation", "hydrated=true", "completedCount=0", "listening=false", "speechError=false"]
        )
    }

    @MainActor
    func testPronunciationSoundCardExpandsAndResets() throws {
        let app = makeApp(initialPath: "/pronunciation", nativeQAMode: "deep-flows")
        app.launch()

        let firstCard = app.otherElements.matching(NSPredicate(format: "identifier BEGINSWITH 'sound-card-'")).firstMatch
        XCTAssertTrue(firstCard.waitForExistence(timeout: launchTimeout))
        let listenButton = firstCard.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Hear '")).firstMatch
        XCTAssertTrue(listenButton.waitForExistence(timeout: launchTimeout))
        listenButton.tap()
        XCTAssertTrue(firstCard.staticTexts["How to make it"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["Reset pronunciation practice"].waitForExistence(timeout: launchTimeout))
        app.buttons["Reset pronunciation practice"].tap()
        assertQAStateContains(app, fragments: ["page=pronunciation", "completedCount=0"])
    }

    @MainActor
    func testJournalRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/journal", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/journal")
        assertQAStateContains(
            app,
            fragments: ["page=journal", "loaded=true", "loading=false", "phraseCount=0", "isEmpty=true"]
        )
    }

    @MainActor
    func testJournalSupportsAddingSearchingAndDetailFields() throws {
        let app = makeApp(initialPath: "/journal", nativeQAMode: "deep-flows")
        app.launch()

        let phrase = app.textFields["journal-phrase-input"]
        XCTAssertTrue(phrase.waitForExistence(timeout: launchTimeout))
        phrase.tap()
        phrase.typeText("native journal phrase")
        app.buttons["journal-toggle-details"].tap()
        XCTAssertTrue(app.textFields["Translation"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.textFields["Context"].waitForExistence(timeout: launchTimeout))
        app.buttons["Add"].tap()
        assertQAStateContains(app, fragments: ["page=journal", "phraseCount=1", "isEmpty=false"])

        let search = app.textFields["journal-search-input"]
        XCTAssertTrue(search.waitForExistence(timeout: launchTimeout))
        search.tap()
        search.typeText("native journal")
        assertQAStateContains(app, fragments: ["page=journal", "phraseCount=1", "isEmpty=false"])
    }

    @MainActor
    func testSettingsRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/settings", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/settings")
        assertQAStateContains(app, fragments: ["page=settings", "loaded=true"])
    }

    @MainActor
    func testWeakSpotsRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/weak-spots", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/weak-spots")
        assertQAStateContains(
            app,
            fragments: ["page=weak-spots", "totalCount=0", "openCount=0", "filter=all", "hasItems=false"]
        )
    }

    @MainActor
    func testLibraryRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/library", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.staticTexts["root-dashboard"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/library")
        assertQAStateContains(app, fragments: ["page=library", "activeTab=all"])
        XCTAssertTrue(app.buttons["Browse word books"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["Generate collection"].waitForExistence(timeout: launchTimeout))

        app.buttons["Browse word books"].tap()
        assertCurrentURLContains(app, path: "/library/wordbooks")
        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        app.buttons["native-back-button"].tap()
        assertCurrentURLContains(app, path: "/library")

        app.buttons["Generate collection"].tap()
        assertCurrentURLContains(app, path: "/library/collections/generate")
        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
    }

    @MainActor
    func testSpeakScenarioRouteSupportsSendAndVoiceFlow() throws {
        let app = makeApp(initialPath: "/speak/sc_coffee", nativeQAMode: "deep-flows")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/speak/sc_coffee")
        assertQAStateContains(app, fragments: ["page=speak-scenario", "scenarioId=sc_coffee", "hasScenario=true"])
        assertCurrentTitle(app, expected: "Ordering Coffee")

        let input = app.textFields["Speak scenario input"]
        XCTAssertTrue(input.waitForExistence(timeout: launchTimeout))
        input.tap()
        input.typeText("I'd like a latte")

        let sendButton = app.buttons["Send speak scenario message"]
        XCTAssertTrue(sendButton.waitForExistence(timeout: launchTimeout))
        sendButton.tap()

        assertQAStateContains(app, fragments: ["page=speak-scenario", "messageCount=3"])
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Mocked iOS reply")).firstMatch.waitForExistence(timeout: launchTimeout))

        let startVoiceButton = firstExistingElement(
            in: [app.buttons["Start voice input"], app.buttons["speak-free-voice-toggle"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak scenario voice start button"
        )
        startVoiceButton.tap()

        let stopVoiceButton = firstExistingElement(
            in: [app.buttons["Stop voice input"], app.buttons["speak-free-voice-toggle"]],
            timeout: launchTimeout,
            failureMessage: "Missing speak scenario voice stop button"
        )
        stopVoiceButton.tap()

        assertQAStateContains(app, fragments: ["page=speak-scenario", "messageCount=5"])
    }

    @MainActor
    func testWeakSpotsRouteShowsAndResolvesItem() throws {
        let app = makeApp(initialPath: "/weak-spots", nativeQAMode: "weak-spots-rich")
        app.launch()

        assertCurrentURLContains(app, path: "/weak-spots")
        assertQAStateContains(app, fragments: ["page=weak-spots", "hasItems=true", "filter=all"])

        let speakFilter = app.buttons["Weak spots filter speak"]
        XCTAssertTrue(speakFilter.waitForExistence(timeout: launchTimeout))
        speakFilter.tap()
        assertQAStateContains(app, fragments: ["page=weak-spots", "filter=speak", "hasItems=true"])

        let resolveButton = app.buttons["Resolve weak spot ios-qa-weak-spot-speak"]
        XCTAssertTrue(resolveButton.waitForExistence(timeout: launchTimeout))
        resolveButton.tap()
        assertQAStateContains(app, fragments: ["page=weak-spots", "filter=speak", "hasItems=true"])

        let allFilter = app.buttons["Weak spots filter all"]
        XCTAssertTrue(allFilter.waitForExistence(timeout: launchTimeout))
        allFilter.tap()
        assertQAStateContains(app, fragments: ["page=weak-spots", "filter=all", "hasItems=true"])
    }

    @MainActor
    func testSpeakBookRouteRendersAndSupportsVoicePractice() throws {
        let app = makeApp(initialPath: "/speak/book/cet4", nativeQAMode: "weak-spots-rich")
        app.launch()

        assertCurrentURLContains(app, path: "/speak/book/cet4")
        assertQAStateContains(
            app,
            fragments: ["page=wordbook-practice", "module=speak", "bookId=cet4", "hasBook=true"]
        )

        let speechToggle = firstExistingElement(
            in: [app.buttons["Start wordbook speech practice"], app.buttons["Stop wordbook speech practice"]],
            timeout: launchTimeout,
            failureMessage: "Missing wordbook speech practice toggle"
        )
        assertQAStateContains(
            app,
            fragments: ["page=wordbook-practice", "module=speak", "bookId=cet4", "hasBook=true"]
        )
        speechToggle.tap()

        assertQAStateContains(
            app,
            fragments: ["page=wordbook-practice", "module=speak", "bookId=cet4", "finished=false"]
        )

        let stopToggle = app.buttons["Stop wordbook speech practice"]
        XCTAssertTrue(stopToggle.waitForExistence(timeout: launchTimeout))
        stopToggle.tap()

        let tryAgainButton = firstExistingElement(
            in: [app.buttons["Try Again"], app.buttons["再试一次"]],
            timeout: launchTimeout,
            failureMessage: "Missing wordbook speech result action"
        )
        XCTAssertTrue(tryAgainButton.exists)
        assertQAStateContains(app, fragments: ["page=wordbook-practice", "module=speak", "bookId=cet4", "finished=false"])
    }

    @MainActor
    func testLibraryBookDetailRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/library/books/ios-qa-book", nativeQAMode: "library-nested")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/library/books/ios-qa-book")
        assertQAStateContains(app, fragments: ["page=library-book-detail", "bookId=ios-qa-book", "loading=false", "hasBook=true", "chapterCount=3"])
        XCTAssertTrue(app.buttons["Back to library from book detail"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.staticTexts["iOS QA Story Pack"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["Book chapter 1 Listen"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["Book chapter 1 Speak"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["Book chapter 1 Read"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["Book chapter 1 Write"].waitForExistence(timeout: launchTimeout))
    }

    @MainActor
    func testLibraryCollectionDetailRouteRendersNatively() throws {
        let app = makeApp(initialPath: "/library/collections/ios-qa-collection", nativeQAMode: "library-nested")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/library/collections/ios-qa-collection")
        assertQAStateContains(
            app,
            fragments: ["page=library-collection-detail", "collectionId=ios-qa-collection", "loading=false", "hasCollection=true", "itemCount=3"]
        )
        XCTAssertTrue(app.buttons["Back to library from collection detail"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.staticTexts["Rescheduling Meetings"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["Collection item 1 Listen"].waitForExistence(timeout: launchTimeout))
    }

    @MainActor
    func testLibraryCollectionGenerateRouteSupportsMockedGenerateAndSave() throws {
        let app = makeApp(initialPath: "/library/collections/generate", nativeQAMode: "collection-generate")
        app.launch()

        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        assertCurrentURLContains(app, path: "/library/collections/generate")
        assertQAStateContains(app, fragments: ["page=library-collections-generate", "generating=false", "hasResult=false"])

        let keywordField = app.textFields["Collection generate keyword"]
        XCTAssertTrue(keywordField.waitForExistence(timeout: launchTimeout))
        keywordField.tap()
        keywordField.typeText("airport check-in")
        keywordField.typeText("\n")

        assertQAStateContains(app, fragments: ["page=library-collections-generate", "hasResult=true"])
        XCTAssertTrue(app.staticTexts["Airport Check-in"].waitForExistence(timeout: launchTimeout))

        let saveButton = app.buttons["Save generated collection"]
        if !saveButton.waitForExistence(timeout: 3) || !saveButton.isHittable {
            app.swipeUp()
            app.swipeUp()
        }
        XCTAssertTrue(saveButton.waitForExistence(timeout: launchTimeout))
        saveButton.tap()

        assertCurrentURLContains(app, path: "/library/collections/")
        assertQAStateContains(app, fragments: ["page=library-collection-detail", "hasCollection=true"])
    }

    @MainActor
    private func assertTabNavigation(_ app: XCUIApplication, tabIdentifier: String, expectedRootMarker: String) {
        let tabButton = app.buttons[tabIdentifier]
        XCTAssertTrue(tabButton.waitForExistence(timeout: 10), "Missing tab button \(tabIdentifier)")
        XCTAssertTrue(tabButton.isHittable, "Tab button is not hittable: \(tabIdentifier)")
        tabButton.tap()

        let marker = app.staticTexts[expectedRootMarker]
        XCTAssertTrue(marker.waitForExistence(timeout: launchTimeout), "Expected marker '\(expectedRootMarker)' after tapping \(tabIdentifier)")
    }

    @MainActor
    private func openDeepLinkedPageAndReturn(
        _ app: XCUIApplication,
        tabIdentifier: String,
        rootPath: String,
        detailPath: String,
        detailQAFragments: [String]
    ) {
        let tabButton = app.buttons[tabIdentifier]
        XCTAssertTrue(tabButton.waitForExistence(timeout: 10), "Missing tab button \(tabIdentifier)")
        tabButton.tap()

        app.terminate()
        app.launchEnvironment["ECHOTYPE_WEB_URL"] = makeWebURL(path: detailPath).absoluteString
        app.launch()

        let nativeBackButton = app.buttons["native-back-button"]
        XCTAssertTrue(nativeBackButton.waitForExistence(timeout: launchTimeout), "Expected native back on \(detailPath)")
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains(detailPath), "Expected current URL to contain \(detailPath)")
        assertQAStateContains(app, fragments: detailQAFragments)

        nativeBackButton.tap()

        let rootMarker = app.staticTexts["native-root-marker"]
        XCTAssertTrue(rootMarker.waitForExistence(timeout: launchTimeout))
        XCTAssertEqual(rootMarker.label, "root-\(rootPath == "/review/today" ? "review" : rootPath.replacingOccurrences(of: "/", with: ""))")
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains(rootPath), "Expected current URL to contain \(rootPath) after back")
        assertBackButtonHidden(app, message: "Expected native back button to disappear after returning to \(rootPath)")
    }

    @MainActor
    private func assertReviewTabRenders(_ app: XCUIApplication) {
        XCTAssertTrue(
            app.staticTexts["native-root-marker"].waitForExistence(timeout: 10),
            "Review root marker did not render"
        )
        XCTAssertEqual(app.staticTexts["native-root-marker"].label, "root-review")
        XCTAssertTrue(app.staticTexts["native-current-url"].label.contains("/review/today"))
        XCTAssertFalse(app.buttons["native-back-button"].exists)
        assertQAStateContains(app, fragments: ["page=review"])
    }

    @MainActor
    private func assertQAStateContains(_ app: XCUIApplication, fragments: [String]) {
        let qaState = app.staticTexts["native-qa-state"]
        assertElementLabelContains(qaState, fragments: fragments, missingMessage: "Missing native QA state marker")
    }

    @MainActor
    private func assertCurrentURLContains(_ app: XCUIApplication, path: String) {
        let currentURL = app.staticTexts["native-current-url"]
        XCTAssertTrue(currentURL.waitForExistence(timeout: launchTimeout), "Missing current URL marker")
        let predicate = NSPredicate { evaluated, _ in
            guard let element = evaluated as? XCUIElement else { return false }
            return element.label.contains(path)
        }
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: currentURL)
        let result = XCTWaiter.wait(for: [expectation], timeout: launchTimeout)
        XCTAssertEqual(result, .completed, "Expected current URL to contain \(path) but got '\(currentURL.label)'")
    }

    @MainActor
    private func assertElementLabelContains(
        _ element: XCUIElement,
        fragments: [String],
        missingMessage: String
    ) {
        XCTAssertTrue(element.waitForExistence(timeout: launchTimeout), missingMessage)
        let predicate = NSPredicate { evaluated, _ in
            guard let currentElement = evaluated as? XCUIElement else { return false }
            let label = currentElement.label
            return fragments.allSatisfy(label.contains)
        }
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: element)
        let result = XCTWaiter.wait(for: [expectation], timeout: launchTimeout)
        if result == .completed {
            return
        }

        let finalLabel = element.label
        XCTAssertTrue(
            fragments.allSatisfy(finalLabel.contains),
            "Expected label to contain \(fragments) but got '\(finalLabel)'"
        )
    }

    @MainActor
    private func assertElementDisappears(_ element: XCUIElement, message: String) {
        let expectation = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "exists == false"),
            object: element
        )
        let result = XCTWaiter.wait(for: [expectation], timeout: launchTimeout)
        XCTAssertEqual(result, .completed, message)
    }

    @MainActor
    private func assertElementBecomesHittable(_ element: XCUIElement, message: String) {
        let predicate = NSPredicate { evaluated, _ in
            guard let currentElement = evaluated as? XCUIElement else { return false }
            return currentElement.exists && currentElement.isHittable
        }
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: element)
        let result = XCTWaiter.wait(for: [expectation], timeout: launchTimeout)
        XCTAssertEqual(result, .completed, message)
    }

    @MainActor
    private func assertBackButtonHidden(_ app: XCUIApplication, message: String) {
        let deadline = Date().addingTimeInterval(launchTimeout)
        while Date() < deadline {
            let backButton = app.buttons["native-back-button"]
            if !backButton.exists || !backButton.isHittable {
                return
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.25))
        }

        let backButton = app.buttons["native-back-button"]
        XCTAssertFalse(backButton.exists && backButton.isHittable, message)
    }

    @MainActor
    private func assertStaticTextContains(_ app: XCUIApplication, fragment: String) {
        let predicate = NSPredicate(format: "label CONTAINS %@", fragment)
        let match = app.staticTexts.containing(predicate).firstMatch
        XCTAssertTrue(match.waitForExistence(timeout: launchTimeout), "Expected to find static text containing '\(fragment)'")
    }

    @MainActor
    private func assertSelectedTab(_ app: XCUIApplication, identifier: String) {
        let tabButton = app.buttons[identifier]
        XCTAssertTrue(tabButton.waitForExistence(timeout: launchTimeout), "Missing tab button \(identifier)")
        XCTAssertEqual(tabButton.value as? String, "Selected", "Expected \(identifier) to be selected")
    }

    @MainActor
    private func assertCurrentTitle(_ app: XCUIApplication, expected: String) {
        let title = app.staticTexts["native-navigation-title"].firstMatch
        XCTAssertTrue(title.waitForExistence(timeout: launchTimeout), "Missing native navigation title")
        XCTAssertEqual(title.label, expected, "Expected native navigation title to equal \(expected)")
    }

    @MainActor
    private func assertSubtitleHidden(_ app: XCUIApplication) {
        XCTAssertFalse(
            app.staticTexts["native-navigation-subtitle"].exists,
            "Expected native navigation subtitle to be hidden"
        )
    }

    @MainActor
    private func assertNestedChrome(
        _ app: XCUIApplication,
        urlFragment: String,
        expectedSubtitle: String,
        expectedTab: String
    ) {
        XCTAssertTrue(app.buttons["native-back-button"].waitForExistence(timeout: launchTimeout))
        XCTAssertTrue(app.buttons["native-chat-button"].waitForExistence(timeout: launchTimeout))
        assertSelectedTab(app, identifier: expectedTab)
        assertCurrentURLContains(app, path: urlFragment)
        let subtitle = app.staticTexts[expectedSubtitle]
        XCTAssertTrue(subtitle.waitForExistence(timeout: launchTimeout), "Missing subtitle \(expectedSubtitle)")
    }

    @MainActor
    private func firstExistingElement(
        in candidates: [XCUIElement],
        timeout: TimeInterval,
        failureMessage: String
    ) -> XCUIElement {
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            for candidate in candidates where candidate.exists {
                return candidate
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        } while Date() < deadline

        XCTFail(failureMessage)
        return candidates[0]
    }

    @MainActor
    private func makeApp(initialPath: String, nativeQAMode: String? = nil) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["ECHOTYPE_WEB_URL"] = makeWebURL(path: initialPath, nativeQAMode: nativeQAMode).absoluteString
        return app
    }

    private func makeWebURL(path: String, nativeQAMode: String? = nil) -> URL {
        let localQAOrigin = ProcessInfo.processInfo.environment["ECHOTYPE_UI_TEST_LOCAL_WEB_ORIGIN"] ?? "http://127.0.0.1:3100"
        let configuredOrigin = nativeQAMode == nil
            ? ProcessInfo.processInfo.environment["ECHOTYPE_UI_TEST_WEB_ORIGIN"] ?? resolvedDefaultWebOrigin()
            : localQAOrigin
        let normalizedPath = path.hasPrefix("/") ? path : "/\(path)"
        let pathAndQuery = normalizedPath.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
        let routePath = String(pathAndQuery.first ?? "")
        let routeQuery = pathAndQuery.count > 1 ? String(pathAndQuery[1]) : nil
        guard var components = URLComponents(string: configuredOrigin) else {
            return URL(string: "https://echo-type.app\(normalizedPath)")!
        }

        if components.path.isEmpty || components.path == "/" {
            components.path = routePath
        } else {
            let basePath = components.path.hasSuffix("/") ? String(components.path.dropLast()) : components.path
            components.path = "\(basePath)\(routePath)"
        }

        var queryItems = components.queryItems ?? []
        if let routeQuery, let routeComponents = URLComponents(string: "https://echotype.local\(routePath)?\(routeQuery)") {
            queryItems.append(contentsOf: routeComponents.queryItems ?? [])
        }
        if let nativeQAMode {
            queryItems.removeAll(where: { $0.name == "nativeQA" })
            queryItems.append(URLQueryItem(name: "nativeQA", value: nativeQAMode))
        }
        components.queryItems = queryItems.isEmpty ? nil : queryItems
        components.fragment = nil
        return components.url ?? URL(string: "https://echo-type.app\(normalizedPath)")!
    }

    private func scrollToTop(_ app: XCUIApplication) {
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.38))
        let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.86))
        start.press(forDuration: 0.01, thenDragTo: end)
    }

    @MainActor
    private func scrollToTopUntilVisible(_ app: XCUIApplication, anchors: [XCUIElement], maxAttempts: Int = 6) {
        for anchor in anchors where anchor.waitForExistence(timeout: 2) && anchor.isHittable {
            return
        }

        for _ in 0..<maxAttempts {
            scrollToTop(app)

            for anchor in anchors where anchor.waitForExistence(timeout: 1.5) && anchor.isHittable {
                return
            }
        }
    }

    private func attachFullScreenshot(_ app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func resolvedDefaultWebOrigin() -> String {
        "https://echo-type.app"
    }
}
