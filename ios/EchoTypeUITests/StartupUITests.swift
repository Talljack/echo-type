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
                // The native shell fabricates page=dashboard before loading. These stats
                // are reported only by the dashboard React effect after hydration.
                predicate: NSPredicate(
                    format: "exists == true AND label CONTAINS %@ AND label CONTAINS %@ AND label CONTAINS %@",
                    "page=dashboard", "totalContent=", "totalSessions="
                ),
                object: dashboard
            )
            XCTAssertEqual(XCTWaiter.wait(for: [rendered], timeout: 45), .completed,
                           "The dashboard JS must execute inside WKWebView, not just display native chrome")
            let heading = app.webViews.staticTexts.matching(
                NSPredicate(format: "label IN %@", ["What to practice today", "今天练什么"])
            ).firstMatch
            XCTAssertTrue(heading.waitForExistence(timeout: 15), "Actual dashboard content must render in WKWebView")
            XCTAssertTrue(app.buttons["native-tab-today"].isHittable)

            if attempt == 1 {
                // Observe longer than the reported desktop startup timeout; detect a delayed native/WebView crash.
                let deadline = Date().addingTimeInterval(65)
                while Date() < deadline {
                    XCTAssertEqual(app.state, .runningForeground)
                    XCTAssertTrue(dashboard.exists)
                    XCTAssertTrue(heading.exists)
                    RunLoop.current.run(until: Date().addingTimeInterval(1))
                }

                // Unvisited tabs must still load their real web content on demand.
                app.buttons["native-tab-materials"].tap()
                let importContent = app.webViews.buttons.matching(
                    NSPredicate(format: "label IN %@", ["Import Content", "导入内容"])
                ).firstMatch
                XCTAssertTrue(importContent.waitForExistence(timeout: 30), "The lazily loaded Library must render")
                app.buttons["native-tab-today"].tap()
                XCTAssertTrue(heading.waitForExistence(timeout: 15), "Returning to Today must preserve the rendered dashboard")
            }

            let screenshot = XCTAttachment(screenshot: app.screenshot())
            screenshot.name = "startup-\(attempt)"
            screenshot.lifetime = .keepAlways
            add(screenshot)
            app.terminate()
        }
    }
}
