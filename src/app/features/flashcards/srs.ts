import { localDay } from '../../core/state-migrations';
import type { CardState, Flashcard } from '../../models/practice';

/**
 * Spaced repetition for the flashcards. A simplified SM-2 schedule with learning steps, close to
 * what Anki does by default:
 *
 * - New and learning cards move through short steps (1 min, then 10 min) before they graduate to a
 *   one-day interval. "Easy" skips the steps and graduates the card straight to four days.
 * - Review cards grow by their ease factor (2.5 at the start): 1 day, then about 3, 8, 20, 50 days.
 *   "Hard" grows the interval by 20 % and lowers the ease; "Easy" grows it more and raises the ease.
 * - A forgotten review card ("Again") goes back to a ten-minute relearning step and its interval
 *   shrinks, so it comes back soon.
 *
 * Intervals of three days or more get a little random spread (fuzz) so that cards learnt on the same
 * day do not all come back on the same day.
 */

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'];

/** Learning steps for new cards, in minutes. */
export const LEARNING_STEPS = [1, 10];
/** Relearning steps for forgotten review cards, in minutes. */
export const RELEARNING_STEPS = [10];
export const GRADUATING_INTERVAL = 1;
export const EASY_INTERVAL = 4;
export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL = 3650;
/** Interval (days) from which a card counts as "mature" (well learnt). */
export const MATURE_INTERVAL = 21;
/** Learning cards due within this many minutes may be shown early when nothing else is left. */
export const LEARN_AHEAD_MINUTES = 20;
/** Choices for the number of new cards a day (the default is in `DEFAULT_NEW_CARDS_PER_DAY`). */
export const NEW_PER_DAY_OPTIONS = [5, 10, 20, 30, 50];

const MINUTE = 60_000;
const DAY = 86_400_000;

