import type { BasicWord, PhrasalProgress } from '../../models/practice';
import {
  basicChoices,
  basicToReview,
  gapForWord,
  mixedModes,
  normalizeAnswer,
  selectBasic,
  spellingHint,
  spellingIsRight,
  topicProgress,
} from './basic-engine';

const word = (id: string, patch: Partial<BasicWord> = {}): BasicWord => ({
  id,
  w: id,
  t: 'clothes',
  g: 'Clothes',
  d: `meaning of ${id}`,
  e: `I like my [[${id}]].`,
  img: '',
  ...patch,
});

const progress = (patch: Partial<PhrasalProgress> = {}): PhrasalProgress => ({
  right: 0,
  wrong: 0,
  lastSeen: '',
  streak: 0,
  ...patch,
});

/** Cycles through fixed values so the tests do not depend on Math.random. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('gaps and spelling', () => {
  it('blanks the marked word', () => {
    const gaps = gapForWord(word('dress', { e: 'She wore a red [[dress]].' }));
    expect(gaps).toEqual([
      { text: 'She wore a red ', gap: false },
      { text: 'dress', gap: true },
      { text: '.', gap: false },
    ]);
  });

  it('ignores case, spaces, hyphens, apostrophes and accents', () => {
    expect(normalizeAnswer(' T-Shirt ')).toBe('tshirt');
    expect(spellingIsRight('t shirt', word('t-shirt', { w: 'T-shirt' }))).toBe(true);
    expect(spellingIsRight('chemists', word('chemists', { w: "chemist's" }))).toBe(true);
    expect(spellingIsRight('café', word('cafe'))).toBe(true);
    expect(spellingIsRight('dres', word('dress'))).toBe(false);
    expect(spellingIsRight('   ', word('dress'))).toBe(false);
  });

  it('gives the first letter and one blank per letter', () => {
    expect(spellingHint(word('dress'))).toBe('d _ _ _ _');
    expect(spellingHint(word('t-shirt', { w: 'T-shirt' }))).toBe('T - _ _ _ _ _');
    expect(spellingHint(word('bus-stop', { w: 'bus stop' }))).toBe('b _ _   _ _ _ _');
  });
});

describe('choices', () => {
  const all = [
    word('dress'),
    word('skirt'),
    word('coat', { similar: ['jacket'] }),
    word('jacket'),
    word('hat', { g: 'Accessories' }),
    word('dog', { t: 'animals', g: 'Pets' }),
  ];

  it('offers four different options with one right answer', () => {
    const choices = basicChoices(all[0], 'word', all, sequence(0.1, 0.7, 0.3, 0.9));
    expect(choices).toHaveLength(4);
    expect(new Set(choices.map((c) => c.label)).size).toBe(4);
    expect(choices.filter((c) => c.correct).map((c) => c.label)).toEqual(['dress']);
  });

  it('prefers the same group, then the same topic', () => {
    const choices = basicChoices(all[0], 'word', all, sequence(0.5));
    expect(choices.map((c) => c.label)).not.toContain('dog');
  });

  it('never offers a similar word as a wrong answer, in either direction', () => {
    for (let i = 0; i < 20; i++) {
      const forCoat = basicChoices(all[2], 'gap', all).map((c) => c.label);
      const forJacket = basicChoices(all[3], 'gap', all).map((c) => c.label);
      expect(forCoat).not.toContain('jacket');
      expect(forJacket).not.toContain('coat');
    }
  });

  it('uses definitions as labels in the meaning exercise', () => {
    const choices = basicChoices(all[0], 'meaning', all);
    expect(choices.find((c) => c.correct)?.label).toBe('meaning of dress');
  });
});

describe('selection and progress', () => {
  const words = [word('a'), word('b'), word('c')];

  it('picks each word at most once', () => {
    const picked = selectBasic(words, {}, { count: 10 });
    expect(picked.map((w) => w.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('keeps to the given ids', () => {
    expect(selectBasic(words, {}, { onlyIds: ['b'] }).map((w) => w.id)).toEqual(['b']);
  });

  it('lists missed words to review and counts learnt ones', () => {
    const saved = {
      a: progress({ right: 3, streak: 3 }),
      b: progress({ wrong: 2, right: 1 }),
    };
    expect(basicToReview(words, saved).map((w) => w.id)).toEqual(['b']);
    expect(topicProgress(words, saved)).toEqual({ total: 3, learnt: 1, practised: 2 });
  });

  it('leaves the listening exercise out when the browser cannot speak', () => {
    expect(mixedModes(true)).toContain('listen');
    expect(mixedModes(false)).not.toContain('listen');
  });
});
