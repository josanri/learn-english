import type { ReadingSection } from '../../../models/exam';
import { analyseSection, locateItem } from './insights';

const section: ReadingSection = {
  skill: 'reading',
  timeLimitMinutes: 45,
  parts: [
    {
      id: 'reading-5',
      number: 5,
      title: 'Cloze',
      instructions: '',
      type: 'multiple-choice-cloze',
      passage: 'Start a month [1] the move. Write what is [2] the box.',
      questions: [
        {
          id: 'r5-1',
          prompt: 'Gap 1',
          options: ['before', 'until'],
          answer: 0,
          tags: ['linking-words'],
        },
        {
          id: 'r5-2',
          prompt: 'Gap 2',
          options: ['inside', 'under'],
          answer: 0,
          tags: ['prepositions'],
        },
      ],
    },
    {
      id: 'reading-6',
      number: 6,
      title: 'Open cloze',
      instructions: '',
      type: 'open-cloze',
      passage: 'She is a nurse [1] works at the hospital. I am worried [2] the noise.',
      gaps: [
        { id: 'r6-1', answer: 'who', accepted: ['that'], tags: ['relative-clauses'] },
        { id: 'r6-2', answer: 'about', tags: ['prepositions'] },
      ],
    },
  ],
};

describe('analyseSection', () => {
  it('splits the score by part type and tag and lists the wrong answers', () => {
    const insight = analyseSection(section, { 'r5-1': 1, 'r5-2': 0, 'r6-1': 'that' });
    expect(insight.breakdown.parts).toEqual({
      'multiple-choice-cloze': { correct: 1, total: 2 },
      'open-cloze': { correct: 1, total: 2 },
    });
    expect(insight.breakdown.tags).toEqual({
      'linking-words': { correct: 0, total: 1 },
      prepositions: { correct: 1, total: 2 },
      'relative-clauses': { correct: 1, total: 1 },
    });
    // r6-2 was not answered: it counts in the tallies but is not a mistake to practise.
    expect(insight.wrong).toEqual(['r5-1']);
  });
});

describe('locateItem', () => {
  const exam = {
    schemaVersion: 2 as const,
    id: 'x',
    level: 'B1' as const,
    board: 'cambridge-pet',
    title: '',
    subtitle: '',
    theme: '',
    category: 'misc' as const,
    estimatedMinutes: 1,
    sections: [section],
  };

  it('finds an item with its part and its number inside the part', () => {
    const found = locateItem(exam, 'r6-2');
    expect(found?.part.id).toBe('reading-6');
    expect(found?.n).toBe(2);
    expect(found?.item.correct).toBe('about');
  });

  it('returns null for an unknown id', () => {
    expect(locateItem(exam, 'nope')).toBeNull();
  });
});
