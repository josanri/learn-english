import { analyzeSpeech, tokenize } from './speech-metrics';

describe('analyzeSpeech', () => {
  it('counts words, wpm and sentence length', () => {
    const m = analyzeSpeech('I like cooking. My brother likes football! We play together.', 30);
    expect(m.words).toBe(10);
    expect(m.wordsPerMinute).toBe(20);
    expect(m.sentences).toBe(3);
    expect(m.averageSentenceLength).toBe(3.3);
    expect(m.lexicalVariety).toBe(1);
  });

  it('reports no sentence data when the text has no end punctuation', () => {
    const m = analyzeSpeech('i like cooking because it is relaxing', 10);
    expect(m.sentences).toBeNull();
    expect(m.averageSentenceLength).toBeNull();
    expect(m.lexicalVariety).toBeNull(); // fewer than 10 words
  });

  it('has no wpm for typed answers or zero duration', () => {
    expect(analyzeSpeech('hello there', null).wordsPerMinute).toBeNull();
    expect(analyzeSpeech('hello there', 0).wordsPerMinute).toBeNull();
    expect(analyzeSpeech('', 20).wordsPerMinute).toBeNull();
  });

  it('finds connectors, preferring phrases, and ignores partial words', () => {
    const m = analyzeSpeech(
      'First of all I like it because it is fun. However my sister, although she is busy, says so. Absolutely.',
      40,
    );
    const found = Object.fromEntries(m.connectors.map((c) => [c.text, c.count]));
    expect(found['first of all']).toBe(1);
    expect(found['because']).toBe(1);
    expect(found['however']).toBe(1);
    expect(found['although']).toBe(1);
    expect(found['so']).toBe(1);
    expect(found['all']).toBeUndefined();
  });

  it('detects fillers', () => {
    const m = analyzeSpeech('Um I think, eh, you know, um it is good', 12);
    const found = Object.fromEntries(m.fillers.map((c) => [c.text, c.count]));
    expect(found).toEqual({ um: 2, eh: 1, 'you know': 1 });
  });

  it('tokenizes apostrophes', () => {
    expect(tokenize("I don't know")).toEqual(['i', "don't", 'know']);
  });
});
