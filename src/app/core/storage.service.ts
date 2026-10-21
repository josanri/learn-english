import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import type { Skill } from '../models/exam';
import type {
  Attempt,
  ExamProgress,
  ExamSession,
  ObjectiveResult,
  PersistedState,
  SectionStatus,
  Settings,
} from '../models/storage';
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  emptyState,
  localDay,
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
  /** Local days (`YYYY-MM-DD`) with practice, oldest first. */
  readonly activity = computed(() => this._state().activity);

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

  /** Replaces everything (used by import and reset). */
  replaceState(state: PersistedState): void {
    this._state.set(state);
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

  removeAnswer(examId: string, key: string): void {
    this.updateProgress(examId, (p) => {
      const answers = { ...p.answers };
      delete answers[key];
      return { ...p, answers };
    });
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

  /** Merges a change into the session (position, flags, listens, timers) of an exam. */
  updateSession(examId: string, change: (session: ExamSession) => ExamSession, skill: Skill): void {
    this.updateProgress(examId, (p) => ({
      ...p,
      session: change(p.session ?? emptySession(skill)),
    }));
  }

  /**
   * Moves the current attempt into the history and starts a clean one. Nothing is deleted: the old
   * answers and scores stay in `attempts`.
   */
  startNewAttempt(examId: string): void {
    const now = new Date().toISOString();
    this._state.update((s) => {
      const current = s.progress[examId];
      if (!current) return s;
      const hasContent =
        Object.keys(current.answers).length > 0 || Object.keys(current.results).length > 0;
      const attempts: Attempt[] = hasContent
        ? [
            ...current.attempts,
            {
              id: `${examId}-${current.attempts.length + 1}`,
              startedAt: current.startedAt,
              finishedAt: current.updatedAt,
              answers: current.answers,
              results: current.results,
              sectionStatus: current.sectionStatus,
            },
          ]
        : current.attempts;
      return {
        ...s,
        progress: {
          ...s.progress,
          [examId]: {
            attempts,
            answers: {},
            results: {},
            startedAt: now,
            updatedAt: now,
            sectionStatus: {},
          },
        },
        activity: addDay(s.activity, now),
      };
    });
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
        attempts: [],
      };
      return {
        ...s,
        progress: { ...s.progress, [examId]: { ...change(current), updatedAt: now } },
        activity: addDay(s.activity, now),
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

export function emptySession(skill: Skill): ExamSession {
  return { skill, parts: {}, flagged: [], checked: [], listens: {}, elapsed: {} };
}

/** Appends the local day of `iso` to the activity list when it is new (keeps the last 400 days). */
function addDay(days: string[], iso: string): string[] {
  const day = localDay(new Date(iso));
  if (!day || days.includes(day)) return days;
  return [...days, day].sort().slice(-400);
}
