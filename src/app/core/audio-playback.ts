import { signal } from '@angular/core';
import type { Recording } from '../models/exam';
import type { PlaybackState, RecordingPlayback } from './speech-playback';

/** The part of `HTMLAudioElement` that `FilePlayback` uses, so tests can pass a fake. */
export interface AudioLike {
  src: string;
  preload: string;
  currentTime: number;
  playbackRate: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: 'timeupdate' | 'ended' | 'error', listener: () => void): void;
}

/** Plays a pre-generated audio file of one recording. The turn is found from the start time of each turn. */
export class FilePlayback implements RecordingPlayback {
  readonly state = signal<PlaybackState>('idle');
  readonly turn = signal(0);
  readonly turnCount: number;

  private readonly audio: AudioLike;

  constructor(
    private readonly recording: Recording,
    url: string,
    private readonly starts: readonly number[],
    private readonly rate: () => number,
    /** Called when the file cannot be played, so the caller can fall back to speech synthesis. */
    private readonly onFail: () => void,
    createAudio: () => AudioLike = () => new Audio(),
  ) {
    this.turnCount = recording.turns.length;
    this.audio = createAudio();
    this.audio.preload = 'none';
    this.audio.src = url;
    this.audio.addEventListener('timeupdate', () => this.syncTurn());
    this.audio.addEventListener('ended', () => {
      this.state.set('ended');
      this.turn.set(this.turnCount - 1);
    });
    this.audio.addEventListener('error', () => this.fail());
  }

  get speakerId(): string | undefined {
    return this.recording.turns[this.turn()]?.speaker;
  }

  restart(): void {
    this.playFrom(0);
  }

  pause(): void {
    if (this.state() !== 'playing') return;
    this.audio.pause();
    this.state.set('paused');
  }

  resume(): void {
    if (this.state() !== 'paused') return;
    this.playFrom(this.audio.currentTime);
  }

  repeatTurn(): void {
    this.playFrom(this.starts[this.turn()] ?? 0);
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.turn.set(0);
    this.state.set('idle');
  }

  private playFrom(seconds: number): void {
    this.audio.currentTime = seconds;
    this.audio.playbackRate = this.rate();
    this.state.set('playing');
    this.syncTurn();
    // The call is inside the click handler, so the browser allows it.
    this.audio.play().catch(() => this.fail());
  }

  private syncTurn(): void {
    const time = this.audio.currentTime;
    let turn = 0;
    this.starts.forEach((start, i) => {
      if (start <= time + 0.05) turn = i;
    });
    if (turn !== this.turn()) this.turn.set(turn);
  }

  private fail(): void {
    this.state.set('failed');
    this.onFail();
  }
}