/** A brand-new card as the engine sees it (it has no saved record yet). */
function freshState(now: Date): CardState {
  const iso = now.toISOString();
  return {
    status: 'learning',
    step: 0,
    ease: START_EASE,
    interval: 0,
    due: iso,
    reps: 0,
    lapses: 0,
    last: iso,
    added: localDay(now) ?? '',
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clampInterval = (days: number) => Math.min(MAX_INTERVAL, Math.max(1, Math.round(days)));

/** Adds a small spread to intervals of three days or more. `random` returns a number in [0, 1). */
export function fuzz(days: number, random: () => number = Math.random): number {
  if (days < 3) return days;
  const spread = Math.max(1, Math.round(days * 0.05));
  return clampInterval(days + Math.round((random() * 2 - 1) * spread));
}

/** Next intervals of a review card, in days, before fuzz. */
function reviewIntervals(card: CardState, now: Date): Record<'hard' | 'good' | 'easy', number> {
  const elapsed = Math.max(0, (now.getTime() - new Date(card.last).getTime()) / DAY);
  const overdue = Math.max(0, elapsed - card.interval);
  const hard = clampInterval(Math.max(card.interval + 1, card.interval * 1.2));
  const good = clampInterval(Math.max(hard + 1, (card.interval + overdue / 2) * card.ease));
  const easy = clampInterval(Math.max(good + 1, (card.interval + overdue) * card.ease * 1.3));
  return { hard, good, easy };
}

/**
 * The new state of a card after an answer. `card` is undefined for a new card. Pass `random` to
 * make the fuzz predictable in tests.
 */
export function schedule(
  card: CardState | undefined,
  grade: Grade,
  now: Date,
  random: () => number = Math.random,
): CardState {
  const current = card ?? freshState(now);
  const base: CardState = { ...current, reps: current.reps + 1, last: now.toISOString() };
  const inMinutes = (minutes: number) => new Date(now.getTime() + minutes * MINUTE).toISOString();
  const inDays = (days: number) => new Date(now.getTime() + days * DAY).toISOString();
  const graduate = (days: number, ease = base.ease): CardState => ({
    ...base,
    status: 'review',
    step: 0,
    ease,
    interval: days,
    due: inDays(days),
  });

  if (current.status === 'learning' || current.status === 'relearning') {
    const steps = current.status === 'learning' ? LEARNING_STEPS : RELEARNING_STEPS;
    const step = Math.min(current.step, steps.length - 1);
    // A relearning card goes back to the interval it had shrunk to; a new card to one day.
    const graduation =
      current.status === 'relearning' ? Math.max(1, current.interval) : GRADUATING_INTERVAL;
    switch (grade) {
      case 'again':
        return { ...base, step: 0, due: inMinutes(steps[0]) };
      case 'hard': {
        // Halfway between this step and the next one (or 1.5 times the last step).
        const next = steps[step + 1];
        const delay = next !== undefined ? (steps[step] + next) / 2 : steps[step] * 1.5;
        return { ...base, step, due: inMinutes(delay) };
      }
      case 'good':
        if (step + 1 < steps.length)
          return { ...base, step: step + 1, due: inMinutes(steps[step + 1]) };
        return graduate(graduation);
      case 'easy':
        return current.status === 'learning' ? graduate(EASY_INTERVAL) : graduate(graduation + 1);
    }
  }

  const next = reviewIntervals(current, now);
  switch (grade) {
    case 'again':
      return {
        ...base,
        status: 'relearning',
        step: 0,
        lapses: current.lapses + 1,
        ease: round2(Math.max(MIN_EASE, current.ease - 0.2)),
        interval: clampInterval(current.interval * 0.3),
        due: inMinutes(RELEARNING_STEPS[0]),
      };
    case 'hard':
      return graduate(fuzz(next.hard, random), round2(Math.max(MIN_EASE, current.ease - 0.15)));
    case 'good':
      return graduate(fuzz(next.good, random));
    case 'easy':
      return graduate(fuzz(next.easy, random), round2(current.ease + 0.15));
  }
}

/** Time until the card is due again for each answer, without fuzz (shown on the buttons). */
export function previewDelays(card: CardState | undefined, now: Date): Record<Grade, number> {
  const steady = () => 0.5; // middle of the fuzz range: no spread
  const result = {} as Record<Grade, number>;
  for (const grade of GRADES) {
    result[grade] = new Date(schedule(card, grade, now, steady).due).getTime() - now.getTime();
  }
  return result;
}

/** Short label for a delay in milliseconds: `1 min`, `10 min`, `1 d`, `3 wk`, `2 mo`, `1.5 yr`. */
export function formatDelay(ms: number): string {
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(ms / DAY);
  if (days < 14) return `${days} d`;
  if (days < 60) return `${Math.round(days / 7)} wk`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${years} yr`;
}

/** End of the local day of `now` (the queue shows every review card due before it). */
export function endOfDay(now: Date): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Number from a string, stable across sessions; used to mix the order of new cards and of mistakes. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface QueueOptions {
  newPerDay: number;
  /** Only introduce new cards from this topic (reviews of every topic are always shown). */
  topic?: string | null;
}

export interface Queue {
  /** Learning and relearning cards due now, oldest first. */
  learning: Flashcard[];
  /** Review cards due today, most overdue first. */
  reviews: Flashcard[];
  /** New cards that can still be introduced today. */
  fresh: Flashcard[];
  /** Learning cards that will be due later (soonest first). */
  waiting: { card: Flashcard; due: Date }[];
  /** New cards already introduced today. */
  newToday: number;
}

export function buildQueue(
  cards: readonly Flashcard[],
  states: Record<string, CardState>,
  now: Date,
  options: QueueOptions,
): Queue {
  const today = localDay(now);
  const end = endOfDay(now).getTime();
  const learning: { card: Flashcard; due: number }[] = [];
  const waiting: { card: Flashcard; due: Date }[] = [];
  const reviews: { card: Flashcard; due: number }[] = [];
  const unseen: Flashcard[] = [];
  let newToday = 0;
  for (const card of cards) {
    const state = states[card.id];
    if (!state) {
      if (!options.topic || card.t === options.topic) unseen.push(card);
      continue;
    }
    if (state.added === today) newToday += 1;
    const due = new Date(state.due).getTime();
    if (state.status === 'review') {
      if (due <= end) reviews.push({ card, due });
    } else if (due <= now.getTime()) {
      learning.push({ card, due });
    } else {
      waiting.push({ card, due: new Date(due) });
    }
  }
  learning.sort((a, b) => a.due - b.due);
  reviews.sort((a, b) => a.due - b.due);
  waiting.sort((a, b) => a.due.getTime() - b.due.getTime());
  unseen.sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id));
  const allowed = Math.max(0, options.newPerDay - newToday);
  return {
    learning: learning.map((x) => x.card),
    reviews: reviews.map((x) => x.card),
    fresh: unseen.slice(0, allowed),
    waiting,
    newToday,
  };
}

/**
 * The card to show next: learning cards that are due, then reviews and new cards mixed (one new
 * card after every three reviews), then learning cards that are due within the next twenty
 * minutes. Returns null when there is nothing left for now.
 */
export function nextCard(queue: Queue, now: Date, answeredToday: number): Flashcard | null {
  if (queue.learning.length > 0) return queue.learning[0];
  const preferNew =
    queue.fresh.length > 0 && (queue.reviews.length === 0 || answeredToday % 4 === 3);
  if (preferNew) return queue.fresh[0];
  if (queue.reviews.length > 0) return queue.reviews[0];
  const ahead = queue.waiting[0];
  if (ahead && ahead.due.getTime() - now.getTime() <= LEARN_AHEAD_MINUTES * MINUTE) {
    return ahead.card;
  }
  return null;
}

/**
 * Splits an example around the first word of the headword so it can be shown in bold. Matches
 * inflected forms (`borrowed` for `borrow`, `applied` for `apply`) by comparing the stem.
 */
export function highlightWord(
  sentence: string,
  word: string,
): { before: string; match: string; after: string } | null {
  const first = word.split(/[\s/(]/)[0].toLowerCase();
  if (!first) return null;
  const stem = first.length > 4 ? first.slice(0, -2) : first;
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`\\b${escaped}[\\w'-]*`, 'i').exec(sentence);
  if (!match) return null;
  return {
    before: sentence.slice(0, match.index),
    match: match[0],
    after: sentence.slice(match.index + match[0].length),
  };
}

export interface DeckStats {
  /** Cards never studied. */
  unseen: number;
  learning: number;
  /** Review cards with an interval under three weeks. */
  young: number;
  /** Review cards with an interval of three weeks or more. */
  mature: number;
  /** Review cards due tomorrow (local day after today). */
  dueTomorrow: number;
}

export function deckStats(
  cards: readonly Flashcard[],
  states: Record<string, CardState>,
  now: Date,
): DeckStats {
  const endToday = endOfDay(now).getTime();
  const endTomorrow = endToday + DAY;
  const stats: DeckStats = { unseen: 0, learning: 0, young: 0, mature: 0, dueTomorrow: 0 };
  for (const card of cards) {
    const state = states[card.id];
    if (!state) {
      stats.unseen += 1;
      continue;
    }
    if (state.status !== 'review') {
      stats.learning += 1;
      continue;
    }
    if (state.interval >= MATURE_INTERVAL) stats.mature += 1;
    else stats.young += 1;
    const due = new Date(state.due).getTime();
    if (due > endToday && due <= endTomorrow) stats.dueTomorrow += 1;
  }
  return stats;
}
