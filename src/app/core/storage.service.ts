import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import type { Skill } from '../models/exam';
import type { VerbProgress } from '../models/grammar';
import type { CardState, PracticeState } from '../models/practice';
import { phrasalMistakeId } from './mistakes';
import type {
  Attempt,
  AttemptData,
  ExamProgress,
  ExamSession,
  ObjectiveResult,
  PersistedState,
  ResultBreakdown,
  SectionStatus,
  Settings,
} from '../models/storage';
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  emptyGrammar,
  emptyPractice,
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

  /** Practice record of the irregular verbs, keyed by verb id. */
  readonly grammar = computed(() => this._state().grammar);

  /** Counts one checked answer for a verb and marks today as a practice day. */
  recordVerbResult(verbId: string, correct: boolean): void {
    const now = new Date().toISOString();
    this.updateVerb(
      verbId,
      (v) => ({
        ...v,
        right: v.right + (correct ? 1 : 0),
        wrong: v.wrong + (correct ? 0 : 1),
        lastSeen: localDay(new Date(now)) ?? v.lastSeen,
      }),
      now,
    );
  }

  /** Sets the "known" flag (flashcards) and marks today as a practice day. */
  setVerbKnown(verbId: string, known: boolean): void {
    const now = new Date().toISOString();
    this.updateVerb(
      verbId,
      (v) => ({ ...v, known, lastSeen: localDay(new Date(now)) ?? v.lastSeen }),
      now,
    );
  }

  toggleVerbStar(verbId: string): void {
    this.updateVerb(verbId, (v) => ({ ...v, starred: !v.starred }));
  }

  /** Forgets all verb practice (used by the reset button). */
  resetGrammar(): void {
    this._state.update((s) => ({ ...s, grammar: emptyGrammar() }));
  }

  private updateVerb(
    verbId: string,
    change: (current: VerbProgress) => VerbProgress,
    practisedAt?: string,
  ): void {
    this._state.update((s) => {
      const current = s.grammar.verbs[verbId] ?? {
        right: 0,
        wrong: 0,
        lastSeen: '',
        known: false,
        starred: false,
      };
      return {
        ...s,
        grammar: { verbs: { ...s.grammar.verbs, [verbId]: change(current) } },
        activity: practisedAt ? addDay(s.activity, practisedAt) : s.activity,
      };
    });
  }

  /** Flashcards, phrasal verbs and graded reader progress. */
  readonly practice = computed(() => this._state().practice);

  /** Saves the new schedule of a flashcard after an answer and marks today as a practice day. */
  saveCard(cardId: string, state: CardState): void {
    this.updatePractice((p) => ({ ...p, cards: { ...p.cards, [cardId]: state } }), state.last);
  }

  setNewCardsPerDay(count: number): void {
    this.updatePractice((p) => ({
      ...p,
      newPerDay: Math.min(100, Math.max(1, Math.round(count))),
    }));
  }

  /** Forgets every flashcard schedule (the cards become new again). */
  resetCards(): void {
    this.updatePractice((p) => ({ ...p, cards: {} }));
  }

  /**
   * Puts items into "My mistakes" (keys from `examMistakeId` / `phrasalMistakeId`). An item that is
   * already there starts its schedule again, because the learner got it wrong once more.
   */
  addMistakes(ids: readonly string[], at = new Date().toISOString()): void {
    if (ids.length === 0) return;
    this.updatePractice((p) => {
      const mistakes = { ...p.mistakes };
      for (const id of ids) mistakes[id] = { added: at };
      return { ...p, mistakes };
    });
  }

  /** Saves the new schedule of a mistake after a review and marks today as a practice day. */
  saveMistakeReview(id: string, card: CardState): void {
    this.updatePractice((p) => {
      const current = p.mistakes[id];
      if (!current) return p;
      return { ...p, mistakes: { ...p.mistakes, [id]: { ...current, card } } };
    }, card.last);
  }

  /** Takes items out of "My mistakes" (for example when their exam no longer exists). */
  removeMistakes(ids: readonly string[]): void {
    if (ids.length === 0) return;
    this.updatePractice((p) => {
      const mistakes = { ...p.mistakes };
      for (const id of ids) delete mistakes[id];
      return { ...p, mistakes };
    });
  }

  resetMistakes(): void {
    this.updatePractice((p) => ({ ...p, mistakes: {} }));
  }

  /** Counts one answer for a phrasal verb and marks today as a practice day. A miss goes to "My mistakes". */
  recordPhrasalResult(verbId: string, correct: boolean): void {
    const now = new Date().toISOString();
    this.updatePractice((p) => {
      const current = p.phrasal[verbId] ?? { right: 0, wrong: 0, lastSeen: '', streak: 0 };
      return {
        ...p,
        mistakes: correct
          ? p.mistakes
          : { ...p.mistakes, [phrasalMistakeId(verbId)]: { added: now } },
        phrasal: {
          ...p.phrasal,
          [verbId]: {
            right: current.right + (correct ? 1 : 0),
            wrong: current.wrong + (correct ? 0 : 1),
            streak: correct ? current.streak + 1 : 0,
            lastSeen: localDay(new Date(now)) ?? current.lastSeen,
          },
        },
      };
    }, now);
  }

  resetPhrasal(): void {
    this.updatePractice((p) => ({ ...p, phrasal: {} }));
  }

  /** Saves the questions score of a finished story (the latest try replaces the earlier one). */
  finishStory(storyId: string, correct: number, total: number): void {
    const now = new Date().toISOString();
    this.updatePractice(
      (p) => ({ ...p, stories: { ...p.stories, [storyId]: { finishedAt: now, correct, total } } }),
      now,
    );
  }

  resetStories(): void {
    this.updatePractice((p) => ({ ...p, stories: {} }));
  }

  private updatePractice(
    change: (current: PracticeState) => PracticeState,
    practisedAt?: string,
  ): void {
    this._state.update((s) => ({
      ...s,
      practice: change(s.practice ?? emptyPractice()),
      activity: practisedAt ? addDay(s.activity, practisedAt) : s.activity,
    }));
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

  /**
   * Adds the breakdown to results saved before schema version 5. `attemptId` is null for the current
   * attempt. It does not touch `updatedAt` or the activity days: nothing new was practised.
   */
  setBreakdown(
    examId: string,
    attemptId: string | null,
    skill: string,
    breakdown: ResultBreakdown,
  ): void {
    this._state.update((s) => {
      const progress = s.progress[examId];
      if (!progress) return s;
      const withBreakdown = <T extends AttemptData>(data: T): T => {
        const result = data.results[skill];
        return result
          ? { ...data, results: { ...data.results, [skill]: { ...result, breakdown } } }
          : data;
      };
      const next =
        attemptId === null
          ? withBreakdown(progress)
          : {
              ...progress,
              attempts: progress.attempts.map((a) => (a.id === attemptId ? withBreakdown(a) : a)),
            };
      return { ...s, progress: { ...s.progress, [examId]: next } };
    });
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
