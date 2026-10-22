# Speaking (`features/exam/speaking`, `core`)

## Services

- `SpeechRecognitionService` (provided per component). Signals: `status` (idle|listening|stopped|error|unsupported), `interimTranscript`, `finalTranscript`, `error`, `capability`, `needsOnlinePermission`. It feature-detects `SpeechRecognition.available/install` (on-device first), uses online recognition only if the `onlineRecognition` setting is on, restarts when Chrome ends the session while the learner is recording, and de-duplicates Android's repeated results. The token `SPEECH_RECOGNITION_CTOR` lets tests inject a mock.
- `MicRecorderService` (per component): one `getUserMedia` for `MediaRecorder` (webm/opus, mp4 on Safari) and an `AnalyserNode` level meter. It releases the mic on stop and on destroy. `salvage` saves a recording in progress if the page is left.
- `SpeechService.speakText()` is the examiner voice.

## UI

`SpeakingResponse` is the card every speaking renderer uses: record, live transcript, playback, re-record, delete, editable transcript, practice feedback.

Renderers: `questions-part` (interview, discussion; one question at a time), `photo-part`, `collaborative-part`, `monologue-part`, `role-play-part`. Prompt ids and answer keys: `parts/speaking-prompts.ts` (`speakingPrompts`, `isResponded`).

## Feedback metrics

`core/speech-metrics.ts` `analyzeSpeech(text, seconds)`: words, words per minute, sentence length, type/token ratio, B1 connectors, fillers. These are guidance only, never a score.

## Stored data

Transcripts: `answers['speaking:<id>']`. Durations: `answers['speaking-dur:<id>']`. Chosen topic: `speaking-topic:<partId>`. All are archived per attempt. Recordings are in IndexedDB (see persistence.md).

## Photos

Speaking photos are real Wikimedia Commons images stored locally under `src/assets/images/exams/<examId>/` (1000 px and 480 px WebP) with `image.credit`, `alt` and `describeHints`. `/credits` lists every photo. See authoring-exams.md for how to add one.
