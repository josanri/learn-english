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
export const CURRENT_SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  textSize: 'normal',
  reduceMotion: false,
  highContrast: false,
  voiceUri: null,
  speechRate: 1,
  recognitionLang: 'en-GB',
  onlineRecognition: true,
  showTimer: true,
  examMode: false,
  studentName: '',
};

export const SPEECH_RATE_MIN = 0.8;
export const SPEECH_RATE_MAX = 1.2;

/** Keeps only valid values of known settings; anything else falls back to the default. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = isRecord(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const rate =
    typeof r['speechRate'] === 'number' && Number.isFinite(r['speechRate'])
      ? r['speechRate']
      : d.speechRate;
  return {
    theme: oneOf(r['theme'], ['system', 'light', 'dark'], d.theme),
    textSize: oneOf(r['textSize'], ['normal', 'large', 'xlarge'], d.textSize),
    reduceMotion: bool(r['reduceMotion'], d.reduceMotion),
    highContrast: bool(r['highContrast'], d.highContrast),
    voiceUri: typeof r['voiceUri'] === 'string' ? r['voiceUri'] : null,
    speechRate: Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, rate)),
    recognitionLang: oneOf(r['recognitionLang'], ['en-GB', 'en-US'], d.recognitionLang),
    onlineRecognition: bool(r['onlineRecognition'], d.onlineRecognition),
    showTimer: bool(r['showTimer'], d.showTimer),
    examMode: bool(r['examMode'], d.examMode),
    studentName: typeof r['studentName'] === 'string' ? r['studentName'].slice(0, 80) : '',
  };
}

export function emptyState(): PersistedState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    progress: {},
    activity: [],
    migrations: {},
  };
}

/** Upgrades from version N to N + 1. Add entries here when the stored shape changes. */
const STEPS: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 -> v2: attempts history and activity days (derived from the timestamps already saved).
  1: (state) => {
    const progress = isRecord(state['progress']) ? state['progress'] : {};
    const days = new Set<string>();
    const next: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(progress)) {
      if (!isRecord(value)) continue;
      next[id] = { ...value, attempts: [] };
      for (const stamp of [value['startedAt'], value['updatedAt']]) {
        const day = typeof stamp === 'string' ? localDay(new Date(stamp)) : null;
        if (day) days.add(day);
      }
    }
    return { ...state, progress: next, activity: [...days].sort() };
  },
};

/** Local calendar day as `YYYY-MM-DD`, or null for an invalid date. */
export function localDay(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
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
  const activity = Array.isArray(current['activity'])
    ? current['activity'].filter((d): d is string => typeof d === 'string').slice(-400)
    : [];
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: sanitizeSettings(settings),
    progress: sanitizeProgress(progress),
    activity,
    migrations: migrations as PersistedState['migrations'],
  };
}

/** Makes sure every saved exam has the containers the app reads (older or hand-edited files may miss them). */
function sanitizeProgress(raw: Record<string, unknown>): PersistedState['progress'] {
  const result: PersistedState['progress'] = {};
  const now = new Date(0).toISOString();
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const obj = (key: string) => (isRecord(value[key]) ? value[key] : {});
    result[id] = {
      ...(value as unknown as ExamProgress),
      answers: obj('answers') as ExamProgress['answers'],
      results: obj('results') as ExamProgress['results'],
      sectionStatus: obj('sectionStatus') as ExamProgress['sectionStatus'],
      startedAt: typeof value['startedAt'] === 'string' ? value['startedAt'] : now,
      updatedAt: typeof value['updatedAt'] === 'string' ? value['updatedAt'] : now,
      attempts: Array.isArray(value['attempts'])
        ? (value['attempts'] as ExamProgress['attempts'])
        : [],
    };
  }
  return result;
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
      attempts: [],
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
