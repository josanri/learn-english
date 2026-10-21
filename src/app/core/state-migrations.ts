import type { Skill } from '../models/exam';
import type {
  ExamProgress,
  ObjectiveResult,
  PersistedState,
  SectionStatus,
  Settings,
} from '../models/storage';

/** localStorage key of the current document. */
export const STORAGE_KEY = 'learn-english:v1';
/** localStorage key written by the React version ("Northstar B1"). Kept untouched after migration. */
export const LEGACY_STORAGE_KEY = 'northstar-practice-v3';
/** Version of the `PersistedState` document. Bump it and add a step to `STEPS` to change the shape. */
export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = { theme: 'system', speechRate: 0.9 };

export function emptyState(): PersistedState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    progress: {},
    migrations: {},
  };
}

/** Upgrades from version N to N + 1. Add entries here when the stored shape changes. */
const STEPS: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates and upgrades a parsed document of any known version. Unknown shapes fall back to an empty state. */
export function migrateState(raw: unknown): PersistedState {
  if (!isRecord(raw) || typeof raw['schemaVersion'] !== 'number') return emptyState();
  let current: Record<string, unknown> = raw;
  let version = raw['schemaVersion'];
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = STEPS[version];
    if (!step) return emptyState();
    current = { ...step(current), schemaVersion: version + 1 };
    version += 1;
  }
  const settings = isRecord(current['settings']) ? current['settings'] : {};
  const progress = isRecord(current['progress']) ? current['progress'] : {};
  const migrations = isRecord(current['migrations']) ? current['migrations'] : {};
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings>) },
    progress: progress as PersistedState['progress'],
    migrations: migrations as PersistedState['migrations'],
  };
}

/** `exam-03` (React app id) becomes `cambridge-pet-03`. Other ids are returned unchanged. */
export function upgradeLegacyExamId(id: string): string {
  return id.replace(/^exam-(\d+)$/, 'cambridge-pet-$1');
}

/** `exam-03:s3-1-1` (IndexedDB key of the React app) becomes `cambridge-pet-03:s3-1-1`. */
export function upgradeLegacyAudioKey(key: string): string {
  return key.replace(/^exam-(\d+):/, 'cambridge-pet-$1:');
}

/** Shape of the document the React app stored under `northstar-practice-v3`. */
interface LegacySavedData {
  answers?: Record<string, Record<string, string | number>>;
  results?: Record<string, ObjectiveResult>;
}

/** Converts the React-era document into the current one without losing answers or scores. */
export function migrateLegacyData(raw: unknown, now = new Date().toISOString()): PersistedState {
  const state = emptyState();
  if (!isRecord(raw)) return state;
  const legacy = raw as LegacySavedData;
  const answers = isRecord(legacy.answers) ? legacy.answers : {};
  const results = isRecord(legacy.results) ? legacy.results : {};
  const ids = new Set([...Object.keys(answers), ...Object.keys(results)]);
  for (const legacyId of ids) {
    const examAnswers = isRecord(answers[legacyId]) ? answers[legacyId] : {};
    const result = results[legacyId];
    const hasWriting = Object.keys(examAnswers).some((k) => k.startsWith('writing-'));
    const hasSpeaking = Object.keys(examAnswers).some((k) => k.startsWith('speaking:'));
    const hasObjective = Object.keys(examAnswers).some(
      (k) => !k.startsWith('writing-') && !k.startsWith('speaking:'),
    );
    const objective: SectionStatus = result
      ? 'completed'
      : hasObjective
        ? 'in-progress'
        : 'not-started';
    const sectionStatus: Partial<Record<Skill, SectionStatus>> = {
      reading: objective,
      listening: objective,
      writing: hasWriting ? 'in-progress' : 'not-started',
      speaking: hasSpeaking ? 'in-progress' : 'not-started',
    };
    const progress: ExamProgress = {
      answers: examAnswers,
      results: result ? { objective: result } : {},
      startedAt: result?.completedAt ?? now,
      updatedAt: result?.completedAt ?? now,
      sectionStatus,
    };
    state.progress[upgradeLegacyExamId(legacyId)] = progress;
  }
  return state;
}
