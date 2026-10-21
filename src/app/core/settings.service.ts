import { Injectable, inject } from '@angular/core';
import type { PersistedState, Settings, ThemePreference } from '../models/storage';
import { AudioDbService } from './audio-db.service';
import {
  SPEECH_RATE_MAX,
  SPEECH_RATE_MIN,
  emptyState,
  isRecord,
  migrateState,
  sanitizeSettings,
} from './state-migrations';
import { LocalStorageService } from './storage.service';

export type ImportResult = { ok: true; exams: number } | { ok: false; message: string };

/** Read/write access to the learner's preferences, plus export, import and reset of all saved data. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly store = inject(LocalStorageService);
  private readonly audio = inject(AudioDbService);

  readonly settings = this.store.settings;

  /** Changes one or more settings. Values are validated, so invalid input never reaches storage. */
  update(patch: Partial<Settings>): void {
    this.store.updateSettings(sanitizeSettings({ ...this.store.settings(), ...patch }));
  }

  setTheme(theme: ThemePreference): void {
    this.update({ theme });
  }

  setSpeechRate(speechRate: number): void {
    this.update({ speechRate: Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, speechRate)) });
  }

  /** The whole saved document (settings and progress) as pretty JSON. Recordings are not included. */
  exportJson(): string {
    return JSON.stringify(this.store.state(), null, 2);
  }

  /** Replaces the saved document with the contents of an exported file. */
  importJson(text: string): ImportResult {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return { ok: false, message: 'This file is not valid JSON.' };
    }
    if (!isRecord(raw) || typeof raw['schemaVersion'] !== 'number' || !isRecord(raw['progress'])) {
      return { ok: false, message: 'This file is not a Learn English progress export.' };
    }
    const state: PersistedState = migrateState(raw);
    this.store.replaceState(state);
    return { ok: true, exams: Object.keys(state.progress).length };
  }

  /** Deletes settings, progress and saved recordings. */
  async resetAll(): Promise<void> {
    this.store.replaceState(emptyState());
    try {
      await this.audio.clear();
    } catch {
      /* Recordings may be unavailable; the rest has been cleared. */
    }
  }
}
