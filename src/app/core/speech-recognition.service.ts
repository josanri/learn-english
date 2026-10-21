import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { SettingsService } from './settings.service';

export type RecognitionStatus = 'idle' | 'listening' | 'stopped' | 'error' | 'unsupported';
/** What this browser can do, found by feature detection (never by user agent). */
export type RecognitionCapability =
  'checking' | 'on-device' | 'downloadable' | 'online-only' | 'unsupported';

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: RecognitionAlternative;
}
export interface RecognitionResultEvent {
  results: { readonly length: number; [index: number]: RecognitionResult };
}
export interface RecognitionErrorEvent {
  error: string;
}

/** The parts of the browser `SpeechRecognition` that the service uses. */
export interface BrowserRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(audioTrack?: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
}

export interface RecognitionConstructor {
  new (): BrowserRecognition;
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (options: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
}

/** Provides the browser constructor; tests provide a mock. */
export const SPEECH_RECOGNITION_CTOR = new InjectionToken<RecognitionConstructor | undefined>(
  'SpeechRecognition constructor',
  {
    providedIn: 'root',
    factory: () => {
      const w = inject(DOCUMENT).defaultView as
        | (Window & {
            SpeechRecognition?: RecognitionConstructor;
            webkitSpeechRecognition?: RecognitionConstructor;
          })
        | null;
      return w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
    },
  },
);

export const RECOGNITION_ERRORS: Record<string, string> = {
  'not-allowed':
    'Speech recognition was blocked. Check the microphone and speech permissions of your browser.',
  'service-not-allowed': 'This browser does not allow speech recognition here.',
  'audio-capture': 'No microphone was found for speech recognition.',
  network: 'Speech recognition could not reach its online service. Your recording is still saved.',
  'language-not-supported': 'Speech recognition is not available for this language on this device.',
};
/** Errors that Chrome raises during normal use; the session is simply restarted. */
const BENIGN_ERRORS = new Set(['no-speech', 'aborted']);
const RESTART_DELAY_MS = 250;
const MAX_QUICK_RESTARTS = 8;

/** Joins pieces of text with single spaces. */
export function joinText(...parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');
}

/**
 * Merges the final segments of one recognition session. Chrome on Android repeats earlier text:
 * identical segments are dropped and a segment that extends the previous one replaces it.
 */
export function mergeFinalSegments(segments: string[]): string {
  const out: string[] = [];
  for (const raw of segments) {
    const text = raw.trim();
    if (!text) continue;
    const previous = out[out.length - 1];
    if (previous !== undefined) {
      if (text === previous) continue;
      if (text.startsWith(previous)) {
        out[out.length - 1] = text;
        continue;
      }
    }
    out.push(text);
  }
  return joinText(...out);
}

/**
 * Live speech-to-text with the browser's SpeechRecognition (continuous, interim results).
 * Provide it per component (`providers: [SpeechRecognitionService]`): one instance per recording card.
 *
 * - `finalTranscript` only grows while listening (it survives automatic restarts);
 *   `interimTranscript` is the provisional text of the sentence being spoken.
 * - On-device recognition is used when the browser reports it (`SpeechRecognition.available`);
 *   online recognition only when the `onlineRecognition` setting allows it.
 * - Chrome ends sessions on its own; while the learner is still recording, the session restarts.
 * - Without support the status is `unsupported` and nothing else happens: recording still works.
 */
@Injectable()
export class SpeechRecognitionService {
  private readonly ctor = inject(SPEECH_RECOGNITION_CTOR);
  private readonly settings = inject(SettingsService);

  readonly status = signal<RecognitionStatus>(this.ctor ? 'idle' : 'unsupported');
  readonly interimTranscript = signal('');
  readonly finalTranscript = signal('');
  readonly error = signal('');
  readonly capability = signal<RecognitionCapability>(this.ctor ? 'checking' : 'unsupported');
  /** `on-device` or `online` once a session has started. */
  readonly mode = signal<'on-device' | 'online' | null>(null);
  /** The pack for on-device recognition is being downloaded. */
  readonly installing = signal(false);
  /** Recognition could only run online and the learner has not allowed that. */
  readonly needsOnlinePermission = signal(false);

  readonly supported = !!this.ctor;
  readonly listening = computed(() => this.status() === 'listening');

