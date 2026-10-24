import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  emptyState,
  migrateLegacyData,
  migrateState,
  attemptKeyFor,
  upgradeLegacyExamId,
} from './state-migrations';

describe('state migrations', () => {
  it('renames React-era exam ids', () => {
    expect(upgradeLegacyExamId('exam-03')).toBe('cambridge-pet-03');
    expect(upgradeLegacyExamId('other')).toBe('other');
  });

  it('adds the attempt id to two-part recording keys only', () => {
    const attempt = (examId: string) => `${examId}-2`;
    expect(attemptKeyFor('cambridge-pet-01:s1-1-1', attempt)).toBe(
      'cambridge-pet-01:cambridge-pet-01-2:s1-1-1',
    );
    expect(attemptKeyFor('cambridge-pet-01:cambridge-pet-01-1:s1-1-1', attempt)).toBe(
      'cambridge-pet-01:cambridge-pet-01-1:s1-1-1',
    );
    expect(attemptKeyFor('plain', attempt)).toBe('plain');
  });

  it('keeps answers, drafts, transcripts and scores from the legacy document', () => {
    const legacy = {
      answers: {
        'exam-01': {
          'r1-1': 2,
          'r6-1': 'for',
          'writing-1': 'Dear Sam',
          'writing-2-type': 'story',
          'speaking:s1-1-1': 'I live in Madrid',
        },
        'exam-02': { 'writing-1': 'draft only' },
      },
      results: { 'exam-01': { correct: 40, total: 57, completedAt: '2025-01-02T10:00:00.000Z' } },
    };
    const state = migrateLegacyData(legacy, '2026-01-01T00:00:00.000Z');
    const first = state.progress['cambridge-pet-01'];
    expect(first.answers).toEqual(legacy.answers['exam-01']);
    expect(first.results['objective']).toEqual(legacy.results['exam-01']);
    expect(first.sectionStatus).toEqual({
      reading: 'completed',
      listening: 'completed',
      writing: 'in-progress',
      speaking: 'in-progress',
    });
    const second = state.progress['cambridge-pet-02'];
    expect(second.answers).toEqual({ 'writing-1': 'draft only' });
    expect(second.sectionStatus.reading).toBe('not-started');
    expect(second.startedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('returns an empty state for garbage input', () => {
    expect(migrateLegacyData(null)).toEqual(emptyState());
    expect(migrateState('nope')).toEqual(emptyState());
    expect(migrateState({ schemaVersion: 99 }).progress).toEqual({});
  });

  it('fills defaults when reading the current document', () => {
    const state = migrateState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { theme: 'dark' },
      progress: {},
    });
    expect(state.settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
  });

  it('upgrades a version 1 document: adds attempts and derives activity days', () => {
    const state = migrateState({
      schemaVersion: 1,
      settings: {},
      progress: {
        'cambridge-pet-01': {
          answers: { 'r1-1': 1 },
          results: {},
          startedAt: '2026-03-02T10:00:00',
          updatedAt: '2026-03-04T10:00:00',
          sectionStatus: {},
        },
      },
      migrations: {},
    });
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.progress['cambridge-pet-01'].attempts).toEqual([]);
    expect(state.progress['cambridge-pet-01'].answers).toEqual({ 'r1-1': 1 });
    expect(state.activity).toEqual(['2026-03-02', '2026-03-04']);
  });

  it('adds an empty grammar record when it upgrades a version 2 document', () => {
    const state = migrateState({
      schemaVersion: 2,
      progress: {},
      activity: ['2026-03-02'],
      settings: {},
      migrations: {},
    });
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.grammar).toEqual({ verbs: {} });
    expect(state.activity).toEqual(['2026-03-02']);
  });

  it('keeps valid verb records and drops broken ones', () => {
    const state = migrateState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      grammar: {
        verbs: {
          go: { right: 3, wrong: 1.9, lastSeen: '2026-03-02', known: true, starred: true },
          bad: 'nope',
          odd: { right: -4, wrong: 'x' },
        },
      },
    });
    expect(state.grammar.verbs['go']).toEqual({
      right: 3,
      wrong: 1,
      lastSeen: '2026-03-02',
      known: true,
      starred: true,
    });
    expect(state.grammar.verbs['bad']).toBeUndefined();
    expect(state.grammar.verbs['odd']).toEqual({
      right: 0,
      wrong: 0,
      lastSeen: '',
      known: false,
      starred: false,
    });
  });

  it('adds an empty practice record when it upgrades a version 3 document', () => {
    const state = migrateState({
      schemaVersion: 3,
      progress: {},
      activity: ['2026-03-02'],
      settings: {},
      grammar: {
        verbs: { go: { right: 1, wrong: 0, lastSeen: '', known: false, starred: false } },
      },
      migrations: {},
    });
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.practice).toEqual({
      cards: {},
      newPerDay: 10,
      phrasal: {},
      stories: {},
      mistakes: {},
    });
    expect(state.grammar.verbs['go'].right).toBe(1);
  });

  it('keeps valid practice records and drops broken ones', () => {
    const due = '2026-10-24T08:00:00.000Z';
    const state = migrateState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      practice: {
        newPerDay: 500,
        cards: {
          borrow: {
            status: 'review',
            step: 0,
            ease: 2.36,
            interval: 3,
            due,
            reps: 4,
            lapses: 0,
            last: due,
            added: '2026-10-20',
          },
          broken: { status: 'flying', due },
          noDue: { status: 'review', due: 'tomorrow' },
          lowEase: { status: 'learning', ease: 0.4, due },
        },
        phrasal: { 'give-up': { right: 2, wrong: 1.5, lastSeen: '2026-10-22', streak: 2 }, bad: 3 },
        stories: { lighthouse: { finishedAt: due, correct: 3, total: 4 }, nope: { correct: 1 } },
      },
    });
    expect(state.practice.newPerDay).toBe(10);
    expect(state.practice.cards['borrow'].interval).toBe(3);
    expect(Object.keys(state.practice.cards).sort()).toEqual(['borrow', 'lowEase']);
    expect(state.practice.cards['lowEase'].ease).toBe(1.3);
    expect(state.practice.phrasal['give-up']).toEqual({
      right: 2,
      wrong: 1,
      lastSeen: '2026-10-22',
      streak: 2,
    });
    expect(state.practice.phrasal['bad']).toBeUndefined();
    expect(Object.keys(state.practice.stories)).toEqual(['lighthouse']);
  });

  it('adds an empty mistakes record when it upgrades a version 4 document', () => {
    const state = migrateState({
      schemaVersion: 4,
      progress: {},
      activity: [],
      settings: {},
      grammar: { verbs: {} },
      practice: { cards: {}, newPerDay: 20, phrasal: {}, stories: {} },
      migrations: {},
    });
    expect(state.schemaVersion).toBe(5);
    expect(state.practice.newPerDay).toBe(20);
    expect(state.practice.mistakes).toEqual({});
  });

  it('keeps valid mistakes and drops broken ones', () => {
    const due = '2026-10-24T08:00:00.000Z';
    const schedule = {
      status: 'learning',
      step: 1,
      ease: 2.5,
      interval: 0,
      due,
      reps: 1,
      lapses: 0,
      last: due,
      added: '',
    };
    const state = migrateState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      practice: {
        mistakes: {
          'exam:a:r1-1': { added: due },
          'phrasal:give-up': { added: due, card: schedule },
          'exam:a:r1-2': { added: due, card: { status: 'flying', due } },
          'exam:a:r1-3': { added: 'yesterday' },
          'exam:a:r1-4': 7,
        },
      },
    });
    expect(Object.keys(state.practice.mistakes).sort()).toEqual([
      'exam:a:r1-1',
      'exam:a:r1-2',
      'phrasal:give-up',
    ]);
    expect(state.practice.mistakes['phrasal:give-up'].card?.step).toBe(1);
    // A broken schedule is dropped; the mistake stays and starts again.
    expect(state.practice.mistakes['exam:a:r1-2']).toEqual({ added: due });
  });

  it('repairs progress entries that miss containers', () => {
    const state = migrateState({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      progress: { x: { answers: { a: 1 } } },
    });
    expect(state.progress['x'].attempts).toEqual([]);
    expect(state.progress['x'].results).toEqual({});
    expect(state.activity).toEqual([]);
  });
});
