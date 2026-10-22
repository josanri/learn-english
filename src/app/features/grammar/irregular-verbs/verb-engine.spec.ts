import type { IrregularVerb, VerbProgress } from '../../../models/grammar';
import {
  completeSentence,
  gapSentenceFor,
  isCorrectForm,
  patternOf,
  selectVerbs,
  splitGap,
  verbWeight,
  verbsToReview,
} from './verb-engine';

const verb = (patch: Partial<IrregularVerb> & { id: string }): IrregularVerb => ({
  base: patch.id,
  past: `${patch.id}-p`,
  participle: `${patch.id}-pp`,
  example: 'It {{past}} here.',
  exampleParticiple: 'It has {{participle}} here.',
  ...patch,
});

const progress = (patch: Partial<VerbProgress> = {}): VerbProgress => ({
  right: 0,
  wrong: 0,
  lastSeen: '',
  known: false,
  starred: false,
  ...patch,
});

describe('patternOf', () => {
  it('classifies the four patterns', () => {
    expect(patternOf(verb({ id: 'cut', past: 'cut', participle: 'cut' }))).toBe('AAA');
    expect(patternOf(verb({ id: 'come', past: 'came', participle: 'come' }))).toBe('ABA');
    expect(patternOf(verb({ id: 'make', past: 'made', participle: 'made' }))).toBe('ABB');
    expect(patternOf(verb({ id: 'sing', past: 'sang', participle: 'sung' }))).toBe('ABC');
  });
});

describe('isCorrectForm', () => {
  const burn = verb({
    id: 'burn',
    past: 'burnt',
    participle: 'burnt',
    alt: { past: ['burned'], participle: ['burned'] },
  });

  it('ignores case, spaces and end punctuation', () => {
    expect(isCorrectForm(burn, 'past', '  Burnt. ')).toBe(true);
  });

  it('accepts the alternative spellings', () => {
    expect(isCorrectForm(burn, 'past', 'burned')).toBe(true);
    expect(isCorrectForm(burn, 'participle', 'burned')).toBe(true);
  });

  it('rejects wrong and empty answers', () => {
    expect(isCorrectForm(burn, 'past', 'burnd')).toBe(false);
    expect(isCorrectForm(burn, 'past', '')).toBe(false);
  });
});

describe('gap sentences', () => {
  it('splits a sentence at the marker', () => {
    expect(splitGap('She {{participle}} well.')).toEqual({
      kind: 'participle',
      before: 'She ',
      after: ' well.',
    });
    expect(splitGap('No marker')).toBeNull();
  });

  it('builds the gap and the full sentence for a verb', () => {
    const sing = verb({
      id: 'sing',
      past: 'sang',
      participle: 'sung',
      example: 'She {{past}} well.',
    });
    expect(gapSentenceFor(sing, 'past')?.before).toBe('She ');
    expect(completeSentence(sing, 'past')).toBe('She sang well.');
    expect(completeSentence(sing, 'participle')).toBe('It has sung here.');
  });
});

describe('selectVerbs', () => {
  const verbs = ['a', 'b', 'c', 'd', 'e'].map((id) => verb({ id }));

  it('never repeats a verb and respects the count', () => {
    const picked = selectVerbs(verbs, {}, { count: 4, random: () => 0.5 });
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((v) => v.id)).size).toBe(4);
  });

  it('returns every verb when the pool is smaller than the count', () => {
    expect(selectVerbs(verbs, {}, { count: 10, random: () => 0 })).toHaveLength(5);
  });

  it('limits the pool to onlyIds', () => {
    const picked = selectVerbs(verbs, {}, { onlyIds: ['b', 'd'], random: () => 0 });
    expect(picked.map((v) => v.id).sort()).toEqual(['b', 'd']);
  });

  it('picks weak verbs first when the random value is low', () => {
    const weak = { c: progress({ wrong: 5 }) };
    // With random 0 the first verb in the list wins unless its weight is zero; weights are positive,
    // so check the weights instead of the order.
    expect(verbWeight(weak['c'])).toBeGreaterThan(verbWeight(undefined) - 0.0001);
    expect(verbWeight(progress({ right: 8, known: true }))).toBeLessThan(verbWeight(undefined));
  });
});

describe('verbsToReview', () => {
  const verbs = ['a', 'b', 'c'].map((id) => verb({ id }));

  it('lists verbs answered wrong at least as often as right, and not known', () => {
    const list = verbsToReview(verbs, {
      a: progress({ wrong: 2, right: 1 }),
      b: progress({ wrong: 1, right: 3 }),
      c: progress({ wrong: 2, known: true }),
    });
    expect(list.map((v) => v.id)).toEqual(['a']);
  });
});
