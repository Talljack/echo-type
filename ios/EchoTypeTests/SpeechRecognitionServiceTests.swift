import XCTest
@testable import EchoType

final class SpeechRecognitionServiceTests: XCTestCase {
    func testContinuousRecognitionDoesNotStopAfterFinalResult() {
        XCTAssertFalse(SpeechRecognitionService.shouldStopAfterFinalResult(continuous: true))
        XCTAssertTrue(SpeechRecognitionService.shouldStopAfterFinalResult(continuous: false))
    }

    func testContinuousRecognitionRestartsAfterFinalResult() {
        XCTAssertTrue(SpeechRecognitionService.shouldRestartAfterFinalResult(continuous: true))
        XCTAssertFalse(SpeechRecognitionService.shouldRestartAfterFinalResult(continuous: false))
    }
}
