import { signal } from '@angular/core';
import type { Recording, Speaker } from '../models/exam';

/**
 * Turn-by-turn playback of a listening script with the Web Speech API (speechSynthesis).
 *
 * Browser quirks handled here:
 * - Chrome stops long utterances after ~15 s, so every turn is split into short chunks that are
 *   spoken one at a time.
 * - `pause()`/`resume()` are unreliable (Safari iOS, Android Chrome). Pausing cancels the current chunk
 *   and resuming speaks it again from its start, so it works everywhere.
 * - `cancel()` fires `end` on Safari and `error` on Chrome. A generation counter makes the callbacks
 *   of cancelled utterances harmless.
 * - Some engines never call `onend`. A watchdog based on the expected duration moves on anyway.
 * - Voices arrive late (`voiceschanged`), so they are looked up for every chunk.
 */

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended' | 'failed';

const MAX_CHUNK = 170;

/** Splits text into pieces of at most `max` characters, at sentence ends, then commas, then spaces. */
export function splitIntoChunks(text: string, max = MAX_CHUNK): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/.+?[.!?]+["')’”]*(?=\s|$)|.+$/g) ?? [clean];
  const chunks: string[] = [];
  for (const sentence of sentences.map((s) => s.trim()).filter(Boolean)) {
    if (sentence.length <= max) {
      chunks.push(sentence);
      continue;
    }
    let rest = sentence;
    while (rest.length > max) {
      const window = rest.slice(0, max);
      const cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf(' '));
      const at = cut > max / 3 ? cut + 1 : max;
      chunks.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) chunks.push(rest);
  }
  return chunks;
}

const FEMALE_HINT =
  /female|woman|zira|hazel|susan|libby|sonia|samantha|serena|kate|fiona|karen|moira|aria|jenny|emma|amy|olivia|natasha/i;
const MALE_HINT =
  /\bmale\b|\bman\b|david|george|ryan|daniel|alex|mark|oliver|thomas|james|rishi|guy|brian|arthur|ethan/i;

export interface VoiceChoice {
  voice: SpeechSynthesisVoice | undefined;
  /** Pitch multiplier so that two speakers sharing one voice still sound different. */
  pitch: number;
}

/**
 * Picks one voice per speaker: right language and gender when the device has them, a different voice
 * for each speaker when possible, the learner's preferred voice for the first speaker. Pure and testable.
 */
export function chooseVoices(
  speakers: readonly Speaker[],
  voices: readonly SpeechSynthesisVoice[],
  preferredUri: string | null,
): Map<string, VoiceChoice> {
  const result = new Map<string, VoiceChoice>();
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const used = new Map<string, number>();
  speakers.forEach((speaker, index) => {
    const wanted = speaker.voice.lang.toLowerCase();
    const preferred =
      index === 0 && preferredUri ? voices.find((v) => v.voiceURI === preferredUri) : undefined;
    const score = (v: SpeechSynthesisVoice): number => {
      let s = 0;
      const lang = v.lang.replace('_', '-').toLowerCase();
      if (lang === wanted) s += 4;
      else if (lang.startsWith(wanted.slice(0, 2))) s += 1;
      const hint = speaker.voice.gender === 'female' ? FEMALE_HINT : MALE_HINT;
      if (speaker.voice.gender && hint.test(v.name)) s += 3;
      if (speaker.voice.gender) {
        const other = speaker.voice.gender === 'female' ? MALE_HINT : FEMALE_HINT;
        if (other.test(v.name) && !hint.test(v.name)) s -= 3;
      }
      if (/natural|neural/i.test(v.name)) s += 2;
      if (/google/i.test(v.name)) s += 1;
      s -= (used.get(v.voiceURI) ?? 0) * 6;
      return s;
    };
    const best = preferred ?? [...english].sort((a, b) => score(b) - score(a))[0];
    const shared = best ? (used.get(best.voiceURI) ?? 0) > 0 : index > 0;
    if (best) used.set(best.voiceURI, (used.get(best.voiceURI) ?? 0) + 1);
    const female = speaker.voice.gender === 'female';
    const base = speaker.voice.pitch ?? 1;
    const pitch = shared
      ? base * (speaker.voice.gender ? (female ? 1.18 : 0.85) : index % 2 ? 0.85 : 1.15)
      : base;
    result.set(speaker.id, { voice: best, pitch });
  });
  return result;
}

// ---- Environment (so the playback can be tested without a browser) ----

