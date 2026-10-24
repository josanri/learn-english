import type { CardState, Flashcard } from '../../models/practice';
import {
  EASY_INTERVAL,
  MIN_EASE,
  buildQueue,
  deckStats,
  formatDelay,
  fuzz,
  highlightWord,
  nextCard,
  previewDelays,
  schedule,
} from './srs';

const MIN = 60_000;
const DAY = 86_400_000;
const now = new Date(2026, 9, 23, 10, 0, 0);
const steady = () => 0.5;
const after = (ms: number) => new Date(now.getTime() + ms);
const dueIn = (state: CardState, from = now) => new Date(state.due).getTime() - from.getTime();

const card = (id: string, t = 'general'): Flashcard => ({ id, w: id, p: 'n', t, d: 'd', e: 'e' });

const review = (patch: Partial<CardState> = {}): CardState => ({
  status: 'review',
  step: 0,
  ease: 2.5,
  interval: 1,
  due: now.toISOString(),
  reps: 3,
  lapses: 0,
  last: new Date(now.getTime() - DAY).toISOString(),
  added: '2026-10-20',
  ...patch,
});

describe('schedule: new cards', () => {
  it('gives four different delays to a new card', () => {
    const delays = previewDelays(undefined, now);
    expect(formatDelay(delays.again)).toBe('1 min');
    expect(formatDelay(delays.hard)).toBe('6 min');
    expect(formatDelay(delays.good)).toBe('10 min');
    expect(formatDelay(delays.easy)).toBe('4 d');
    expect(new Set(Object.values(delays)).size).toBe(4);
  });

  it('moves through the learning steps before graduating to one day', () => {
    const first = schedule(undefined, 'good', now, steady);
    expect(first.status).toBe('learning');
    expect(dueIn(first)).toBe(10 * MIN);
    const second = schedule(first, 'good', after(10 * MIN), steady);
    expect(second.status).toBe('review');
    expect(second.interval).toBe(1);
    expect(dueIn(second, after(10 * MIN))).toBe(DAY);
  });

  it('graduates straight to four days with Easy', () => {
    const state = schedule(undefined, 'easy', now, steady);
    expect(state.status).toBe('review');
    expect(state.interval).toBe(EASY_INTERVAL);
  });

  it('sends a learning card back to the first step with Again', () => {
    const first = schedule(undefined, 'good', now, steady);
    const again = schedule(first, 'again', after(10 * MIN), steady);
    expect(again.step).toBe(0);
    expect(dueIn(again, after(10 * MIN))).toBe(MIN);
  });

  it('records the day the card was first studied', () => {
    expect(schedule(undefined, 'good', now).added).toBe('2026-10-23');
  });
});

describe('schedule: review cards', () => {
  it('grows the interval by the ease factor', () => {
    let state = review({ interval: 1 });
    const intervals: number[] = [];
    let at = now;
    for (let i = 0; i < 5; i++) {
      state = schedule(state, 'good', at, steady);
      intervals.push(state.interval);
      at = new Date(state.due);
    }
    expect(intervals).toEqual([3, 8, 20, 50, 125]);
  });

  it('gives different intervals to Hard, Good and Easy', () => {
    const delays = previewDelays(
      review({ interval: 3, last: new Date(now.getTime() - 3 * DAY).toISOString() }),
      now,
    );
    expect(Math.round(delays.hard / DAY)).toBe(4);
    expect(Math.round(delays.good / DAY)).toBe(8);
    expect(Math.round(delays.easy / DAY)).toBe(10);
    expect(formatDelay(delays.again)).toBe('10 min');
  });

  it('changes the ease with Hard and Easy but never below the minimum', () => {
    expect(schedule(review(), 'hard', now, steady).ease).toBe(2.35);
    expect(schedule(review(), 'easy', now, steady).ease).toBe(2.65);
    expect(schedule(review({ ease: MIN_EASE }), 'again', now, steady).ease).toBe(MIN_EASE);
  });

  it('puts a forgotten card into relearning and shrinks its interval', () => {
    const lapsed = schedule(review({ interval: 30 }), 'again', now, steady);
    expect(lapsed.status).toBe('relearning');
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.interval).toBe(9);
    expect(dueIn(lapsed)).toBe(10 * MIN);
    const back = schedule(lapsed, 'good', after(10 * MIN), steady);
    expect(back.status).toBe('review');
    expect(back.interval).toBe(9);
  });

  it('rewards a card answered late', () => {
    const late = review({ interval: 4, last: new Date(now.getTime() - 10 * DAY).toISOString() });
    // (4 + 6 / 2) * 2.5 = 17.5 days instead of 10.
    expect(schedule(late, 'good', now, steady).interval).toBe(18);
  });
});

