import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import type { Skill } from '../models/exam';
import type {
  ExamProgress,
  ObjectiveResult,
  PersistedState,
  SectionStatus,
  Settings,
} from '../models/storage';
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  emptyState,
  migrateLegacyData,
  migrateState,
} from './state-migrations';

/** How long to wait after the last change before writing to localStorage. */
const WRITE_DELAY_MS = 300;

/**
 * Signal-based store persisted in a single localStorage key (`learn-english:v1`).
 * Reads are wrapped in try/catch, writes are debounced, and data from the React version is migrated on first load.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly storage = this.resolveStorage();
  private readonly _state = signal<PersistedState>(this.load());

  readonly state = this._state.asReadonly();
  readonly settings = computed(() => this._state().settings);
  readonly progress = computed(() => this._state().progress);

  constructor() {
    effect((onCleanup) => {
      const snapshot = this._state();
      const timer = setTimeout(() => this.write(snapshot), WRITE_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
    // Do not lose the last change when the tab is closed during the debounce window.
    this.view?.addEventListener('pagehide', () => this.write(this._state()));
  }

  updateSettings(patch: Partial<Settings>): void {
    this._state.update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }

  markMigration(name: keyof PersistedState['migrations'], value: string): void {
    this._state.update((s) => ({ ...s, migrations: { ...s.migrations, [name]: value } }));
  }

  progressFor(examId: string): ExamProgress | undefined {
    return this._state().progress[examId];
  }

  setAnswer(examId: string, key: string, value: string | number): void {
    this.updateProgress(examId, (p) => ({ ...p, answers: { ...p.answers, [key]: value } }));
  }

  setSectionStatus(examId: string, skill: Skill, status: SectionStatus): void {
    this.updateProgress(examId, (p) => ({
      ...p,
      sectionStatus: { ...p.sectionStatus, [skill]: status },
    }));
  }

  setResult(examId: string, key: string, result: ObjectiveResult): void {
    this.updateProgress(examId, (p) => ({ ...p, results: { ...p.results, [key]: result } }));
  }

  private updateProgress(examId: string, change: (current: ExamProgress) => ExamProgress): void {
    const now = new Date().toISOString();
    this._state.update((s) => {
      const current: ExamProgress = s.progress[examId] ?? {
        answers: {},
        results: {},
        startedAt: now,
        updatedAt: now,
        sectionStatus: {},
      };
      return {
        ...s,
        progress: { ...s.progress, [examId]: { ...change(current), updatedAt: now } },
      };
    });
  }

  private resolveStorage(): Storage | undefined {
    try {
      return this.view?.localStorage;
    } catch {
      return undefined; // Access can throw when site data is blocked.
    }
  }

  private load(): PersistedState {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw) return migrateState(JSON.parse(raw));
      const legacy = this.storage?.getItem(LEGACY_STORAGE_KEY);
      if (legacy) return migrateLegacyData(JSON.parse(legacy));
    } catch {
      /* Corrupt or unavailable storage: start with an empty state. */
    }
    return emptyState();
  }

  private write(snapshot: PersistedState): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* Keep the session usable when storage is full or blocked. */
    }
  }
}
