import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Recording, Speaker } from '../models/exam';
import { SettingsService } from './settings.service';

const FEMALE_HINT =
  /female|woman|zira|hazel|susan|libby|sonia|samantha|serena|kate|fiona|karen|moira/i;
const MALE_HINT = /\bmale\b|\bman\b|david|george|ryan|daniel|alex|mark|oliver|thomas|james|rishi/i;

/** Text-to-speech playback of listening recordings, with a different voice per speaker where possible. */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly synth = inject(DOCUMENT).defaultView?.speechSynthesis;
  private readonly settings = inject(SettingsService);

  readonly supported = this.synth !== undefined;
  readonly speaking = signal(false);
  private readonly voices = signal<SpeechSynthesisVoice[]>(this.synth?.getVoices() ?? []);

  /** English voices installed on this device, for the voice picker in Settings. */
  readonly englishVoices = computed(() =>
    this.voices()
      .filter((v) => v.lang.toLowerCase().startsWith('en'))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  constructor() {
    this.synth?.addEventListener('voiceschanged', () =>
      this.voices.set(this.synth?.getVoices() ?? []),
    );
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

  /** Plays every turn of a recording in order. Resolves when playback ends or is cancelled. */
  play(recording: Recording): Promise<void> {
    const synth = this.synth;
    if (!synth) return Promise.resolve();
    synth.cancel();
    const speakers = new Map(recording.speakers.map((s) => [s.id, s]));
    this.speaking.set(true);
    return new Promise((resolve) => {
      recording.turns.forEach((turn, index) => {
        const speaker = speakers.get(turn.speaker);
        const utterance = new SpeechSynthesisUtterance(turn.text);
        if (speaker) this.configure(utterance, speaker);
        const last = index === recording.turns.length - 1;
        utterance.onend = () => {
          if (last) {
            this.speaking.set(false);
            resolve();
          }
        };
        utterance.onerror = () => {
          this.speaking.set(false);
          resolve();
        };
        synth.speak(utterance);
      });
    });
  }

  cancel(): void {
    this.synth?.cancel();
    this.speaking.set(false);
  }

  private configure(utterance: SpeechSynthesisUtterance, speaker: Speaker): void {
    const { voice } = speaker;
    utterance.lang = voice.lang;
    utterance.rate = (voice.rate ?? 1) * this.settings.settings().speechRate;
    utterance.pitch = voice.pitch ?? 1;
    const preferred = this.voices().find((v) => v.voiceURI === this.settings.settings().voiceUri);
    const match = preferred ?? this.pickVoice(voice.lang, voice.gender);
    if (match) utterance.voice = match;
  }

  private pickVoice(lang: string, gender?: 'female' | 'male'): SpeechSynthesisVoice | undefined {
    const all = this.voices();
    const sameLang = all.filter(
      (v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase(),
    );
    const english = sameLang.length
      ? sameLang
      : all.filter((v) => v.lang.toLowerCase().startsWith('en'));
    if (gender) {
      const hint = gender === 'female' ? FEMALE_HINT : MALE_HINT;
      const byGender = english.find((v) => hint.test(v.name));
      if (byGender) return byGender;
    }
    return english[0];
  }
}
