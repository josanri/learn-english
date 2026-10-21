import type { Skill } from './exam';

/** Colour theme chosen by the learner. `system` follows the operating system. */
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
  /** Speech-synthesis rate multiplier used for listening playback. */
  speechRate: number;
}

export type SectionStatus = 'not-started' | 'in-progress' | 'completed';

/** Score for the automatically marked items (reading + listening). */
export interface ObjectiveResult {
  correct: number;
  total: number;
  completedAt: string;
}

/**
 * Everything saved for one exam. `answers` keeps the keys used since the first version of the app:
 * item ids (`r1-1`), `writing-1`, `writing-2`, `writing-2-type` and `speaking:<promptId>`.
 */
export interface ExamProgress {
  answers: Record<string, string | number>;
  results: Record<string, ObjectiveResult>;
  startedAt: string;
  updatedAt: string;
  sectionStatus: Partial<Record<Skill, SectionStatus>>;
}

/** The single document stored in localStorage under `learn-english:v1`. */
export interface PersistedState {
  schemaVersion: number;
  settings: Settings;
  progress: Record<string, ExamProgress>;
  /** Flags recording which one-off data migrations have already run. */
  migrations: { audioDb?: string };
}
