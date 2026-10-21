import {
  CURRENT_SCHEMA_VERSION,
  emptyState,
  migrateLegacyData,
  migrateState,
  upgradeLegacyAudioKey,
  upgradeLegacyExamId,
} from './state-migrations';

describe('state migrations', () => {
  it('renames React-era exam ids and audio keys', () => {
    expect(upgradeLegacyExamId('exam-03')).toBe('cambridge-pet-03');
    expect(upgradeLegacyExamId('other')).toBe('other');
    expect(upgradeLegacyAudioKey('exam-04:s4-1-2')).toBe('cambridge-pet-04:s4-1-2');
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
    expect(state.settings).toEqual({ theme: 'dark', speechRate: 0.9 });
  });
});
