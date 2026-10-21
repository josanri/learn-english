import type { ExamProgress } from '../models/storage';
import { examStatus } from './progress';

const exam = { skills: ['reading', 'writing'] as ('reading' | 'writing')[] };
const base: ExamProgress = {
  answers: {},
  results: {},
  startedAt: '',
  updatedAt: '',
  sectionStatus: {},
  attempts: [],
};

describe('examStatus', () => {
  it('is not started without progress', () => {
    expect(examStatus(exam, undefined)).toEqual({
      status: 'not-started',
      fraction: 0,
      scorePercent: null,
      everCompleted: false,
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
    expect(result).toEqual({
      status: 'completed',
      fraction: 1,
      scorePercent: 75,
      everCompleted: true,
    });
  });

  it('needs the writing section too, which has no score', () => {
    const partial = examStatus(exam, {
      ...base,
      sectionStatus: { reading: 'completed' },
    });
    expect(partial).toMatchObject({ status: 'in-progress', fraction: 0.5 });
  });

  it('ignores sections that cannot be practised yet when deciding completion', () => {
    const withMediation = { skills: ['reading', 'mediation'] as ('reading' | 'mediation')[] };
    const result = examStatus(withMediation, {
      ...base,
      sectionStatus: { reading: 'completed' },
    });
    expect(result.status).toBe('completed');
  });

  it('needs the speaking section too, which has no score', () => {
    const withSpeaking = { skills: ['reading', 'speaking'] as ('reading' | 'speaking')[] };
    const reading = { correct: 9, total: 10, completedAt: '' };
    const partial = examStatus(withSpeaking, {
      ...base,
      sectionStatus: { reading: 'completed' },
      results: { reading },
    });
    expect(partial).toMatchObject({ status: 'in-progress', fraction: 0.5, everCompleted: false });
    const full = examStatus(withSpeaking, {
      ...base,
      sectionStatus: { reading: 'completed', speaking: 'completed' },
      results: { reading },
    });
    expect(full).toMatchObject({ status: 'completed', scorePercent: 90, everCompleted: true });
  });

  it('adds up the per-skill results', () => {
    const both = {
      skills: ['reading', 'listening'] as ('reading' | 'listening')[],
    };
    const result = examStatus(both, {
      ...base,
      sectionStatus: { reading: 'completed' },
      results: { reading: { correct: 20, total: 30, completedAt: '' } },
    });
    expect(result.status).toBe('in-progress');
    expect(result.fraction).toBe(0.5);
    expect(result.scorePercent).toBe(67);
  });

  it('keeps the earlier score and completion after a retry', () => {
    const both = {
      skills: ['reading', 'listening'] as ('reading' | 'listening')[],
    };
    const result = examStatus(both, {
      ...base,
      answers: { 'r1-1': 0 },
      attempts: [
        {
          id: 'x-1',
          startedAt: '',
          finishedAt: '',
          answers: {},
          sectionStatus: { reading: 'completed', listening: 'completed' },
          results: {
            reading: { correct: 15, total: 30, completedAt: '' },
            listening: { correct: 15, total: 30, completedAt: '' },
          },
        },
      ],
    });
    expect(result).toMatchObject({ status: 'in-progress', everCompleted: true, scorePercent: 50 });
  });
});
