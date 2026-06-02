import AVFoundation
import Foundation
import Speech

struct SpeechRecognitionResult {
    let transcript: String
    let isFinal: Bool

    var asDictionary: [String: Any] {
        [
            "transcript": transcript,
            "isFinal": isFinal
        ]
    }
}

protocol SpeechRecognitionServiceDelegate: AnyObject {
    func speechRecognitionServiceDidUpdateAvailability(isAvailable: Bool)
    func speechRecognitionServiceDidReceive(result: SpeechRecognitionResult)
    func speechRecognitionServiceDidFail(message: String)
}

final class SpeechRecognitionService: NSObject {
    weak var delegate: SpeechRecognitionServiceDelegate?

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))

    init(delegate: SpeechRecognitionServiceDelegate?) {
        self.delegate = delegate
        super.init()
        recognizer?.delegate = self
    }

    func requestPermissions() {
        AVAudioApplication.requestRecordPermission { [weak self] granted in
            guard let self else { return }
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async {
                    self.delegate?.speechRecognitionServiceDidUpdateAvailability(
                        isAvailable: granted && status == .authorized
                    )
                }
            }
        }
    }

    func start(payload: [String: Any]) {
        stop()

        let localeIdentifier = payload["lang"] as? String ?? "en-US"
        recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier))
        recognizer?.delegate = self

        guard let recognizer, recognizer.isAvailable else {
            delegate?.speechRecognitionServiceDidFail(message: "Speech recognition is unavailable.")
            return
        }

        do {
            try configureAudioSession()
        } catch {
            delegate?.speechRecognitionServiceDidFail(message: "Unable to configure audio session.")
            return
        }

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest else {
            delegate?.speechRecognitionServiceDidFail(message: "Unable to start speech recognition.")
            return
        }

        recognitionRequest.shouldReportPartialResults = payload["interimResults"] as? Bool ?? true

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()

        do {
            try audioEngine.start()
        } catch {
            delegate?.speechRecognitionServiceDidFail(message: "Microphone did not start.")
            return
        }

        recognitionTask = recognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self else { return }

            if let result {
                self.delegate?.speechRecognitionServiceDidReceive(
                    result: SpeechRecognitionResult(
                        transcript: result.bestTranscription.formattedString,
                        isFinal: result.isFinal
                    )
                )

                if result.isFinal {
                    self.stop()
                }
            }

            if let error {
                self.stop()
                self.delegate?.speechRecognitionServiceDidFail(message: error.localizedDescription)
            }
        }
    }

    func stop() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }

        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
    }

    private func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true, options: .notifyOthersOnDeactivation)
    }
}

extension SpeechRecognitionService: SFSpeechRecognizerDelegate {
    func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        delegate?.speechRecognitionServiceDidUpdateAvailability(isAvailable: available)
    }
}
