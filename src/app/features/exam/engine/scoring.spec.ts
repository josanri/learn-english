import {
  choiceItems,
  formatAnswer,
  formatCorrect,
  gapItems,
  isAnswered,
  isCorrect,
  letterGapItems,
  normalizeAnswer,
  percent,
  practiceBand,
  scoreItems,
  statementItems,
} from './scoring';
import { splitParagraphs, splitPassage } from './passage';

describe('normalizeAnswer', () => {
  it('ignores case, spacing, hyphens, typographic apostrophes and edge punctuation', () => {
    expect(normalizeAnswer('  WELL-known. ')).toBe('well known');
    expect(normalizeAnswer('well   known')).toBe('well known');
    expect(normalizeAnswer('Don’t')).toBe("don't");
    expect(normalizeAnswer('Don‘t')).toBe("don't");
    expect(normalizeAnswer('ice–cream')).toBe('ice cream');
    expect(normalizeAnswer('“west”')).toBe('west');
  });
});

describe('multiple choice', () => {
  const items = choiceItems([
    { id: 'q1', prompt: 'Where?', options: ['Cafe', 'Station', 'Bookshop'], answer: 2 },
  ]);

  it('marks by option index', () => {
    expect(isCorrect(items[0], 2)).toBe(true);
    expect(isCorrect(items[0], 1)).toBe(false);
    expect(isCorrect(items[0], undefined)).toBe(false);
  });

  it('accepts index 0 as an answer and tolerates numeric strings', () => {
    expect(isAnswered(0)).toBe(true);
    expect(isCorrect({ ...items[0], correct: 0 }, 0)).toBe(true);
    expect(isCorrect(items[0], '2')).toBe(true);
  });

  it('formats answers with letters', () => {
    expect(formatAnswer(items[0], 1)).toBe('B. Station');
    expect(formatCorrect(items[0])).toBe('C. Bookshop');
    expect(formatAnswer(items[0], undefined)).toBe('No answer');
  });
});

describe('matching', () => {
  it('shows the labels of the texts when provided', () => {
    const [item] = choiceItems([
      { id: 'r2-1', prompt: 'Nina', options: ['A', 'B', 'C'], answer: 2 },
    ]);
    const matching = { ...item, optionLabels: ['A. Photo walks', 'B. Garden', 'C. Cooking'] };
    expect(formatCorrect(matching)).toBe('C. Cooking');
    expect(isCorrect(matching, 2)).toBe(true);
  });
});

describe('gaps with accepted answers', () => {
  const [gap] = gapItems([{ id: 'g1', answer: 'at', accepted: ['in'] }]);

  it('accepts the key and the alternatives, normalised', () => {
    expect(isCorrect(gap, 'at')).toBe(true);
    expect(isCorrect(gap, ' IN ')).toBe(true);
    expect(isCorrect(gap, 'on')).toBe(false);
    expect(isCorrect(gap, '')).toBe(false);
  });

  it('handles multi-word keys with hyphens and curly apostrophes', () => {
    const [item] = gapItems([
      { id: 'g2', answer: "o'clock" },
      { id: 'g3', answer: 'ice cream' },
    ]);
    expect(isCorrect(item, 'O’clock')).toBe(true);
    const [, cream] = gapItems([
      { id: 'g2', answer: "o'clock" },
      { id: 'g3', answer: 'ice cream' },
    ]);
    expect(isCorrect(cream, 'ice-cream')).toBe(true);
  });

  it('uses the prompt when the gap has one', () => {
    const [prompted] = gapItems([{ id: 'n1', prompt: 'Wear old ___', answer: 'shoes' }]);
    expect(prompted.prompt).toBe('Wear old ___');
  });
});

describe('lettered gaps (gapped text, headings, opinions)', () => {
  const items = letterGapItems(
    [
      { id: 'r4-1', answer: 'D' },
      { id: 'r4-2', answer: 'f' },
    ],
    ['one', 'two', 'three', 'four', 'five', 'six'],
    (_, i) => `Gap ${i + 1}`,
  );

  it('compares letters case-insensitively', () => {
    expect(isCorrect(items[0], 'd')).toBe(true);
    expect(isCorrect(items[0], 'D')).toBe(true);
    expect(isCorrect(items[1], 'F')).toBe(true);
    expect(isCorrect(items[1], 'E')).toBe(false);
  });

  it('describes the letter with its text', () => {
    expect(formatAnswer(items[0], 'a')).toBe('A. one');
    expect(formatCorrect(items[0])).toBe('D. four');
  });
});

describe('true / false / not given', () => {
  const items = statementItems([
    { id: 's1', text: 'It rains.', answer: 'true' },
    { id: 's2', text: 'He sings.', answer: 'not-given' },
  ]);

  it('marks the three answers', () => {
    expect(isCorrect(items[0], 'true')).toBe(true);
    expect(isCorrect(items[0], 'false')).toBe(false);
    expect(isCorrect(items[1], 'not-given')).toBe(true);
    expect(formatAnswer(items[1], 'not-given')).toBe('Not given');
    expect(formatCorrect(items[0])).toBe('True');
  });
});

describe('aggregation', () => {
  it('counts correct, answered and total', () => {
    const items = [
      ...choiceItems([
        { id: 'a', prompt: '', options: ['x', 'y'], answer: 1 },
        { id: 'b', prompt: '', options: ['x', 'y'], answer: 0 },
      ]),
      ...gapItems([{ id: 'c', answer: 'word' }]),
    ];
    const score = scoreItems(items, { a: 1, b: 1, c: '' });
    expect(score).toEqual({ correct: 1, total: 3, answered: 2 });
    expect(percent(score)).toBe(33);
    expect(percent({ correct: 0, total: 0 })).toBe(0);
  });

  it('describes the practice bands without claiming an official level', () => {
    expect(practiceBand(90).label).toBe('Strong');
    expect(practiceBand(65).label).toBe('Solid');
    expect(practiceBand(45).label).toBe('Getting there');
    expect(practiceBand(10).label).toBe('Keep practising');
  });
});

describe('splitPassage', () => {
  it('splits numbered gap markers from text', () => {
    expect(splitPassage('We arrived [1] the coast. [2] Fine.')).toEqual([
      { type: 'text', text: 'We arrived ' },
      { type: 'gap', gap: 1 },
      { type: 'text', text: ' the coast. ' },
      { type: 'gap', gap: 2 },
      { type: 'text', text: ' Fine.' },
    ]);
  });

  it('keeps paragraphs apart', () => {
    expect(splitParagraphs('One [1].\n\nTwo.')).toHaveLength(2);
  });
});
