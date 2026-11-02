# Listening audio

Listening recordings play from a generated audio file when one exists. If there is none, or the script changed after the audio was made, the player uses the browser speech synthesis (see [exam-engine.md](exam-engine.md)).

## How the app finds a file

- Files live in `public/audio/<level>/<board>/<examId>/`: `r01.opus` ... and `manifest.json`.
- `AudioClipsService` (`core/audio-clips.service.ts`) loads the manifest of the open exam. It finds a recording by `scriptFingerprint` (FNV-1a of the `speaker|text` lines). The tool computes the same value, so a changed script never plays old audio.
- `FilePlayback` (`core/audio-playback.ts`) has the same surface as `ScriptPlayback` (`RecordingPlayback`). It finds the current turn from the start times in the manifest and applies the speech speed setting as `playbackRate`.
- If the browser cannot play a file, `AudioScriptPlayer` marks its URL as failed and uses speech synthesis.
- `ngsw-config.json` does not list `.opus`, so the service worker does not precache the audio. The files are about 2 MB per exam.

## The generator tool

`tools/tts/` is a local web page that makes the files with Qwen3-TTS 1.7B (voice design for the reference voices, voice cloning for the lines) and encodes Opus 32 kbps.

Set up once (needs an NVIDIA GPU with 12 GB, Python 3.12 and ffmpeg):

```
python -m pip install uv
python -m uv venv tools/tts/.venv --python 3.12
python -m uv pip install --python tools/tts/.venv/Scripts/python.exe torch torchaudio --index-url https://download.pytorch.org/whl/cu128
python -m uv pip install --python tools/tts/.venv/Scripts/python.exe -r tools/tts/requirements.txt
winget install Gyan.FFmpeg
```

Use:

1. `npm run tts`, then open http://127.0.0.1:8765.
2. Press GO to make every exam without audio, or use the Generate / Redo button of one row.
3. "Stop after this exam" ends the queue after the exam that is running.
4. Exams listed in `exams-pending.txt` (short scripts) are skipped unless "Include exams with short scripts" is ticked.

Notes:

- The first exam after the start is slow (several minutes): the models are loaded and `torch.compile` runs once. Later exams are faster.
- An exam is "stale" when its script changed after the audio was made (the `hash` in the manifest differs). Generate it again.
- The reference voices are cached in `tools/tts/.cache/refs`, so the voice of a speaker is the same in every exam.
- Check by ear: a generated line can skip or change a word. Numbers and times matter most.
