import { checkCapitals } from './capitals';
import { applyIssue, expandTemplate, mergeIssues, remapIssues } from './rule-engine';
import type { Issue } from './types';

const issue = (start: number, end: number, extra: Partial<Issue> = {}): Issue => ({
  id: `x:${start}:${end}`,
  ruleId: 'x',
  group: 'grammar',
  severity: 'error',
  source: 'rules',
  category: 'Test',
  start,
  end,
  original: '',
  message: 'm',
  suggestions: [],
  ...extra,
});

describe('expandTemplate', () => {
  it('fills groups and mapped groups', () => {
    const match = 'made a photo'.match(/(made) (a) (photo)/)!;
    expect(expandTemplate('$m1 $2 $3', match, { made: 'took' })).toBe('took a photo');
    expect(expandTemplate('$1 ($0)', match, undefined)).toBe('made (made a photo)');
  });

  it('turns a missing group into nothing', () => {
    const match = 'a'.match(/(a)(b)?/)!;
    expect(expandTemplate('$1$2!', match, undefined)).toBe('a!');
  });
});

describe('applyIssue', () => {
  it('replaces the range', () => {
    expect(applyIssue('I am agree.', issue(0, 10), 'I agree')).toBe('I agree.');
  });
});

describe('mergeIssues', () => {
  it('drops overlapping issues, keeping errors from rules first', () => {
    const rule = issue(0, 10, { id: 'r' });
    const spelling = issue(2, 6, { id: 's', source: 'spelling' });
    const apart = issue(12, 15, { id: 'a' });
    expect(mergeIssues([spelling, apart, rule]).map((i) => i.id)).toEqual(['r', 'a']);
  });

  it('prefers an error over a note', () => {
    const note = issue(0, 5, { id: 'n', severity: 'note' });
    const error = issue(3, 8, { id: 'e', source: 'spelling' });
    expect(mergeIssues([note, error]).map((i) => i.id)).toEqual(['e']);
  });
});

describe('remapIssues', () => {
  it('keeps issues before the edit and shifts the ones after it', () => {
    const before = 'I am agree and he dont go';
    const issues = [issue(2, 10), issue(18, 22)];
    const after = 'I am agree and so he dont go';
    const moved = remapIssues(issues, before, after);
    expect(moved.map((i) => [i.start, i.end])).toEqual([
      [2, 10],
      [21, 25],
    ]);
  });

  it('drops an issue the edit touches', () => {
    const moved = remapIssues([issue(5, 10)], 'abcde fghij', 'abcde fgXhij');
    expect(moved).toEqual([]);
  });

  it('handles deletions and insertions at the very start', () => {
    expect(remapIssues([issue(4, 7)], 'abc def', 'xabc def').map((i) => i.start)).toEqual([5]);
    expect(remapIssues([issue(4, 7)], 'abc def', 'bc def').map((i) => i.start)).toEqual([3]);
  });

  it('returns the same issues for the same text', () => {
    const issues = [issue(1, 2)];
    expect(remapIssues(issues, 'abc', 'abc')).toEqual(issues);
  });
});

describe('checkCapitals', () => {
  const found = (text: string) => checkCapitals(text).map((i) => text[i.start]);

  it('flags a lower-case start of text and of sentences', () => {
    expect(found('hello there. then we left! why? because.')).toEqual(['h', 't', 'w', 'b']);
  });

  it('flags a lower-case line after a greeting or a full stop', () => {
    expect(found('Dear Alex,\nthanks for the email.\nsee you soon')).toEqual(['t', 's']);
  });

  it('skips abbreviations, numbers, ellipses and capitals', () => {
    expect(
      found('I like tea, e.g. black tea. We met Mr. smith... and then no. 5 was ok. Fine.'),
    ).toEqual([]);
  });

  it('suggests the capital letter', () => {
    expect(checkCapitals('hello')[0].suggestions).toEqual(['H']);
  });
});
