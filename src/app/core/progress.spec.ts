import type { ExamProgress } from '../models/storage';
import { examStatus } from './progress';

const exam = { skills: ['reading', 'writing'] as ('reading' | 'writing')[] };
const base: ExamProgress = {
  answers: {},
  results: {},
  startedAt: '',
  updatedAt: '',
  sectionStatus: {},
};

describe('examStatus', () => {
  it('is not started without progress', () => {
    expect(examStatus(exam, undefined)).toEqual({
      status: 'not-started',
      fraction: 0,
      scorePercent: null,
    });
  });

  it('is in progress once something is answered', () => {
    expect(examStatus(exam, { ...base, answers: { 'r1-1': 0 } }).status).toBe('in-progress');
  });

  it('is completed when every section is completed, with the score', () => {
    const result = examStatus(exam, {
      ...base,
      sectionStatus: { reading: 'completed', writing: 'completed' },
      results: { objective: { correct: 18, total: 24, completedAt: '' } },
    });
    expect(result).toEqual({ status: 'completed', fraction: 1, scorePercent: 75 });
  });
});
