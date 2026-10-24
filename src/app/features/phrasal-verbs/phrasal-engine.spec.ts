import type { PhrasalProgress, PhrasalVerb } from '../../models/practice';
import {
  LEARNT_STREAK,
  choicesFor,
  gapForParticle,
  gapForVerb,
  isLearnt,
  parseExample,
  particleOf,
  phrasalToReview,
  phrasalWeight,
  plainExample,
  selectPhrasal,
} from './phrasal-engine';

const pv = (id: string, verb: string, patch: Partial<PhrasalVerb> = {}): PhrasalVerb => ({
  id,
  verb,
  meaning: `meaning of ${id}`,
  example: `We [[${verb}]] now.`,
  group: 'daily-life',
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

describe('examples', () => {
  it('splits marked and plain pieces', () => {
    expect(parseExample('Please [[turn]] the music [[down]].')).toEqual([
      { text: 'Please ', marked: false },
      { text: 'turn', marked: true },
      { text: ' the music ', marked: false },
      { text: 'down', marked: true },
      { text: '.', marked: false },
    ]);
    expect(plainExample('I [[gave up]] sugar.')).toBe('I gave up sugar.');
  });

  it('blanks the whole phrasal verb for the gap exercise', () => {
    const gaps = gapForVerb(pv('turn-down', 'turn down', { example: '[[Turn]] it [[down]].' }));
    expect(gaps.filter((g) => g.gap).map((g) => g.text)).toEqual(['Turn', 'down']);
  });

  it('keeps the verb and blanks the particles for the particle exercise', () => {
    const joined = (parts: { text: string; gap: boolean }[]) =>
      parts.map((p) => (p.gap ? '___' : p.text)).join('');
    expect(
      joined(
        gapForParticle(pv('run-out-of', 'run out of', { example: 'We [[ran out of]] milk.' })),
      ),
    ).toBe('We ran ___ milk.');
    expect(
      joined(gapForParticle(pv('cheer-up', 'cheer up', { example: 'to [[cheer]] her [[up]]' }))),
    ).toBe('to cheer her ___');
    expect(particleOf(pv('run-out-of', 'run out of'))).toBe('out of');
  });
});

describe('choicesFor', () => {
  const all = [
    pv('turn-on', 'turn on'),
    pv('turn-off', 'turn off'),
    pv('take-off', 'take off', { meaning: 'remove clothes' }),
    pv('take-off-2', 'take off', { meaning: 'leave the ground' }),
    pv('look-out', 'look out', { meaning: 'be careful', similar: ['watch-out'] }),
    pv('watch-out', 'watch out', { meaning: 'be careful', similar: ['look-out'] }),
    pv('give-up', 'give up'),
    pv('set-off', 'set off'),
    pv('get-up', 'get up'),
    pv('run-out-of', 'run out of', { example: 'We [[ran out of]] milk.' }),
    pv('get-rid-of', 'get rid of'),
    pv('look-forward-to', 'look forward to'),
    pv('put-up-with', 'put up with'),
  ];

  it('gives four options with exactly one right answer', () => {
    for (const mode of ['meaning', 'gap', 'particle'] as const) {
      const choices = choicesFor(all[0], mode, all, sequence(0.1, 0.7, 0.3, 0.9));
      expect(choices).toHaveLength(4);
      expect(choices.filter((c) => c.correct)).toHaveLength(1);
      expect(new Set(choices.map((c) => c.label)).size).toBe(4);
    }
  });

  it('never offers the other sense of the same verb as a wrong meaning', () => {
    for (let i = 0; i < 20; i++) {
      const labels = choicesFor(all[2], 'meaning', all).map((c) => c.label);
      expect(labels).not.toContain('leave the ground');
    }
  });

  it('never offers a similar verb as a wrong answer', () => {
    for (let i = 0; i < 20; i++) {
      const labels = choicesFor(all[4], 'gap', all).map((c) => c.label);
      expect(labels).not.toContain('watch out');
    }
  });

  it('does not offer a particle that makes another real verb with the same head', () => {
    for (let i = 0; i < 20; i++) {
      const labels = choicesFor(all[0], 'particle', all).map((c) => c.label);
      expect(labels).toContain('on');
      expect(labels).not.toContain('off');
    }
  });

  it('uses multi-word particles for a three-word verb', () => {
    const labels = choicesFor(all[9], 'particle', all, sequence(0.2, 0.5, 0.8)).map((c) => c.label);
    expect(labels).toContain('out of');
    expect(labels.every((l) => l.split(' ').length === 2)).toBe(true);
  });
});

describe('selection', () => {
  const verbs = ['a', 'b', 'c', 'd'].map((id, i) =>
    pv(id, `v${id} up`, { group: i < 2 ? 'x' : 'y' }),
  );

  it('weights new and missed verbs above learnt ones', () => {
    expect(phrasalWeight(undefined)).toBeGreaterThan(phrasalWeight(progress({ right: 1 })));
    expect(phrasalWeight(progress({ wrong: 2 }))).toBeGreaterThan(phrasalWeight(undefined));
    expect(phrasalWeight(progress({ right: 3, streak: LEARNT_STREAK }))).toBeLessThan(0.3);
  });

  it('picks without repeats and respects the group filter', () => {
    const picked = selectPhrasal(verbs, {}, { count: 10, group: 'y', random: sequence(0.5) });
    expect(picked.map((v) => v.id).sort()).toEqual(['c', 'd']);
  });

  it('lists the verbs to review and the learnt ones', () => {
    const record = { a: progress({ wrong: 2, right: 1 }), b: progress({ right: 3, streak: 3 }) };
    expect(phrasalToReview(verbs, record).map((v) => v.id)).toEqual(['a']);
    expect(isLearnt(record.b)).toBe(true);
  });
});
