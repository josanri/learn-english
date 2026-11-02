#!/usr/bin/env python
"""Local web tool that generates the listening audio of the exams with Qwen3-TTS.

Start it with `npm run tts` (see README.md), open http://127.0.0.1:8765 and press GO.
The audio goes to public/audio/<level>/<board>/<exam id>/ together with a manifest.json
that holds, per recording, a hash of its script, its length and the start time of each turn.

This file holds the job queue and the HTTP API. catalog.py reads the exams, engine.py makes the audio.
"""
import json
import sys
import threading
import time
import traceback
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

from catalog import exam_rows, load_exams
from config import AUDIO_DIR, CACHE_DIR, HERE, HOST, PORT

lock = threading.Lock()
job = {
    "running": False,
    "stopping": False,
    "phase": "idle",
    "exam": None,
    "exam_started": None,
    "queue": [],
    "done": 0,
    "total": 0,
    "batch": [0, 0],
    "started": None,
    "exam_seconds": [],
    "errors": [],
}
log_lines = deque(maxlen=300)


def log(message):
    line = time.strftime("%H:%M:%S ") + message
    print(line, flush=True)
    with lock:
        log_lines.append(line)


def progress(phase, batch, batches):
    with lock:
        job["phase"] = phase
        if batches:
            job["batch"] = [batch, batches]


def snapshot():
    rows = exam_rows()
    with lock:
        state = dict(job)
        state["log"] = list(log_lines)
    return {"exams": rows, "job": state}


# ---------------------------------------------------------------- job queue

_engine = None


def run_job(ids):
    global _engine
    by_id = {e["id"]: e for e in load_exams()}
    queue = [by_id[i] for i in ids if i in by_id]
    with lock:
        job.update(running=True, stopping=False, phase="loading models", queue=[e["id"] for e in queue],
                   done=0, total=len(queue), started=time.time(), exam_seconds=[], errors=[], exam=None)
    failures = 0
    try:
        if _engine is None:
            from engine import Engine

            _engine = Engine(log, progress)
        for exam in queue:
            with lock:
                if job["stopping"]:
                    break
                job["exam"] = exam["id"]
                job["exam_started"] = time.time()
                job["batch"] = [0, 0]
            started = time.time()
            log(f"{exam['id']}: start ({len(exam['recs'])} recordings)")
            try:
                _engine.generate(exam)
                failures = 0
                took = time.time() - started
                log(f"{exam['id']}: done in {took:.0f}s")
                with lock:
                    job["exam_seconds"].append(took)
            except Exception as error:  # keep the queue going after one bad exam
                failures += 1
                log(f"{exam['id']}: FAILED {error}")
                traceback.print_exc()
                with lock:
                    job["errors"].append(f"{exam['id']}: {error}")
                if failures >= 3:
                    log("Three failures in a row. Stopping.")
                    break
            with lock:
                job["done"] += 1
    except Exception as error:
        log(f"Stopped: {error}")
        traceback.print_exc()
        with lock:
            job["errors"].append(str(error))
    finally:
        with lock:
            job.update(running=False, stopping=False, phase="idle", exam=None, exam_started=None, queue=[],
                       batch=[0, 0])
        log("Finished")


def start(options):
    """Options from the page: `ids` (only these exams), `redo` (also exams that are done),
    `includePending` (also exams listed in exams-pending.txt)."""
    with lock:
        if job["running"]:
            return False
    redo = bool(options.get("redo"))
    with_pending = bool(options.get("includePending"))
    wanted = options.get("ids")
    ids = [
        r["id"] for r in exam_rows()
        if (wanted is None or r["id"] in wanted)
        and (redo or r["state"] != "done")
        and (with_pending or wanted is not None or not r["pending"])
    ]
    if not ids:
        return False
    with lock:
        job["running"] = True
    threading.Thread(target=run_job, args=(ids,), daemon=True).start()
    return True


# ---------------------------------------------------------------- http


class Handler(BaseHTTPRequestHandler):
    """GET /, GET /api/state, GET /audio/<path>, POST /api/go, POST /api/stop. Local requests only."""

    def log_message(self, *args):
        pass

    def send_bytes(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def local_only(self):
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("127.0.0.1", "localhost")

    def do_GET(self):
        if not self.local_only():
            return self.send_bytes(403, b"forbidden", "text/plain")
        path = urlparse(self.path).path
        if path == "/":
            return self.send_bytes(200, (HERE / "index.html").read_bytes(), "text/html; charset=utf-8")
        if path == "/api/state":
            return self.send_bytes(200, json.dumps(snapshot()).encode(), "application/json")
        if path.startswith("/audio/"):
            target = (AUDIO_DIR / unquote(path[len("/audio/"):])).resolve()
            if AUDIO_DIR.resolve() in target.parents and target.is_file():
                return self.send_bytes(200, target.read_bytes(), "audio/ogg")
        self.send_bytes(404, b"not found", "text/plain")

    def do_POST(self):
        if not self.local_only():
            return self.send_bytes(403, b"forbidden", "text/plain")
        length = int(self.headers.get("Content-Length") or 0)
        try:
            options = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            options = {}
        path = urlparse(self.path).path
        if path == "/api/go":
            ok = start(options)
            return self.send_bytes(200, json.dumps({"started": ok}).encode(), "application/json")
        if path == "/api/stop":
            with lock:
                job["stopping"] = job["running"]
            log("Stop requested. The current exam will finish first.")
            return self.send_bytes(200, b"{}", "application/json")
        self.send_bytes(404, b"not found", "text/plain")


def main():
    CACHE_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Listening audio tool: http://{HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    sys.exit(main())