  private recognition: BrowserRecognition | null = null;
  private track: MediaStreamTrack | undefined;
  private wanted = false;
  private committed = '';
  private quickRestarts = 0;
  private restartTimer: ReturnType<typeof setTimeout> | undefined;
  private detected: Promise<void> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.abort());
  }

  /** Finds out whether on-device recognition is available for the configured language. */
  detect(): Promise<void> {
    this.detected ??= this.runDetect();
    return this.detected;
  }

  private async runDetect(): Promise<void> {
    const ctor = this.ctor;
    if (!ctor) return;
    if (typeof ctor.available !== 'function') {
      this.capability.set('online-only');
      return;
    }
    try {
      const state = await ctor.available({ langs: [this.lang()], processLocally: true });
      if (state === 'available') this.capability.set('on-device');
      else if (state === 'downloadable' || state === 'downloading') {
        this.capability.set('downloadable');
      } else this.capability.set('online-only');
    } catch {
      this.capability.set('online-only');
    }
  }

  /** Downloads the on-device language pack (Chrome). Resolves true when it is ready. */
  async install(): Promise<boolean> {
    const ctor = this.ctor;
    if (!ctor || typeof ctor.install !== 'function') return false;
    this.installing.set(true);
    try {
      const ok = await ctor.install({ langs: [this.lang()], processLocally: true });
      this.detected = undefined;
      await this.detect();
      return ok && this.capability() === 'on-device';
    } catch {
      return false;
    } finally {
      this.installing.set(false);
    }
  }

  /**
   * Starts listening. `track` is the microphone track of the recording (shared when the browser
   * supports it). Resolves false when nothing was started (unsupported, or online use not allowed).
   */
  async start(track?: MediaStreamTrack): Promise<boolean> {
    if (!this.ctor) return false;
    this.stopTimers();
    this.abortCurrent();
    await this.detect();
    this.track = track;
    this.committed = '';
    this.quickRestarts = 0;
    this.finalTranscript.set('');
    this.interimTranscript.set('');
    this.error.set('');
    const capability = this.capability();
    if (capability !== 'on-device' && !this.settings.settings().onlineRecognition) {
      this.needsOnlinePermission.set(true);
      this.status.set('idle');
      return false;
    }
    this.needsOnlinePermission.set(false);
    this.mode.set(capability === 'on-device' ? 'on-device' : 'online');
    this.wanted = true;
    return this.begin();
  }

  /** Stops listening; the browser still delivers the last results. */
  stop(): void {
    this.wanted = false;
    this.stopTimers();
    try {
      this.recognition?.stop();
    } catch {
      /* Already ended. */
    }
    if (this.status() === 'listening') this.status.set('stopped');
  }

  /** Stops at once and discards pending results (used when leaving the page). */
  abort(): void {
    this.wanted = false;
    this.stopTimers();
    this.abortCurrent();
    if (this.status() === 'listening') this.status.set('stopped');
  }

  /** Clears the live text (the saved answer is stored by the caller). */
  reset(): void {
    this.committed = '';
    this.finalTranscript.set('');
    this.interimTranscript.set('');
    this.error.set('');
    this.needsOnlinePermission.set(false);
    if (this.status() === 'stopped' || this.status() === 'error') this.status.set('idle');
  }

  private lang(): string {
    return this.settings.settings().recognitionLang;
  }

  private begin(): boolean {
    const Ctor = this.ctor;
    if (!Ctor) return false;
    const recognition = new Ctor();
    recognition.lang = this.lang();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    if (this.mode() === 'on-device') recognition.processLocally = true;
    recognition.onresult = (event) => this.onResult(recognition, event);
    recognition.onerror = (event) => this.onError(recognition, event);
    recognition.onend = () => this.onEnd(recognition);
    this.recognition = recognition;
    try {
      recognition.start(this.track);
    } catch {
      try {
        recognition.start();
      } catch {
        this.fail('Speech recognition could not start. Your recording is still saved.');
        return false;
      }
    }
    this.status.set('listening');
    return true;
  }

  private onResult(source: BrowserRecognition, event: RecognitionResultEvent): void {
    if (source !== this.recognition) return;
    this.quickRestarts = 0;
    const finals: string[] = [];
    let interim = '';
    for (const result of Array.from(event.results as ArrayLike<RecognitionResult | undefined>)) {
      const text = result?.[0]?.transcript ?? '';
      if (result?.isFinal) finals.push(text);
      else interim += text;
    }
    this.finalTranscript.set(joinText(this.committed, mergeFinalSegments(finals)));
    this.interimTranscript.set(interim.trim());
  }

  private onError(source: BrowserRecognition, event: RecognitionErrorEvent): void {
    if (source !== this.recognition || BENIGN_ERRORS.has(event.error)) return;
    this.fail(
      RECOGNITION_ERRORS[event.error] ?? 'Speech recognition stopped. Your recording is kept.',
    );
  }

  private onEnd(source: BrowserRecognition): void {
    if (source !== this.recognition) return;
    this.interimTranscript.set('');
    if (!this.wanted) {
      if (this.status() === 'listening') this.status.set('stopped');
      return;
    }
    // Chrome ended the session by itself while the learner keeps talking: keep the text, start again.
    this.committed = this.finalTranscript();
    this.quickRestarts += 1;
    if (this.quickRestarts > MAX_QUICK_RESTARTS) {
      this.fail('Speech recognition kept stopping. Your recording is kept; you can type the text.');
      return;
    }
    this.restartTimer = setTimeout(() => {
      if (this.wanted) this.begin();
    }, RESTART_DELAY_MS);
  }

  private fail(message: string): void {
    this.wanted = false;
    this.stopTimers();
    this.abortCurrent();
    this.error.set(message);
    this.status.set('error');
  }

  private abortCurrent(): void {
    const recognition = this.recognition;
    this.recognition = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      /* Already ended. */
    }
  }

  private stopTimers(): void {
    clearTimeout(this.restartTimer);
    this.restartTimer = undefined;
  }
}
