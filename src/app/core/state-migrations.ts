import type { Skill } from '../models/exam';
import type { GrammarProgress } from '../models/grammar';
import type {
  CardState,
  CardStatus,
  MistakeState,
  PhrasalProgress,
  PracticeState,
  StoryProgress,
} from '../models/practice';
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
export const CURRENT_SCHEMA_VERSION = 5;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  textSize: 'normal',
  reduceMotion: false,
  highContrast: false,
  voiceUri: null,
  speechRate: 1,
  recognitionLang: 'en-GB',
  onlineRecognition: true,
  spellingLang: 'en-GB',
  languageTool: false,
  nativeSpellcheck: false,
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
    spellingLang: oneOf(r['spellingLang'], ['en-GB', 'en-US'], d.spellingLang),
    languageTool: bool(r['languageTool'], d.languageTool),
    nativeSpellcheck: bool(r['nativeSpellcheck'], d.nativeSpellcheck),
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
    grammar: emptyGrammar(),
    practice: emptyPractice(),
    migrations: {},
  };
}

/** New flashcards per day when the learner has not chosen a number. */
export const DEFAULT_NEW_CARDS_PER_DAY = 10;

export function emptyPractice(): PracticeState {
  return {
    cards: {},
    newPerDay: DEFAULT_NEW_CARDS_PER_DAY,
    phrasal: {},
    stories: {},
    mistakes: {},
  };
}

const CARD_STATUSES: readonly CardStatus[] = ['learning', 'review', 'relearning'];

/** Keeps only well-formed practice records; anything broken is dropped (that card simply starts again). */
export function sanitizePractice(raw: unknown): PracticeState {
  const r = isRecord(raw) ? raw : {};
  const num = (v: unknown, fallback = 0) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
  const int = (v: unknown) => Math.floor(num(v));
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const validTime = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

  const card = (value: unknown): CardState | undefined => {
    if (!isRecord(value) || !CARD_STATUSES.includes(value['status'] as CardStatus)) return;
    if (!validTime(value['due'])) return;
    return {
      status: value['status'] as CardStatus,
      step: int(value['step']),
      ease: Math.max(1.3, num(value['ease'], 2.5)),
      interval: num(value['interval']),
      due: value['due'] as string,
      reps: int(value['reps']),
      lapses: int(value['lapses']),
      last: validTime(value['last']) ? (value['last'] as string) : (value['due'] as string),
      added: str(value['added']),
    };
  };

  const cards: Record<string, CardState> = {};
  for (const [id, value] of Object.entries(isRecord(r['cards']) ? r['cards'] : {})) {
    const state = card(value);
    if (state) cards[id] = state;
  }

  const phrasal: Record<string, PhrasalProgress> = {};
  for (const [id, value] of Object.entries(isRecord(r['phrasal']) ? r['phrasal'] : {})) {
    if (!isRecord(value)) continue;
    phrasal[id] = {
      right: int(value['right']),
      wrong: int(value['wrong']),
      lastSeen: str(value['lastSeen']),
      streak: int(value['streak']),
    };
  }

  const stories: Record<string, StoryProgress> = {};
  for (const [id, value] of Object.entries(isRecord(r['stories']) ? r['stories'] : {})) {
    if (!isRecord(value) || !validTime(value['finishedAt'])) continue;
    stories[id] = {
      finishedAt: value['finishedAt'] as string,
      correct: int(value['correct']),
      total: int(value['total']),
    };
  }

  const mistakes: Record<string, MistakeState> = {};
  for (const [id, value] of Object.entries(isRecord(r['mistakes']) ? r['mistakes'] : {})) {
    if (!isRecord(value) || !validTime(value['added'])) continue;
    const state = card(value['card']);
    mistakes[id] = state
      ? { added: value['added'] as string, card: state }
      : { added: value['added'] as string };
  }

  const perDay = int(r['newPerDay']);
  return {
    cards,
    newPerDay: perDay >= 1 && perDay <= 100 ? perDay : DEFAULT_NEW_CARDS_PER_DAY,
    phrasal,
    stories,
    mistakes,
  };
}

export function emptyGrammar(): GrammarProgress {
  return { verbs: {} };
}

/** Keeps only well-formed verb records; counts become non-negative integers. */
function sanitizeGrammar(raw: unknown): GrammarProgress {
  const verbs: GrammarProgress['verbs'] = {};
  const source = isRecord(raw) && isRecord(raw['verbs']) ? raw['verbs'] : {};
  const count = (v: unknown) => (typeof v === 'number' && v > 0 ? Math.floor(v) : 0);
  for (const [id, value] of Object.entries(source)) {
    if (!isRecord(value)) continue;
    verbs[id] = {
      right: count(value['right']),
      wrong: count(value['wrong']),
      lastSeen: typeof value['lastSeen'] === 'string' ? value['lastSeen'] : '',
      known: value['known'] === true,
      starred: value['starred'] === true,
    };
  }
  return { verbs };
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
  // v2 -> v3: practice record of the irregular verbs.
  2: (state) => ({ ...state, grammar: emptyGrammar() }),
  // v3 -> v4: flashcards, phrasal verbs and graded reader.
  3: (state) => ({ ...state, practice: emptyPractice() }),
  // v4 -> v5: "My mistakes" queue (results get their breakdown later, from InsightsService.backfill).
  4: (state) => ({
    ...state,
    practice: { ...(isRecord(state['practice']) ? state['practice'] : {}), mistakes: {} },
  }),
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
    grammar: sanitizeGrammar(current['grammar']),
    practice: sanitizePractice(current['practice']),
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

/**
 * `<examId>:<promptId>` (two parts) becomes `<examId>:<attemptId>:<promptId>`; keys that already
 * have three parts are returned unchanged. `attemptOf` gives the attempt id to use for an exam.
 */
export function attemptKeyFor(key: string, attemptOf: (examId: string) => string): string {
  const parts = key.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return key;
  return `${parts[0]}:${attemptOf(parts[0])}:${parts[1]}`;
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
