"""Paths, models and tuning values of the listening audio tool. See README.md."""
import os
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
EXAMS_DIR = ROOT / "src" / "assets" / "exams"
AUDIO_DIR = ROOT / "public" / "audio"
CACHE_DIR = HERE / ".cache"
REFS_DIR = CACHE_DIR / "refs"
PENDING_FILE = ROOT / "exams-pending.txt"

HOST = "127.0.0.1"
PORT = int(os.environ.get("TTS_PORT", "8765"))

MODEL_BASE = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
MODEL_DESIGN = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
# Part of every recording hash: change it when the models, voices or encoding change, so that
# all exams show as stale and are made again.
VOICE_VERSION = "qwen3-tts-1.7b-opus32-v1"

BATCH = int(os.environ.get("TTS_BATCH", "16"))
COMPILE = os.environ.get("TTS_COMPILE", "1") != "0"

CHUNK_WORDS = 40
GAP_SECONDS = 0.6
CHUNK_GAP_SECONDS = 0.2
SENTENCE_END = re.compile(r"(?<!\bMr\.)(?<!\bMrs\.)(?<!\bMs\.)(?<!\bDr\.)(?<!\bSt\.)(?<=[.!?])\s+")
OPUS_ARGS = ["-ac", "1", "-c:a", "libopus", "-b:a", "32k", "-application", "audio"]

ACCENT = {"en-GB": "British", "en-US": "American", "en-AU": "Australian", "en-IE": "Irish"}
REF_TEXT = "Hello, this is a short sample of my voice. I hope the weather stays nice for the rest of the week."
