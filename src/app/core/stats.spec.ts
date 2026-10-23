import type { ExamSummary } from '../models/exam';
import type { ExamProgress } from '../models/storage';
import { computeStats, currentStreak } from './stats';

const exam = (id: string): ExamSummary => ({
  id,
  level: 'B1',
  board: 'cambridge-pet',
  title: id,
  subtitle: '',
  theme: '',
  category: 'misc',
  estimatedMinutes: 100,
  skills: ['reading', 'writing', 'listening', 'speaking'],
  path: '',
});

const progress = (patch: Partial<ExamProgress>): ExamProgress => ({
  answers: {},
  results: {},
  startedAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  sectionStatus: {},
  attempts: [],
  ...patch,
});

describe('currentStreak', () => {
  const today = new Date(2026, 9, 21);

  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-10-19', '2026-10-20', '2026-10-21'], today)).toBe(3);
  });

  it('keeps yesterday’s streak alive until you practise today', () => {
    expect(currentStreak(['2026-10-19', '2026-10-20'], today)).toBe(2);
  });

  it('breaks after a missed day', () => {
    expect(currentStreak(['2026-10-17', '2026-10-18'], today)).toBe(0);
    expect(currentStreak(['2026-10-15', '2026-10-19', '2026-10-21'], today)).toBe(1);
  });
});

describe('computeStats', () => {
  const done = { completedAt: '' };
  const state = {
    activity: ['2026-10-20', '2026-10-21'],
    progress: {
      a: progress({
        sectionStatus: {
          reading: 'completed',
          writing: 'completed',
          listening: 'completed',
          speaking: 'completed',
        },
        results: {
          reading: { correct: 24, total: 30, ...done },
          listening: { correct: 10, total: 25, ...done },
        },
      }),
      b: progress({
        answers: { 'r1-1': 0 },
        sectionStatus: { reading: 'in-progress' },
        updatedAt: '2026-10-21T09:00:00.000Z',
      }),
      c: progress({
        // Retried: the earlier attempt was completed, the new one is empty.
        attempts: [
          {
            id: 'c-1',
            startedAt: '',
            finishedAt: '',
            answers: {},
            sectionStatus: {
              reading: 'completed',
              writing: 'completed',
              listening: 'completed',
              speaking: 'completed',
            },
            results: { reading: { correct: 15, total: 30, ...done } },
          },
        ],
      }),
    },
  };

  it('derives completed, started, averages, streak and the exam to continue', () => {
    const stats = computeStats(
      [exam('a'), exam('b'), exam('c'), exam('d')],
      state,
      new Date(2026, 9, 21),
    );
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(2); // a and the archived attempt of c
    expect(stats.started).toBe(3);
    expect(stats.averages.reading).toBe(Math.round((80 + 50) / 2));
    expect(stats.averages.listening).toBe(40);
    expect(stats.streak).toBe(2);
    expect(stats.practisedToday).toBe(true);
    expect(stats.continueTarget?.exam.id).toBe('b');
    expect(stats.continueTarget?.skill).toBe('reading');
  });

  it('is empty without progress', () => {
    const stats = computeStats([exam('a')], { progress: {}, activity: [] }, new Date(2026, 9, 21));
    expect(stats).toMatchObject({ started: 0, completed: 0, streak: 0, continueTarget: null });
    expect(stats.averages).toEqual({});
  });
});
