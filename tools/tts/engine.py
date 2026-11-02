"""Generates the audio of one exam with Qwen3-TTS and writes the Opus files and manifest.json.

The heavy imports (torch, qwen_tts) happen in `Engine.__init__`, so this module loads without them.
"""
import json
import os
import shutil
import subprocess
from pathlib import Path

from config import (
    ACCENT, AUDIO_DIR, BATCH, CACHE_DIR, CHUNK_GAP_SECONDS, CHUNK_WORDS, COMPILE, GAP_SECONDS, MODEL_BASE,
    MODEL_DESIGN, OPUS_ARGS, REF_TEXT, REFS_DIR, SENTENCE_END, VOICE_VERSION,
)
from catalog import script_fingerprint


def split_text(text):
    """Cuts a long turn into chunks of whole sentences. A batch runs until its longest item ends,
    so a few 280-word monologues kept the whole exam waiting."""
    chunks, current = [], ""
    for sentence in SENTENCE_END.split(text.strip()):
        joined = f"{current} {sentence}".strip()
        if current and len(joined.split()) > CHUNK_WORDS:
            chunks.append(current)
            current = sentence
        else:
            current = joined
    return chunks + [current]


def find_ffmpeg():
    found = shutil.which("ffmpeg")
    if found:
        return found
    base = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
    for candidate in base.glob("Gyan.FFmpeg*/**/bin/ffmpeg.exe"):
        return str(candidate)
    raise RuntimeError("ffmpeg not found. Install it (winget install Gyan.FFmpeg) and restart the tool.")


