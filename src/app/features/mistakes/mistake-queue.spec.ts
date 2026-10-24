import { examMistakeId, parseMistakeId, phrasalMistakeId } from '../../core/mistakes';
import type { CardState, MistakeState } from '../../models/practice';
import { dueMistakes, gradeMistake, isFixed, mistakeCounts } from './mistake-queue';

const now = new Date('2026-10-24T12:00:00.000Z');
const card = (patch: Partial<CardState>): CardState => ({
  status: 'review',
  step: 0,
  ease: 2.5,
  interval: 3,
  due: '2026-10-25T12:00:00.000Z',
  reps: 3,
  lapses: 0,
  last: '2026-10-21T12:00:00.000Z',
  added: '2026-10-20',
  ...patch,
});

describe('mistake ids', () => {
  it('round-trips exam and phrasal keys', () => {
    expect(parseMistakeId(examMistakeId('cambridge-pet-07', 'r5-1'))).toEqual({
      kind: 'exam',
      examId: 'cambridge-pet-07',
      itemId: 'r5-1',
    });
    expect(parseMistakeId(phrasalMistakeId('give-up'))).toEqual({
      kind: 'phrasal',
      verbId: 'give-up',
    });
  });

  it('rejects unknown shapes', () => {
    expect(parseMistakeId('card:x')).toBeNull();
    expect(parseMistakeId('exam:only-exam')).toBeNull();
    expect(parseMistakeId('phrasal:a:b')).toBeNull();
  });
});

describe('mistake queue', () => {
  const mistakes: Record<string, MistakeState> = {
    new: { added: '2026-10-22T10:00:00.000Z' },
    older: { added: '2026-10-21T10:00:00.000Z' },
    due: { added: '2026-10-20T10:00:00.000Z', card: card({ due: '2026-10-24T11:00:00.000Z' }) },
    later: { added: '2026-10-19T10:00:00.000Z', card: card({}) },
    fixed: {
      added: '2026-09-01T10:00:00.000Z',
      card: card({ interval: 30, due: '2026-10-01T10:00:00.000Z' }),
    },
  };

  it('lists what is due now, oldest mistake first, never the fixed ones', () => {
    expect(dueMistakes(mistakes, now)).toEqual(['due', 'older', 'new']);
  });

  it('counts due, waiting and fixed items', () => {
    expect(mistakeCounts(mistakes, now)).toEqual({ due: 3, waiting: 1, fixed: 1 });
    expect(isFixed(mistakes['fixed'])).toBe(true);
  });

  it('grades a right answer as Good and a wrong one as Again', () => {
    const right = gradeMistake({ added: '' }, true, now);
    expect(right.status).toBe('learning');
    expect(new Date(right.due).getTime() - now.getTime()).toBe(10 * 60_000);
    const wrong = gradeMistake({ added: '', card: card({}) }, false, now);
    expect(wrong.status).toBe('relearning');
    expect(new Date(wrong.due).getTime() - now.getTime()).toBe(10 * 60_000);
  });
});
