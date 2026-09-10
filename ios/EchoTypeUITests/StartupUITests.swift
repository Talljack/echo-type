import XCTest

/// Starts the real native host against the current commit's web build, not a fixture or production deployment.
final class StartupUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testRepeatedColdLaunchRendersDashboardAndRemainsAlive() throws {
        let configuredOrigin = try XCTUnwrap(
            ProcessInfo.processInfo.environment["ECHOTYPE_UI_TEST_WEB_ORIGIN"],
            "Set TEST_RUNNER_ECHOTYPE_UI_TEST_WEB_ORIGIN to the locally built web server"
        )
        let origin = try XCTUnwrap(URL(string: configuredOrigin))
        XCTAssertTrue(["localhost", "127.0.0.1"].contains(origin.host ?? ""), "Startup CI must test this commit locally")

        let app = XCUIApplication()
        app.launchEnvironment["ECHOTYPE_WEB_URL"] = origin.appendingPathComponent("dashboard").absoluteString
        defer { app.terminate() }

        for attempt in 1...3 {
            app.launch()
            XCTAssertEqual(app.state, .runningForeground)
            let dashboard = app.staticTexts["native-qa-state"]
            let rendered = XCTNSPredicateExpectation(
                predicate: NSPredicate(format: "exists == true AND label CONTAINS %@", "page=dashboard"),
                object: dashboard
            )
            XCTAssertEqual(XCTWaiter.wait(for: [rendered], timeout: 45), .completed,
                           "The dashboard JS must execute inside WKWebView, not just display native chrome")
            XCTAssertTrue(app.buttons["native-tab-today"].isHittable)

            if attempt == 1 {
                // Observe longer than the reported desktop startup timeout; detect a delayed native/WebView crash.
                let deadline = Date().addingTimeInterval(65)
                while Date() < deadline {
                    XCTAssertEqual(app.state, .runningForeground)
                    XCTAssertTrue(dashboard.exists)
                    RunLoop.current.run(until: Date().addingTimeInterval(1))
                }
            }

            let screenshot = XCTAttachment(screenshot: app.screenshot())
            screenshot.name = "startup-\(attempt)"
            screenshot.lifetime = .keepAlways
            add(screenshot)
            app.terminate()
        }
    }
}
