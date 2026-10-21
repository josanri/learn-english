import { countWords, lengthState, parseWordTarget, straightenQuotes, wordsOf } from './text';

describe('countWords', () => {
  it('counts words separated by any whitespace', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
    expect(countWords('one')).toBe(1);
    expect(countWords(' Hi  Alex,\nhow are\tyou? ')).toBe(5);
    expect(countWords("it's a well-known fact")).toBe(4);
  });
});

describe('parseWordTarget', () => {
  it('reads "about N words" as a range around N', () => {
    expect(parseWordTarget('about 100 words')).toEqual({ label: 'about 100', min: 80, max: 130 });
  });

  it('reads ranges and minimums', () => {
    expect(parseWordTarget('20 to 50 words')).toMatchObject({
      label: '20 to 50',
      min: 20,
      max: 55,
    });
    expect(parseWordTarget('100-120 words')).toMatchObject({ min: 100 });
    expect(parseWordTarget('at least 150 words')).toEqual({
      label: 'at least 150',
      min: 150,
      max: Number.POSITIVE_INFINITY,
    });
  });

  it('falls back to any length when there is no number', () => {
    expect(parseWordTarget('a short text').min).toBe(1);
  });
});

describe('lengthState', () => {
  const target = parseWordTarget('about 100 words');
  it('is empty, short, good or long', () => {
    expect(lengthState(0, target)).toBe('empty');
    expect(lengthState(79, target)).toBe('short');
    expect(lengthState(80, target)).toBe('good');
    expect(lengthState(130, target)).toBe('good');
    expect(lengthState(131, target)).toBe('long');
  });
});

describe('helpers', () => {
  it('straightens quotes without changing the length', () => {
    const text = 'don’t ‘go’';
    expect(straightenQuotes(text)).toBe("don't 'go'");
    expect(straightenQuotes(text).length).toBe(text.length);
  });

  it('lists the words of a text', () => {
    expect(wordsOf("Alex’s e-mail isn't here.")).toEqual(['Alex’s', 'e', 'mail', "isn't", 'here']);
  });
});
