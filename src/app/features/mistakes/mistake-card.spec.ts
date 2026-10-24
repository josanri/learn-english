import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Exam } from '../../models/exam';
import { buildExamCard, gapContext } from './mistake-card';

const exam = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/assets/exams/b1/cambridge-pet/cambridge-pet-07.json'),
    'utf8',
  ),
) as Exam;

describe('gapContext', () => {
  const answers = ['one', 'two', 'three'];
  const answerOf = (gap: number) => answers[gap - 1];

  it('returns the sentence of the gap with the other gaps filled in', () => {
    expect(
      gapContext('First [1] here. Then [2] and [3] in a longer sentence.', 2, answerOf),
    ).toEqual({ before: 'Then ', after: ' and three in a longer sentence.' });
  });

  it('adds the previous sentence when the sentence of the gap is very short', () => {
    expect(gapContext('We packed [1] the boxes on Monday. It was [2].', 2, answerOf)).toEqual({
      before: 'We packed one the boxes on Monday. It was ',
      after: '.',
    });
  });
});

describe('buildExamCard', () => {
  it('makes a choice card with context for a multiple-choice cloze question', () => {
    const card = buildExamCard(exam, 'r5-1');
    expect(card?.kind).toBe('choice');
    if (card?.kind !== 'choice') return;
    expect(card.heading).toBe('Reading Part 5 · Choose the missing word');
    expect(card.context?.before).toContain('Start packing at least a month');
    expect(card.options[card.correct]).toBe('before');
    expect(card.link).toEqual({
      commands: ['/exams', 'b1', 'cambridge-pet', 'cambridge-pet-07', 'reading'],
      queryParams: { part: 'reading-5' },
    });
  });

  it('makes a typed card for an open cloze gap', () => {
    const card = buildExamCard(exam, 'r6-2');
    expect(card?.kind).toBe('text');
    if (card?.kind !== 'text') return;
    expect(card.context?.before).toContain('She is a nurse');
    expect(card.expected).toBe('who');
  });

  it('shows the notice for a notice question', () => {
    const card = buildExamCard(exam, 'r1-1');
    expect(card?.kind).toBe('choice');
    if (card?.kind !== 'choice') return;
    expect(card.notice).toBeTruthy();
  });

  it('asks the learner to open the part for items that need the text or the recording', () => {
    const card = buildExamCard(exam, 'r4-1');
    expect(card?.kind).toBe('self');
    if (card?.kind !== 'self') return;
    expect(card.prompt).toBeUndefined(); // "Gap 1" says nothing on its own
    expect(card.skill).toBe('reading');
  });

  it('returns null for an item that no longer exists', () => {
    expect(buildExamCard(exam, 'missing')).toBeNull();
  });
});
