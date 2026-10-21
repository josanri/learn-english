import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  emptyState,
  migrateLegacyData,
  migrateState,
  attemptKeyFor,
  upgradeLegacyAudioKey,
  upgradeLegacyExamId,
} from './state-migrations';

describe('state migrations', () => {
  it('renames React-era exam ids and audio keys', () => {
    expect(upgradeLegacyExamId('exam-03')).toBe('cambridge-pet-03');
    expect(upgradeLegacyExamId('other')).toBe('other');
    expect(upgradeLegacyAudioKey('exam-04:s4-1-2')).toBe('cambridge-pet-04:s4-1-2');
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
