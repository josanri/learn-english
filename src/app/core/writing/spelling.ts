import { straightenQuotes } from './text';
import type { Issue } from './types';

/** The part of a Hunspell checker the app uses (`nspell` implements it). */
export interface Speller {
  correct(word: string): boolean;
  suggest(word: string): string[];
}

const WORD = /[\p{L}]+(?:'[\p{L}]+)*/gu;
/** Addresses are not words: skip anything that looks like a link or an e-mail address. */
const ADDRESS = /(?:https?:\/\/|www\.)\S+|\S+@\S+/gi;
/** Looking up suggestions is the slow part of spell checking, so it is capped per check. */
export const MAX_SUGGESTION_LOOKUPS = 40;

function matchCase(original: string, suggestion: string): string {
  const first = original.charAt(0);
  if (original.length > 1 && original === original.toUpperCase()) return suggestion.toUpperCase();
  if (first !== first.toLowerCase()) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

function isSentenceStart(text: string, index: number): boolean {
  const before = text.slice(0, index).trimEnd();
  return before === '' || /[.!?:]["')]*$/.test(before) || /\n\s*$/.test(text.slice(0, index));
}

/**
 * Finds misspelt words. Not reported: one-letter words, numbers, acronyms in capitals, links and
 * addresses, words in `exceptions` (names from the task) and capitalised words in the middle of a
 * sentence, which are most likely names of people and places.
 */
export function checkSpelling(
  rawText: string,
  speller: Speller,
  exceptions: ReadonlySet<string>,
): Issue[] {
  const text = straightenQuotes(rawText);
  const skip: [number, number][] = [];
  for (const m of text.matchAll(ADDRESS)) skip.push([m.index, m.index + m[0].length]);

  const issues: Issue[] = [];
  const cache = new Map<string, string[]>();
  let lookups = 0;
  for (const m of text.matchAll(WORD)) {
    const word = m[0];
    const start = m.index;
    const end = start + word.length;
    if (word.length < 2) continue;
    if (skip.some(([a, b]) => start >= a && end <= b)) continue;
    if (word === word.toUpperCase() && word.length <= 6) continue; // acronyms: UK, PET, FBI
    if (exceptions.has(word.toLowerCase())) continue;
    if (speller.correct(word)) continue;
    const lower = word.toLowerCase();
    if (lower !== word && speller.correct(lower)) continue; // "Hello" at the start of a sentence
    const startsUpper = word.charAt(0) !== lower.charAt(0);
    if (startsUpper && !isSentenceStart(text, start)) continue; // most likely a name
    if (startsUpper && word.slice(1) !== word.slice(1).toLowerCase()) continue; // McDonald

    let suggestions = cache.get(lower);
    if (suggestions === undefined) {
      suggestions = lookups < MAX_SUGGESTION_LOOKUPS ? speller.suggest(word).slice(0, 4) : [];
      lookups++;
      cache.set(lower, suggestions);
    }
    const original = rawText.slice(start, end);
    issues.push({
      id: `spelling:${start}:${end}`,
      ruleId: 'spelling',
      group: 'spelling',
      severity: 'error',
      source: 'spelling',
      category: 'Spelling',
      start,
      end,
      original,
      message: `"${original}" may be misspelt.`,
      suggestions: suggestions.map((s) => matchCase(word, s)),
    });
  }
  return issues;
}
