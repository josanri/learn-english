# Listening audio

Listening recordings play from a generated audio file when one exists. If there is none, or the script changed after the audio was made, the player uses the browser speech synthesis (see [exam-engine.md](exam-engine.md)).

## How the app finds a file

- Files live in `public/audio/<level>/<board>/<examId>/`: `r01.opus` ... and `manifest.json`.
- `AudioClipsService` (`core/audio-clips.service.ts`) loads the manifest of the open exam. It finds a recording by `scriptFingerprint` (FNV-1a of the `speaker|text` lines). The tool computes the same value, so a changed script never plays old audio.
- `FilePlayback` (`core/audio-playback.ts`) has the same surface as `ScriptPlayback` (`RecordingPlayback`). It finds the current turn from the start times in the manifest and applies the speech speed setting as `playbackRate`.
- If the browser cannot play a file, `AudioScriptPlayer` marks its URL as failed and uses speech synthesis.
- `ngsw-config.json` does not list `.opus`, so the service worker does not precache the audio. The files are about 2 MB per exam.

## The generator tool

`tools/tts/` is a local web page that makes the files with Qwen3-TTS 1.7B (voice design for the reference voices, voice cloning for the lines) and encodes Opus 32 kbps. It needs an NVIDIA GPU with 12 GB. Set-up, use, settings and troubleshooting are in [tools/tts/README.md](../tools/tts/README.md).

- `npm run tts` starts it at http://127.0.0.1:8765. `npm run test:tts` runs its unit tests (no GPU needed).
- An exam is "stale" when its script changed after the audio was made (the `hash` in the manifest differs). Generate it again.
- The `fingerprint` in the manifest comes from `tools/tts/catalog.py`. It must stay equal to `scriptFingerprint`; `tools/tts/test_tts.py` checks fixed values.
- Check by ear: a generated line can skip or change a word. Numbers and times matter most.
