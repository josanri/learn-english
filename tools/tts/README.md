# Listening audio generator

A local web page that makes the audio files of the listening recordings with [Qwen3-TTS](https://huggingface.co/Qwen) 1.7B and encodes them as Opus 32 kbps. The app plays these files and uses browser speech synthesis when a file is missing or old. How the app reads the files is in [docs/listening-audio.md](../../docs/listening-audio.md).

This tool is for maintainers only. It is not part of the build, and the app does not need it to run.

## Requirements

- An NVIDIA GPU with 12 GB of memory and a recent driver (CUDA 12.8).
- Python 3.12.
- ffmpeg on the `PATH` (on Windows the tool also finds a winget install).
- Disk space for the two models (several GB). Hugging Face downloads them to its cache on the first run.

## Set up (once)

From the repository root:

```
python -m pip install uv
python -m uv venv tools/tts/.venv --python 3.12
python -m uv pip install --python tools/tts/.venv/Scripts/python.exe torch torchaudio --index-url https://download.pytorch.org/whl/cu128
python -m uv pip install --python tools/tts/.venv/Scripts/python.exe -r tools/tts/requirements.txt
winget install Gyan.FFmpeg
```

On Linux or macOS, use `tools/tts/.venv/bin/python` and install ffmpeg with the package manager.

## Use

1. Run `npm run tts`.
2. Open http://127.0.0.1:8765.
3. Press GO to make every exam that has no audio or old audio.
4. To make one exam again, use the Generate / Redo button of its row.
5. To end the queue early, press "Stop after this exam". The exam that runs now finishes first.
6. Listen to the new files before you commit them (see [Check the result](#check-the-result)).
7. Commit `public/audio/<level>/<board>/<exam id>/` with the exam change.

Exams listed in `exams-pending.txt` (repository root, optional) are skipped unless you tick "Include exams with short scripts". The tool reads only the last line of that file that contains only numbers, for example `12 37 41`.

The first exam after a start is slow (several minutes): the tool loads the models and `torch.compile` runs once. Later exams are faster. The page shows the average time per exam.

## Exam states

| State   | Meaning                                                                                   |
| ------- | ----------------------------------------------------------------------------------------- |
| missing | There is no `manifest.json` for the exam.                                                 |
| stale   | The script, a speaker voice or `VOICE_VERSION` changed after the audio was made. Redo it. |
| done    | Every recording hash in the manifest matches the exam.                                    |

## Settings

Environment variables:

| Variable      | Default | Effect                                                                      |
| ------------- | ------- | --------------------------------------------------------------------------- |
| `TTS_PORT`    | `8765`  | Port of the local page.                                                     |
| `TTS_BATCH`   | `16`    | Text chunks per GPU batch. Use a lower value if the GPU runs out of memory. |
| `TTS_COMPILE` | `1`     | Set `0` to skip `torch.compile`: a faster start, slower generation.         |

Other values (pause lengths, chunk size, Opus settings, models) are in `config.py`. If you change the models, the voices or the encoding, change `VOICE_VERSION` too. Then every exam shows as stale.

## Files

| File               | Content                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `run.mjs`          | Launcher for `npm run tts` and `npm run test:tts`. It finds the Python of `.venv`.                    |
| `server.py`        | HTTP server, API and job queue. The entry point.                                                      |
| `catalog.py`       | Reads the exams and manifests: recording hash, script fingerprint, exam state. Standard library only. |
| `engine.py`        | Loads the models, makes the reference voices, generates the audio and writes Opus and the manifest.   |
| `speedups.py`      | Speed patches for Qwen3-TTS (CUDA graph for the code predictor, grouped speech decoding).             |
| `config.py`        | Paths, models and tuning values.                                                                      |
| `index.html`       | The page: one file, no build step.                                                                    |
| `test_tts.py`      | Unit tests of the parts that do not need the GPU (`npm run test:tts`).                                |
| `requirements.txt` | Python packages, without torch (install torch from the CUDA index, see above).                        |
| `.cache/`          | Not in git. The reference voices (`refs/`) and a temporary WAV file.                                  |

## How it works

1. `catalog.py` finds every recording (an object with `speakers` and `turns`) in the listening section of each exam.
2. Each speaker gets a reference voice: accent (`en-GB`, `en-US`, `en-AU`, `en-IE`; other accents use `en-GB`), gender and a variant 0 or 1. Two speakers of the same accent and gender in one recording get different variants.
3. On the first run, the VoiceDesign model makes the 16 reference voices from a text description. They are kept in `.cache/refs/`, so a speaker sounds the same in every exam. Delete that folder to make new voices, and change `VOICE_VERSION`.
4. The tool cuts each turn into chunks of whole sentences (40 words at most) and sorts all chunks of the exam by length. The Base model clones the reference voice for each chunk, 16 chunks per batch.
5. The tool joins the chunks of each recording with pauses (0.2 s inside a turn, 0.6 s after a turn) and encodes `r01.opus`, `r02.opus` ... with ffmpeg.
6. Last, it writes `manifest.json`. For each recording the manifest holds the file name, a `hash` (for the tool), a `fingerprint` (for the app), the length and the start time of each turn.

The tool writes each file to a `.part` file first and then renames it. If it stops in the middle, the old audio stays usable.

The `fingerprint` must give the same value as `scriptFingerprint` in `src/app/core/audio-clips.service.ts`. If you change one, change the other and the expected values in `test_tts.py`.

## Check the result

- Listen to every new recording. A generated line can skip, repeat or change a word. Numbers, times, prices and names matter most, because the questions test them.
- If a line is wrong, press Redo for the exam. The output is random, so a second run usually fixes it. If the same line fails again, write the number or name in a different form in the script (for example "half past seven" for "7:30").

## Troubleshooting

| Problem                         | Fix                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `No virtual environment at ...` | Do the set-up steps.                                                                 |
| `ffmpeg not found`              | Install ffmpeg, then restart the tool.                                               |
| CUDA out of memory              | Close other GPU programs, or start with `TTS_BATCH=8`.                               |
| The first batch takes very long | Normal: `torch.compile` runs once per start. Use `TTS_COMPILE=0` for short sessions. |
| Three failures in a row         | The queue stops. Read the error in the log panel or the terminal.                    |
| The page shows 403              | Open it as `127.0.0.1` or `localhost`. The server refuses other host names.          |
