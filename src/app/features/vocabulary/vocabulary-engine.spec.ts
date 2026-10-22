import { dictionaryUrl, filterWords, initialOf } from './vocabulary-engine';

describe('vocabulary engine', () => {
  it('builds the dictionary link', () => {
    const root = 'https://dictionary.cambridge.org/dictionary/english/';
    expect(dictionaryUrl('air conditioning')).toBe(`${root}air-conditioning`);
    expect(dictionaryUrl('a/an')).toBe(`${root}a`);
    expect(dictionaryUrl('ad (advertisement)')).toBe(`${root}ad`);
    expect(dictionaryUrl('o’clock')).toBe(`${root}oclock`);
  });

  it('finds the first letter', () => {
    expect(initialOf('apple')).toBe('A');
    expect(initialOf('@')).toBe('#');
  });

  it('filters by text, topic, letter and part of speech', () => {
    const words = [
      { w: 'apple', p: 'n', t: ['food'] },
      { w: 'give in', p: 'phr v' },
      { w: 'about', p: 'adv & prep' },
    ];
    const all = { query: '', topic: 'all', letter: 'all', pos: 'all' };
    expect(filterWords(words, all)).toHaveLength(3);
    expect(filterWords(words, { ...all, query: 'GIVE' })).toHaveLength(1);
    expect(filterWords(words, { ...all, topic: 'food' })).toHaveLength(1);
    expect(filterWords(words, { ...all, letter: 'A' })).toHaveLength(2);
    expect(filterWords(words, { ...all, pos: 'prep' })).toHaveLength(1);
    expect(filterWords(words, { ...all, pos: 'phr' })).toHaveLength(1);
  });
});
