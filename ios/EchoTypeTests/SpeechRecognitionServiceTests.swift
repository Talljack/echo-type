import XCTest
import WebKit
@testable import EchoType

final class SpeechRecognitionServiceTests: XCTestCase {
    @MainActor
    func testUnvisitedTabCanBeReleasedWithoutLoadingItsWebView() {
        weak var releasedController: WebContainerViewController?
        autoreleasepool {
            let controller = WebContainerViewController(initialPath: "/library", rootPath: "/library")
            releasedController = controller
            XCTAssertFalse(controller.isViewLoaded)
        }
        XCTAssertNil(releasedController, "Releasing an unvisited tab must not construct or retain a WebView")
    }

    @MainActor
    func testLocalTabsShareTheirEphemeralWebsiteDataStore() throws {
        let previous = ProcessInfo.processInfo.environment["ECHOTYPE_WEB_URL"]
        setenv("ECHOTYPE_WEB_URL", "http://127.0.0.1:3005/favorites", 1)
        defer {
            if let previous { setenv("ECHOTYPE_WEB_URL", previous, 1) }
            else { unsetenv("ECHOTYPE_WEB_URL") }
        }
        let notes = WebContainerViewController(initialPath: "/favorites", rootPath: "/favorites")
        let courses = WebContainerViewController(initialPath: "/learn", rootPath: "/learn")
        notes.loadViewIfNeeded()
        courses.loadViewIfNeeded()
        let notesWeb = try XCTUnwrap(notes.view.subviews.compactMap { $0 as? WKWebView }.first)
        let coursesWeb = try XCTUnwrap(courses.view.subviews.compactMap { $0 as? WKWebView }.first)
        XCTAssertFalse(notesWeb.configuration.websiteDataStore.isPersistent)
        XCTAssertTrue(notesWeb.configuration.websiteDataStore === coursesWeb.configuration.websiteDataStore,
                      "Local tabs must share imported materials and notes in one ephemeral store")
    }
    @MainActor
    func testCrossSectionBridgePreservesLessonQueryAndSourcePage() async throws {
        let message = expectation(description: "Cross-section click is handed to native")
        message.expectedFulfillmentCount = 2
        let handler = NavigationMessageHandler { payload in
            XCTAssertEqual(payload["href"] as? String, "http://127.0.0.1:3005/favorites/review?lesson=lesson-123")
            message.fulfill()
        }
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.add(handler, name: "echoTypeBridge")
        configuration.userContentController.addUserScript(WKUserScript(
            source: BridgeScript.navigationConfiguration(rootPath: "/favorites") + BridgeScript.source + "\ndocument.getElementById('review').click(); window.EchoTypeNative.navigate('/favorites/review?lesson=lesson-123');",
            injectionTime: .atDocumentEnd, forMainFrameOnly: true
        ))
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.loadHTMLString("<html><body><a id='review' href='/favorites/review?lesson=lesson-123'>Review notes</a></body></html>", baseURL: URL(string: "http://127.0.0.1:3005/favorites")!)
        await fulfillment(of: [message], timeout: 10)
        let path = try await webView.evaluateJavaScript("window.location.pathname") as? String
        XCTAssertFalse(path?.contains("review") ?? true)
        let sameOwner = try await webView.evaluateJavaScript("window.EchoTypeNative.navigate('/journal')") as? Bool
        let external = try await webView.evaluateJavaScript("window.EchoTypeNative.navigate('https://example.com/read')") as? Bool
        XCTAssertEqual(sameOwner, false)
        XCTAssertEqual(external, false)
        configuration.userContentController.removeScriptMessageHandler(forName: "echoTypeBridge")
    }
    func testRootNavigationDoesNotInheritLessonQuery() {
        let previous = ProcessInfo.processInfo.environment["ECHOTYPE_WEB_URL"]
        setenv("ECHOTYPE_WEB_URL", "http://127.0.0.1:3005/write/item?lesson=lesson-123&nativeQA=navigation", 1)
        defer {
            if let previous { setenv("ECHOTYPE_WEB_URL", previous, 1) }
            else { unsetenv("ECHOTYPE_WEB_URL") }
        }
        XCTAssertTrue(AppConfig.initialURL.absoluteString.contains("lesson=lesson-123"))
        let rootURL = AppConfig.url(for: "/library")
        XCTAssertFalse(rootURL.absoluteString.contains("lesson="))
        XCTAssertTrue(rootURL.absoluteString.contains("nativeHost=ios"))
    }
    func testLearningRouteOwnershipUsesWholeSegmentsAndReviewPrecedence() {
        XCTAssertEqual(RootViewController.Tab.allCases.map(\.title), ["Today", "Courses", "Materials", "Review", "Notes"])
        for path in ["/learn", "/learn/lesson", "/listen/book/123", "/read/123", "/write", "/speak/free", "/pronunciation"] {
            XCTAssertEqual(RootViewController.tab(for: path), .courses, path)
        }
        for path in ["/review", "/review/today", "/favorites/review", "/favorites/review/123", "/weak-spots"] {
            XCTAssertEqual(RootViewController.tab(for: path), .review, path)
        }
        for path in ["/favorites", "/favorites/folder", "/journal"] {
            XCTAssertEqual(RootViewController.tab(for: path), .notes, path)
        }
        XCTAssertEqual(RootViewController.tab(for: "/library/import"), .materials)
        XCTAssertEqual(RootViewController.tab(for: "/settings"), .today)
        XCTAssertEqual(RootViewController.tab(for: "/readiness"), .today)
        XCTAssertEqual(RootViewController.tab(for: "/favorites/reviewer"), .notes)
    }
    func testNativeQAStatePreservesNumericValues() {
        XCTAssertEqual(WebContainerViewController.serializedQAValue(NSNumber(value: 1)), "1")
        XCTAssertEqual(WebContainerViewController.serializedQAValue(NSNumber(value: 18)), "18")
        XCTAssertEqual(WebContainerViewController.serializedQAValue(true), "true")
    }

    func testContinuousRecognitionDoesNotStopAfterFinalResult() {
        XCTAssertFalse(SpeechRecognitionService.shouldStopAfterFinalResult(continuous: true))
        XCTAssertTrue(SpeechRecognitionService.shouldStopAfterFinalResult(continuous: false))
    }

    func testContinuousRecognitionRestartsAfterFinalResult() {
        XCTAssertTrue(SpeechRecognitionService.shouldRestartAfterFinalResult(continuous: true))
        XCTAssertFalse(SpeechRecognitionService.shouldRestartAfterFinalResult(continuous: false))
    }
}

private final class NavigationMessageHandler: NSObject, WKScriptMessageHandler {
    let received: ([String: Any]) -> Void
    init(received: @escaping ([String: Any]) -> Void) { self.received = received }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], body["type"] as? String == "managedNavigation",
              let payload = body["payload"] as? [String: Any] else { return }
        received(payload)
    }
}
