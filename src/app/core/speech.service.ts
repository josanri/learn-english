import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Recording } from '../models/exam';
import { SettingsService } from './settings.service';
import { ScriptPlayback, type PlaybackEnv, type UtteranceLike } from './speech-playback';

/** Text-to-speech for listening recordings (Web Speech API). Playback logic lives in `ScriptPlayback`. */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly synth = inject(DOCUMENT).defaultView?.speechSynthesis;
  private readonly settings = inject(SettingsService);

  /** False when the browser has no speech synthesis at all: the transcript must be shown instead. */
  readonly supported = this.synth !== undefined && typeof SpeechSynthesisUtterance !== 'undefined';
  private readonly voices = signal<SpeechSynthesisVoice[]>(this.synth?.getVoices() ?? []);

  /** English voices installed on this device, for the voice picker in Settings. */
  readonly englishVoices = computed(() =>
    this.voices()
      .filter((v) => v.lang.toLowerCase().startsWith('en'))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  constructor() {
    // getVoices() is empty until the browser fires 'voiceschanged' (Chrome); Safari/Firefox fill it at once.
    const refresh = () => this.voices.set(this.synth?.getVoices() ?? []);
    this.synth?.addEventListener('voiceschanged', refresh);
    if (this.synth && this.voices().length === 0) setTimeout(refresh, 500);
  }

  /** Speaks a short sample with the current voice and speed settings. */
  preview(): void {
    const synth = this.synth;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(
      'This is how the listening recordings will sound.',
    );
    utterance.lang = 'en-GB';
    utterance.rate = this.settings.settings().speechRate;
    const voiceUri = this.settings.settings().voiceUri;
    const voice = this.voices().find((v) => v.voiceURI === voiceUri);
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  }

  /** A controller that plays the recording turn by turn. Call `stop()` when the view goes away. */
  createPlayback(recording: Recording): ScriptPlayback {
    const synth = this.synth;
    const env: PlaybackEnv = {
      synth: synth ?? { speak: () => undefined, cancel: () => undefined },
      createUtterance: (text) => new SpeechSynthesisUtterance(text) as unknown as UtteranceLike,
      voices: () => {
        const fresh = synth?.getVoices() ?? [];
        return fresh.length > 0 ? fresh : this.voices();
      },
      rate: () => this.settings.settings().speechRate,
      voiceUri: () => this.settings.settings().voiceUri,
      busy: () => !!(synth?.speaking || synth?.pending),
    };
    return new ScriptPlayback(recording, env);
  }
}
