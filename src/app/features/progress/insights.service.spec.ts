import type { ExamProgress } from '../../models/storage';
import { pendingResults } from './insights.service';

const progress = (patch: Partial<ExamProgress>): ExamProgress => ({
  answers: {},
  results: {},
  startedAt: '',
  updatedAt: '',
  sectionStatus: {},
  attempts: [],
  ...patch,
});
const result = (breakdown = false) => ({
  correct: 1,
  total: 2,
  completedAt: '2026-10-01T10:00:00.000Z',
  ...(breakdown ? { breakdown: { parts: {}, tags: {} } } : {}),
});

describe('pendingResults', () => {
  it('lists results without a breakdown; only the newest of each skill adds mistakes', () => {
    const pending = pendingResults(
      progress({
        results: { reading: result() },
        attempts: [
          {
            id: 'a-1',
            startedAt: '',
            finishedAt: '',
            answers: {},
            sectionStatus: {},
            results: { reading: result(), listening: result() },
          },
        ],
      }),
    );
    expect(pending.map((p) => [p.attemptId, p.skill, p.latest])).toEqual([
      [null, 'reading', true],
      ['a-1', 'reading', false],
      ['a-1', 'listening', true],
    ]);
  });

  it('skips results that have a breakdown, but they still count as the newest', () => {
    const pending = pendingResults(
      progress({
        results: { reading: result(true) },
        attempts: [
          {
            id: 'a-1',
            startedAt: '',
            finishedAt: '',
            answers: {},
            sectionStatus: {},
            results: { reading: result() },
          },
        ],
      }),
    );
    expect(pending.map((p) => [p.attemptId, p.latest])).toEqual([['a-1', false]]);
  });
});