export interface UtteranceLike {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  voice: SpeechSynthesisVoice | null;
  onend: ((event: unknown) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

export interface PlaybackEnv {
  synth: Pick<SpeechSynthesis, 'speak' | 'cancel'>;
  createUtterance: (text: string) => UtteranceLike;
  voices: () => readonly SpeechSynthesisVoice[];
  rate: () => number;
  voiceUri: () => string | null;
  /** True while the engine is speaking or has queued speech. */
  busy?: () => boolean;
}

interface Chunk {
  turn: number;
  text: string;
  speaker: string;
}

/** Plays one recording. Signals are safe to bind in templates. */
export class ScriptPlayback {
  readonly state = signal<PlaybackState>('idle');
  /** Index of the turn being spoken (or the last one spoken). */
  readonly turn = signal(0);
  readonly turnCount: number;

  private readonly chunks: Chunk[];
  private readonly speakers: Map<string, Speaker>;
  private cursor = 0;
  private generation = 0;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private voiceMap = new Map<string, VoiceChoice>();

  constructor(
    private readonly recording: Recording,
    private readonly env: PlaybackEnv,
  ) {
    this.turnCount = recording.turns.length;
    this.speakers = new Map(recording.speakers.map((s) => [s.id, s]));
    this.chunks = recording.turns.flatMap((t, turn) =>
      splitIntoChunks(t.text).map((text) => ({ turn, text, speaker: t.speaker })),
    );
  }

  get speakerId(): string | undefined {
    return this.recording.turns[this.turn()]?.speaker;
  }

  /** Starts from the beginning. */
  restart(): void {
    this.startAt(0);
  }

  /** Starts, or restarts from the beginning when it already ended. */
  play(): void {
    if (this.state() === 'playing') return;
    if (this.state() === 'paused') this.startAt(this.cursor);
    else this.startAt(0);
  }

  pause(): void {
    if (this.state() !== 'playing') return;
    this.halt();
    this.state.set('paused');
  }

  resume(): void {
    if (this.state() === 'paused') this.startAt(this.cursor);
  }

  /** Speaks the current turn again from its first words. */
  repeatTurn(): void {
    this.startAt(this.firstChunkOfTurn(this.turn()));
  }

  /** Jumps to a turn and speaks from there. */
  seekTurn(turn: number): void {
    this.startAt(this.firstChunkOfTurn(Math.max(0, Math.min(turn, this.turnCount - 1))));
  }

  stop(): void {
    this.halt();
    this.cursor = 0;
    this.turn.set(0);
    this.state.set('idle');
  }

  private firstChunkOfTurn(turn: number): number {
    const index = this.chunks.findIndex((c) => c.turn === turn);
    return index >= 0 ? index : 0;
  }

  private halt(): void {
    this.generation++;
    clearTimeout(this.watchdog);
    this.env.synth.cancel();
  }

  private startAt(chunkIndex: number): void {
    if (this.chunks.length === 0) {
      this.state.set('ended');
      return;
    }
    const wasBusy = this.env.busy?.() ?? false;
    this.halt();
    this.cursor = chunkIndex;
    this.turn.set(this.chunks[chunkIndex].turn);
    this.state.set('playing');
    this.voiceMap = chooseVoices(this.recording.speakers, this.env.voices(), this.env.voiceUri());
    if (!wasBusy) {
      // Speak inside the click handler: iOS Safari only allows the first utterance during a user gesture.
      this.speakCurrent();
      return;
    }
    // Chrome may drop a speak() issued in the same tick as cancel() of running speech, so wait a moment.
    const generation = this.generation;
    setTimeout(() => {
      if (generation === this.generation) this.speakCurrent();
    }, 40);
  }

  private speakCurrent(): void {
    const chunk = this.chunks[this.cursor];
    const generation = this.generation;
    const speaker = this.speakers.get(chunk.speaker);
    const utterance = this.env.createUtterance(chunk.text);
    const choice = this.voiceMap.get(chunk.speaker) ?? { voice: undefined, pitch: 1 };
    const rate = (speaker?.voice.rate ?? 1) * this.env.rate();
    utterance.lang = speaker?.voice.lang ?? 'en-GB';
    utterance.rate = rate;
    utterance.pitch = choice.pitch;
    if (choice.voice) utterance.voice = choice.voice;

    const next = () => {
      if (generation !== this.generation) return;
      clearTimeout(this.watchdog);
      this.generation++;
      this.cursor++;
      if (this.cursor >= this.chunks.length) {
        this.state.set('ended');
        return;
      }
      this.turn.set(this.chunks[this.cursor].turn);
      const gen = this.generation;
      setTimeout(() => {
        if (gen === this.generation) this.speakCurrent();
      }, 0);
    };
    utterance.onend = () => next();
    utterance.onerror = (event) => {
      if (generation !== this.generation) return;
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      this.generation++;
      clearTimeout(this.watchdog);
      this.state.set('failed');
    };
    // About 14 characters per second at normal speed; allow generous slack before giving up.
    const expectedMs = (chunk.text.length / 14 / Math.max(0.5, rate)) * 1000;
    this.watchdog = setTimeout(next, expectedMs * 1.8 + 4000);
    try {
      this.env.synth.speak(utterance as unknown as SpeechSynthesisUtterance);
    } catch {
      this.generation++;
      clearTimeout(this.watchdog);
      this.state.set('failed');
    }
  }
}
