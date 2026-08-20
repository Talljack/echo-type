import XCTest
@testable import EchoType

final class SpeechRecognitionServiceTests: XCTestCase {
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
