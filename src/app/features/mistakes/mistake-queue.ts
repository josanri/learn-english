import type { CardState, MistakeState } from '../../models/practice';
import { MATURE_INTERVAL, schedule } from '../flashcards/srs';

/**
 * "My mistakes": items the learner got wrong in an exam or in the phrasal verb trainer, reviewed on
 * the flashcard schedule (`srs.ts`). A right answer counts as Good and a wrong one as Again. An item
 * whose interval reaches `MATURE_INTERVAL` days is fixed and leaves the queue.
 */

export function isFixed(mistake: MistakeState): boolean {
  return mistake.card?.status === 'review' && mistake.card.interval >= MATURE_INTERVAL;
}

/** Due now: never reviewed, or its review time has come. Fixed items are never due. */
export function isDue(mistake: MistakeState, now: Date): boolean {
  if (isFixed(mistake)) return false;
  return !mistake.card || new Date(mistake.card.due).getTime() <= now.getTime();
}

/** Ids of the mistakes due now, oldest mistake first. */
export function dueMistakes(mistakes: Readonly<Record<string, MistakeState>>, now: Date): string[] {
  return Object.entries(mistakes)
    .filter(([, m]) => isDue(m, now))
    .sort(([, a], [, b]) => a.added.localeCompare(b.added))
    .map(([id]) => id);
}

export interface MistakeCounts {
  /** Waiting for a review now. */
  due: number;
  /** In the queue but not due yet. */
  waiting: number;
  fixed: number;
}

export function mistakeCounts(
  mistakes: Readonly<Record<string, MistakeState>>,
  now: Date,
): MistakeCounts {
  const counts: MistakeCounts = { due: 0, waiting: 0, fixed: 0 };
  for (const m of Object.values(mistakes)) {
    if (isFixed(m)) counts.fixed++;
    else if (isDue(m, now)) counts.due++;
    else counts.waiting++;
  }
  return counts;
}

/** New schedule after a review answer. */
export function gradeMistake(
  mistake: MistakeState,
  correct: boolean,
  now: Date,
  random?: () => number,
): CardState {
  return schedule(mistake.card, correct ? 'good' : 'again', now, random);
}