class Engine:
    """Holds the models and the reference voices. Loaded once, on the first GO.

    `log(message)` writes a log line. `progress(phase, batch, batches)` reports the current step.
    """

    def __init__(self, log, progress):
        import numpy as np
        import soundfile as sf
        import torch
        from qwen_tts import Qwen3TTSModel

        import speedups

        self.np, self.sf, self.torch = np, sf, torch
        self.log, self.progress = log, progress
        self.ffmpeg = find_ffmpeg()
        REFS_DIR.mkdir(parents=True, exist_ok=True)
        keys = [(lang, gender, v) for lang in ACCENT for gender in ("female", "male") for v in (0, 1)]
        missing = [k for k in keys if not self.ref_path(k).exists()]
        if missing:
            log(f"Making {len(missing)} reference voices (one time)")
            design = Qwen3TTSModel.from_pretrained(MODEL_DESIGN, device_map="cuda", dtype=torch.bfloat16,
                                                   attn_implementation="sdpa")
            for key in missing:
                wavs, sr = design.generate_voice_design(text=REF_TEXT, language="English",
                                                        instruct=self.describe(key))
                sf.write(self.ref_path(key), wavs[0], sr)
            del design
            torch.cuda.empty_cache()
        log("Loading the 1.7B model")
        self.model = Qwen3TTSModel.from_pretrained(MODEL_BASE, device_map="cuda", dtype=torch.bfloat16,
                                                   attn_implementation="sdpa")
        speedups.install(self.model)
        if COMPILE:
            talker = self.model.model.talker
            talker.model = torch.compile(talker.model, dynamic=True)
        self.prompts = {}
        for key in keys:
            data, sr = sf.read(self.ref_path(key), dtype="float32")
            self.prompts[key] = self.model.create_voice_clone_prompt(ref_audio=(data, sr), ref_text=REF_TEXT)[0]
        self.compiled_once = False

    @staticmethod
    def ref_path(key):
        return REFS_DIR / ("_".join(map(str, key)) + ".wav")

    @staticmethod
    def describe(key):
        lang, gender, variant = key
        age = ["young adult", "middle-aged"][variant % 2]
        return (f"A clear {age} {gender} speaker with a {ACCENT.get(lang, 'neutral')} English accent, "
                "natural pace, calm and friendly, suitable for an English listening exam.")

    @staticmethod
    def speaker_keys(rec):
        """Reference voice per speaker: (accent, gender, variant). Two speakers of the same accent and
        gender in one recording get different variants."""
        keys, seen = {}, []
        for spk in rec["speakers"]:
            base = (spk["voice"]["lang"], spk["voice"]["gender"])
            if base[0] not in ACCENT:
                base = ("en-GB", base[1])
            variant = sum(1 for b in seen if b == base) % 2
            seen.append(base)
            keys[spk["id"]] = base + (variant,)
        return keys

    def generate(self, exam):
        results, sample_rate = self.synthesize(exam)
        self.progress("encoding", 0, 0)
        self.write(exam, results, sample_rate)

    def synthesize(self, exam):
        """All chunks of all recordings, longest first, in batches of BATCH. Returns chunk index -> wav."""
        np = self.np
        turns = []
        for rec in exam["recs"]:
            keys = self.speaker_keys(rec)
            for turn in rec["turns"]:
                turns += [{"text": chunk, "key": keys[turn["speaker"]]} for chunk in split_text(turn["text"])]
        order = sorted(range(len(turns)), key=lambda i: -len(turns[i]["text"]))
        results, sample_rate = {}, 24000
        batches = -(-len(order) // BATCH)
        for b in range(batches):
            ids = order[b * BATCH:(b + 1) * BATCH]
            phase = ("compiling (first batch, about 3 minutes)" if COMPILE and not self.compiled_once
                     else "generating")
            self.progress(phase, b + 1, batches)
            longest = max(len(turns[i]["text"].split()) for i in ids)
            wavs, sample_rate = self.model.generate_voice_clone(
                text=[turns[i]["text"] for i in ids], language="English",
                voice_clone_prompt=[self.prompts[turns[i]["key"]] for i in ids],
                max_new_tokens=min(2000, 100 + 10 * longest))
            self.compiled_once = True
            for i, wav in zip(ids, wavs):
                results[i] = np.asarray(wav, dtype=np.float32)
        return results, sample_rate

    def write(self, exam, results, sample_rate):
        """Joins the chunks per recording with pauses, encodes Opus and replaces manifest.json last."""
        np, sf = self.np, self.sf
        folder = AUDIO_DIR / exam["dir"]
        folder.mkdir(parents=True, exist_ok=True)
        gap = np.zeros(int(sample_rate * GAP_SECONDS), dtype=np.float32)
        chunk_gap = np.zeros(int(sample_rate * CHUNK_GAP_SECONDS), dtype=np.float32)
        recordings, cursor = [], 0
        for ri, rec in enumerate(exam["recs"]):
            pieces, starts, position = [], [], 0.0
            for turn in rec["turns"]:
                starts.append(round(position, 2))
                count = len(split_text(turn["text"]))
                for ci in range(count):
                    wav = results[cursor]
                    cursor += 1
                    pause = gap if ci == count - 1 else chunk_gap
                    pieces += [wav, pause]
                    position += (len(wav) + len(pause)) / sample_rate
            name = f"r{ri + 1:02d}.opus"
            temp_wav = CACHE_DIR / "tmp.wav"
            sf.write(temp_wav, np.concatenate(pieces), sample_rate)
            temp_out = folder / (name + ".part")
            subprocess.run([self.ffmpeg, "-y", "-loglevel", "error", "-i", str(temp_wav), *OPUS_ARGS,
                            "-f", "ogg", str(temp_out)], check=True)
            os.replace(temp_out, folder / name)
            recordings.append({"file": name, "hash": exam["hashes"][ri],
                               "fingerprint": script_fingerprint(rec), "duration": round(position, 2),
                               "turns": starts})
        for old in folder.glob("r*.opus"):
            if old.name not in {r["file"] for r in recordings}:
                old.unlink()
        manifest = {"version": 1, "voice": VOICE_VERSION, "recordings": recordings}
        temp_manifest = folder / "manifest.json.part"
        temp_manifest.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
        os.replace(temp_manifest, folder / "manifest.json")
