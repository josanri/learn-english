/** Small text helpers shared by the checker and the writing screens. */

/** Words as the learner counts them: runs of non-space characters. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Target length of a task, parsed from its `wordCount` text. `min`/`max` are the "good" range. */
export interface WordTarget {
  /** The number to show ("about 100"). */
  label: string;
  min: number;
  max: number;
}

const NUMBER = /\d+/g;

/**
 * Reads "about 100 words", "20 to 50 words", "at least 150 words" or "100-120 words".
 * "about N" accepts 80% to 130% of N, a range accepts exactly that range (with a little room above),
 * and "at least N" has no upper limit.
 */
export function parseWordTarget(text: string): WordTarget {
  const numbers = (text.match(NUMBER) ?? []).map(Number);
  const first = numbers[0];
  if (first === undefined) return { label: text, min: 1, max: Number.POSITIVE_INFINITY };
  const second = numbers[1];
  if (second !== undefined && second > first) {
    return {
      label: `${first} to ${second}`,
      min: first,
      max: Math.round(second * 1.1),
    };
  }
  if (/at least|minimum|more than/i.test(text)) {
    return { label: `at least ${first}`, min: first, max: Number.POSITIVE_INFINITY };
  }
  return { label: `about ${first}`, min: Math.round(first * 0.8), max: Math.round(first * 1.3) };
}

export type LengthState = 'empty' | 'short' | 'good' | 'long';

export function lengthState(words: number, target: WordTarget): LengthState {
  if (words === 0) return 'empty';
  if (words < target.min) return 'short';
  if (words > target.max) return 'long';
  return 'good';
}

/** Every word of a text (letters and inner apostrophes), for dictionaries and exceptions. */
export function wordsOf(text: string): string[] {
  return text.match(/[\p{L}]+(?:['’][\p{L}]+)*/gu) ?? [];
}

/** Replaces curly apostrophes by straight ones without changing any offset. */
export function straightenQuotes(text: string): string {
  return text.replace(/[‘’ʼ]/g, "'");
}
