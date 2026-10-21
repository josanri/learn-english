import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'saving' | 'error';

/** Formats tried in order: webm/opus (Chrome, Firefox, Edge), then mp4 (Safari). */
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function pickRecordingType(
  isTypeSupported: ((type: string) => boolean) | undefined,
): string | undefined {
  if (typeof isTypeSupported !== 'function') return undefined;
  return MIME_TYPES.find((type) => isTypeSupported(type));
}

export interface FinishedRecording {
  blob: Blob;
  durationSeconds: number;
}

/**
 * One microphone capture: getUserMedia, a MediaRecorder and a level meter (AnalyserNode).
 * Provide it per component (`providers: [MicRecorderService]`). The microphone is always released
 * when the recording stops and when the component is destroyed.
 */
@Injectable()
export class MicRecorderService {
  private readonly view = inject(DOCUMENT).defaultView;

  readonly state = signal<RecorderState>('idle');
  /** Input level from 0 to 1 while recording. */
  readonly level = signal(0);
  readonly error = signal('');
  readonly supported = !!(
    this.view?.navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
  );

  /**
   * Called with the audio when the service is destroyed while still recording (the learner left the
   * page), so that what was said is not lost. Without it the recording is discarded.
   */
  salvage: ((finished: FinishedRecording) => void) | undefined;

  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private audioContext: AudioContext | null = null;
  private meterTimer: ReturnType<typeof setInterval> | undefined;
  private finish: ((result: FinishedRecording | null) => void) | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      const recorder = this.recorder;
      if (this.salvage && recorder && recorder.state === 'recording') {
        this.finish = (finished) => {
          if (finished) this.salvage?.(finished);
        };
        try {
          recorder.stop(); // `onstop` builds the clip, hands it over and frees the microphone.
          return;
        } catch {
          /* Fall through to a plain release. */
        }
      }
      this.release();
    });
  }

  /** The microphone track while recording, to share it with speech recognition. */
  get track(): MediaStreamTrack | undefined {
    return this.stream?.getAudioTracks()[0];
  }

  /** Asks for the microphone and starts recording. Returns the audio track, or null on failure. */
  async start(): Promise<MediaStreamTrack | null> {
    if (!this.supported || !this.view) {
      this.fail(
        'Audio recording is not supported here. Use a current browser over HTTPS, or type your answer.',
      );
      return null;
    }
    if (this.state() === 'recording' || this.state() === 'requesting') return null;
    this.state.set('requesting');
    this.error.set('');
    try {
      const stream = await this.view.navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      this.stream = stream;
      const mimeType = pickRecordingType(MediaRecorder.isTypeSupported?.bind(MediaRecorder));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      this.recorder = recorder;
      this.chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data);
      };
      recorder.onerror = () => {
        this.fail('The recording stopped unexpectedly.');
        this.release();
      };
      recorder.onstop = () => this.onStopped(recorder.mimeType || mimeType || 'audio/webm');
      this.startMeter(stream);
      recorder.start(1000);
      this.startedAt = Date.now();
      this.state.set('recording');
      return stream.getAudioTracks()[0] ?? null;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      this.release();
      this.fail(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone permission was denied. Allow the microphone for this site and try again.'
          : name === 'NotFoundError'
            ? 'No microphone was found. You can type your answer instead.'
            : 'The microphone could not be started. Check that it is connected and not in use.',
      );
      return null;
    }
  }

  /** Stops recording and resolves with the audio (null when nothing was recorded). */
  stop(): Promise<FinishedRecording | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') {
      this.release();
      return Promise.resolve(null);
    }
    this.state.set('saving');
    return new Promise((resolve) => {
      this.finish = resolve;
      try {
        recorder.stop();
      } catch {
        this.onStopped(recorder.mimeType || 'audio/webm');
      }
    });
  }

  /** Marks the capture as idle again after the caller has stored the result. */
  done(): void {
    if (this.state() === 'saving' || this.state() === 'error') this.state.set('idle');
  }

  /** Stops everything and frees the microphone. Safe to call at any time. */
  release(): void {
    clearInterval(this.meterTimer);
    this.meterTimer = undefined;
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        /* Already stopped. */
      }
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.level.set(0);
    const pending = this.finish;
    this.finish = undefined;
    pending?.(null);
    if (this.state() === 'recording' || this.state() === 'requesting') this.state.set('idle');
  }

  private onStopped(type: string): void {
    const seconds = Math.max(0, (Date.now() - this.startedAt) / 1000);
    const blob = new Blob(this.chunks, { type });
    this.chunks = [];
    const resolve = this.finish;
    this.finish = undefined;
    this.release();
    this.state.set('saving');
    resolve?.(blob.size > 0 ? { blob, durationSeconds: Math.round(seconds * 10) / 10 } : null);
  }

  private startMeter(stream: MediaStream): void {
    const Ctx =
      this.view?.AudioContext ??
      (this.view as (Window & { webkitAudioContext?: typeof AudioContext }) | null)
        ?.webkitAudioContext;
    if (!Ctx) return;
    try {
      const context = new Ctx();
      this.audioContext = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      this.meterTimer = setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        this.level.set(Math.min(1, (peak / 128) * 1.8));
      }, 80);
    } catch {
      /* The meter is optional. */
    }
  }

  private fail(message: string): void {
    this.error.set(message);
    this.state.set('error');
  }
}
