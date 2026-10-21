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
