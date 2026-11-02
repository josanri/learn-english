import { httpResource, type HttpResourceRef } from '@angular/common/http';
import { Injectable, Injector, inject, runInInjectionContext, untracked } from '@angular/core';
import type { Recording } from '../models/exam';

export const AUDIO_ROOT = 'audio';

interface AudioManifest {
  recordings: { file: string; fingerprint: string; duration: number; turns: number[] }[];
}

/** An audio file for one recording, with the start time of each turn in seconds. */
export interface RecordingAudio {
  url: string;
  starts: number[];
}

/**
 * Fingerprint of a script (FNV-1a over UTF-16 code units of `speaker|text` lines).
 * `tools/tts/catalog.py` computes the same value, so a recording is found by what it says.
 */
export function scriptFingerprint(recording: Recording): string {
  const text = recording.turns.map((t) => `${t.speaker}|${t.text}`).join('\n');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Finds generated audio for a recording (`audio/<level>/<board>/<examId>/manifest.json`, see
 * docs/listening-audio.md). When there is no manifest, or the script changed after the audio was made,
 * it returns `undefined` and the player uses speech synthesis.
 */
@Injectable({ providedIn: 'root' })
export class AudioClipsService {
  private readonly injector = inject(Injector);
  private readonly manifests = new Map<string, HttpResourceRef<AudioManifest | undefined>>();

  /** Reads signals, so call it inside `computed()`. */
  clipFor(
    exam: { level: string; board: string; id: string },
    recording: Recording,
  ): RecordingAudio | undefined {
    // The exam says `B1`; the folders are lower case, like the ones under `assets/exams`.
    const dir = `${AUDIO_ROOT}/${exam.level.toLowerCase()}/${exam.board}/${exam.id}`;
    let manifest = this.manifests.get(dir);
    if (!manifest) {
      manifest = this.load(dir);
      this.manifests.set(dir, manifest);
    }
    if (!manifest.hasValue()) return undefined;
    const fingerprint = scriptFingerprint(recording);
    const found = manifest.value().recordings.find((r) => r.fingerprint === fingerprint);
    if (!found || found.turns.length !== recording.turns.length) return undefined;
    return { url: `${dir}/${found.file}`, starts: found.turns };
  }

  private load(dir: string) {
    // `clipFor` runs inside `computed()`, where a resource (it creates an effect) cannot be made.
    return untracked(() =>
      runInInjectionContext(this.injector, () =>
        httpResource<AudioManifest>(() => `${dir}/manifest.json`),
      ),
    );
  }
}