describe('fuzz', () => {
  it('leaves short intervals alone and spreads longer ones by about 5 %', () => {
    expect(fuzz(2, () => 0)).toBe(2);
    expect(fuzz(20, () => 0)).toBe(19);
    expect(fuzz(20, () => 0.999)).toBe(21);
    expect(fuzz(100, () => 0)).toBe(95);
  });
});

describe('formatDelay', () => {
  it('uses minutes, hours, days, weeks, months and years', () => {
    expect(formatDelay(30_000)).toBe('1 min');
    expect(formatDelay(3 * 3_600_000)).toBe('3 h');
    expect(formatDelay(5 * DAY)).toBe('5 d');
    expect(formatDelay(21 * DAY)).toBe('3 wk');
    expect(formatDelay(90 * DAY)).toBe('3 mo');
    expect(formatDelay(500 * DAY)).toBe('1.4 yr');
  });
});

describe('buildQueue and nextCard', () => {
  const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => card(id, id === 'e' ? 'food' : 'general'));

  it('limits the new cards to what is left of the daily allowance', () => {
    const states = {
      a: {
        ...review(),
        status: 'learning' as const,
        added: '2026-10-23',
        due: after(5 * MIN).toISOString(),
      },
    };
    const queue = buildQueue(cards, states, now, { newPerDay: 3 });
    expect(queue.newToday).toBe(1);
    expect(queue.fresh).toHaveLength(2);
    expect(queue.waiting.map((w) => w.card.id)).toEqual(['a']);
  });

  it('shows reviews due later today but not tomorrow', () => {
    const states = {
      a: review({ due: new Date(2026, 9, 23, 22, 0).toISOString() }),
      b: review({ due: new Date(2026, 9, 24, 8, 0).toISOString() }),
    };
    const queue = buildQueue(cards, states, now, { newPerDay: 0 });
    expect(queue.reviews.map((c) => c.id)).toEqual(['a']);
  });

  it('only introduces new cards of the chosen topic', () => {
    const queue = buildQueue(cards, {}, now, { newPerDay: 10, topic: 'food' });
    expect(queue.fresh.map((c) => c.id)).toEqual(['e']);
  });

  it('shows due learning cards first, then mixes reviews and new cards', () => {
    const states = {
      a: { ...review(), status: 'learning' as const, due: now.toISOString() },
      b: review(),
    };
    const queue = buildQueue(cards, states, now, { newPerDay: 10 });
    expect(nextCard(queue, now, 0)?.id).toBe('a');
    const noLearning = { ...queue, learning: [] };
    expect(nextCard(noLearning, now, 0)?.id).toBe('b');
    expect(nextCard(noLearning, now, 3)?.id).toBe(queue.fresh[0].id);
  });

  it('shows a learning card early when nothing else is left', () => {
    const states = {
      a: { ...review(), status: 'learning' as const, due: after(8 * MIN).toISOString() },
    };
    const queue = buildQueue([cards[0]], states, now, { newPerDay: 10 });
    expect(nextCard(queue, now, 0)?.id).toBe('a');
    const later = { a: { ...states.a, due: after(60 * MIN).toISOString() } };
    expect(nextCard(buildQueue([cards[0]], later, now, { newPerDay: 10 }), now, 0)).toBeNull();
  });
});

describe('highlightWord', () => {
  it('finds the word and its inflected forms', () => {
    expect(highlightWord('Can I borrow your pen?', 'borrow')?.match).toBe('borrow');
    expect(highlightWord('She applied for a job.', 'apply')?.match).toBe('applied');
    expect(highlightWord('Try on these jeans.', 'try on')?.match).toBe('Try');
    expect(highlightWord('It was nothing.', 'borrow')).toBeNull();
  });
});

describe('deckStats', () => {
  it('counts unseen, learning, young, mature and tomorrow', () => {
    const cards = ['a', 'b', 'c', 'd'].map((id) => card(id));
    const states = {
      b: { ...review(), status: 'learning' as const },
      c: review({ interval: 30, due: new Date(2026, 9, 24, 9, 0).toISOString() }),
      d: review({ interval: 2 }),
    };
    expect(deckStats(cards, states, now)).toEqual({
      unseen: 1,
      learning: 1,
      young: 1,
      mature: 1,
      dueTomorrow: 1,
    });
  });
});
