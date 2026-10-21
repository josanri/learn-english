import { Injectable, inject } from '@angular/core';
import type { ThemePreference } from '../models/storage';
import { LocalStorageService } from './storage.service';

/** Read/write access to the learner's preferences. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly store = inject(LocalStorageService);

  readonly settings = this.store.settings;

  setTheme(theme: ThemePreference): void {
    this.store.updateSettings({ theme });
  }

  setSpeechRate(speechRate: number): void {
    this.store.updateSettings({ speechRate: Math.min(1.5, Math.max(0.5, speechRate)) });
  }
}
