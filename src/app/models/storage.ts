import type { Skill } from './exam';

/** Colour theme chosen by the learner. `system` follows the operating system. */
export type ThemePreference = 'system' | 'light' | 'dark';

export type TextSize = 'normal' | 'large' | 'xlarge';
export type RecognitionLang = 'en-GB' | 'en-US';

export interface Settings {
  theme: ThemePreference;
  /** Text size multiplier step applied to the root font size. */
  textSize: TextSize;
  /** Turns off animations even when the operating system does not ask for it. */
  reduceMotion: boolean;
  /** Stronger borders and text colours. */
  highContrast: boolean;
  /** `voiceURI` of the preferred speech-synthesis voice, or null to pick automatically. */
  voiceUri: string | null;
  /** Speech-synthesis rate multiplier used for listening playback (0.8 to 1.2). */
  speechRate: number;
  /** Language used by speech recognition in the speaking section. */
  recognitionLang: RecognitionLang;
  /** Browsers may send audio to an online service for recognition. */
  onlineRecognition: boolean;
  /** Dictionary used by the writing checker (spelling). */
  spellingLang: RecognitionLang;
  /** Send writing to the public LanguageTool service for extra suggestions. Off by default. */
  languageTool: boolean;
  /** Let the browser underline mistakes in the writing box too (off: only the app's own highlights). */
  nativeSpellcheck: boolean;
  showTimer: boolean;
  /** Hide hints and explanations until the exam is finished. */
  examMode: boolean;
  /** Printed on the PDF report. */
  studentName: string;
}

export type SectionStatus = 'not-started' | 'in-progress' | 'completed';

/** Score for the automatically marked items (reading + listening). */
export interface ObjectiveResult {
  correct: number;
  total: number;
  completedAt: string;
}

/** Where the learner is inside the exam and the per-session flags. Cleared by Retry. */
export interface ExamSession {
  /** Section the learner was in last (used by "Continue"). */
  skill: Skill;
  /** Part id the learner was on, per section. */
  parts: Partial<Record<Skill, string>>;
  /** Item ids flagged for review. */
  flagged: string[];
  /** Part ids whose answers were checked in practice mode. */
  checked: string[];
  /** Number of times each recording (part or clip id) was started from the beginning. */
  listens: Record<string, number>;
  /** Seconds spent in each section (drives the timer). */
  elapsed: Partial<Record<Skill, number>>;
}

/** The answers and scores of one try of an exam. */
export interface AttemptData {
  answers: Record<string, string | number>;
  /** Score per section, keyed by skill (`reading`, `listening`). Legacy data may only have `objective`. */
  results: Record<string, ObjectiveResult>;
  startedAt: string;
  sectionStatus: Partial<Record<Skill, SectionStatus>>;
}

/** A finished (archived) try, created by Retry. */
export interface Attempt extends AttemptData {
  id: string;
  finishedAt: string;
}

/**
 * Everything saved for one exam: the current attempt (flat fields) plus the archived earlier attempts.
 * `answers` keeps the keys used since the first version of the app:
 * item ids (`r1-1`), `writing-1`, `writing-2`, `writing-2-type` and `speaking:<promptId>`.
 */
export interface ExamProgress extends AttemptData {
  updatedAt: string;
  session?: ExamSession;
  attempts: Attempt[];
}

/** The single document stored in localStorage under `learn-english:v1`. */
export interface PersistedState {
  schemaVersion: number;
  settings: Settings;
  progress: Record<string, ExamProgress>;
  /** Local calendar days (`YYYY-MM-DD`) on which the learner practised; feeds the streak. */
  activity: string[];
  /** Flags recording which one-off data migrations have already run. */
  migrations: { audioDb?: string; audioKeys?: string };
}
