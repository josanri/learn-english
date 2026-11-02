"""Reads the exams and their audio manifests. Standard library only, so the tests run without the GPU stack."""
import hashlib
import json
import re

from config import AUDIO_DIR, EXAMS_DIR, PENDING_FILE, VOICE_VERSION


def collect_recordings(node, found):
    if isinstance(node, list):
        for item in node:
            collect_recordings(item, found)
    elif isinstance(node, dict):
        if "turns" in node and "speakers" in node:
            found.append(node)
        else:
            for value in node.values():
                collect_recordings(value, found)


def recording_hash(rec):
    """Changes when the script, the voices or VOICE_VERSION change. The tool marks the exam as stale."""
    payload = {
        "speakers": [(s["id"], s["voice"]["lang"], s["voice"]["gender"]) for s in rec["speakers"]],
        "turns": [(t["speaker"], t["text"]) for t in rec["turns"]],
        "voice": VOICE_VERSION,
    }
    return hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]


def script_fingerprint(rec):
    """FNV-1a over UTF-16 code units. Must give the same value as `scriptFingerprint` in
    src/app/core/audio-clips.service.ts: the app finds a recording's audio with it."""
    text = "\n".join(f"{t['speaker']}|{t['text']}" for t in rec["turns"])
    data = text.encode("utf-16-le")
    value = 0x811C9DC5
    for i in range(0, len(data), 2):
        value ^= data[i] | (data[i + 1] << 8)
        value = (value * 0x01000193) & 0xFFFFFFFF
    return f"{value:08x}"


_exam_cache = {}


def load_exams():
    """Every exam with a listening section, re-read only when its file changes."""
    exams = []
    for path in sorted(EXAMS_DIR.glob("*/*/*.json")):
        if path.name == "index.json":
            continue
        stamp = path.stat().st_mtime_ns
        cached = _exam_cache.get(path)
        if cached and cached[0] == stamp:
            exam = cached[1]
        else:
            data = json.loads(path.read_text(encoding="utf-8"))
            section = next((s for s in data.get("sections", []) if s.get("skill") == "listening"), None)
            if not section:
                continue
            recs = []
            collect_recordings(section, recs)
            exam = {
                "id": data["id"],
                "title": data.get("title", data["id"]),
                "dir": f"{path.parent.parent.name}/{path.parent.name}/{data['id']}",
                "recs": recs,
                "hashes": [recording_hash(r) for r in recs],
                "words": sum(len(t["text"].split()) for r in recs for t in r["turns"]),
            }
            _exam_cache[path] = (stamp, exam)
        exams.append(exam)
    return exams


def pending_numbers():
    """Exam numbers on the last all-digits line of exams-pending.txt (exams with short scripts)."""
    if not PENDING_FILE.exists():
        return set()
    text = PENDING_FILE.read_text(encoding="utf-8", errors="ignore")
    lines = [ln for ln in text.splitlines() if re.fullmatch(r"[\d\s]+", ln) and ln.strip()]
    return {int(n) for ln in lines[-1:] for n in ln.split()} if lines else set()


def exam_number(exam_id):
    match = re.search(r"(\d+)$", exam_id)
    return int(match.group(1)) if match else None


def read_manifest(exam):
    path = AUDIO_DIR / exam["dir"] / "manifest.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def exam_state(exam, manifest):
    if not manifest:
        return "missing"
    got = [r.get("hash") for r in manifest.get("recordings", [])]
    return "done" if got == exam["hashes"] else "stale"


def exam_bytes(exam):
    folder = AUDIO_DIR / exam["dir"]
    return sum(p.stat().st_size for p in folder.glob("*.opus")) if folder.exists() else 0


def exam_rows():
    """One row per exam for the page table."""
    pending = pending_numbers()
    rows = []
    for exam in load_exams():
        manifest = read_manifest(exam)
        seconds = sum(r.get("duration", 0) for r in manifest["recordings"]) if manifest else 0
        rows.append(
            {
                "id": exam["id"],
                "title": exam["title"],
                "state": exam_state(exam, manifest),
                "pending": exam_number(exam["id"]) in pending,
                "recordings": len(exam["recs"]),
                "words": exam["words"],
                "seconds": round(seconds),
                "bytes": exam_bytes(exam),
                "files": [f"{exam['dir']}/{r['file']}" for r in manifest["recordings"]] if manifest else [],
            }
        )
    return rows
