import type { IrregularVerb, VerbPattern, VerbProgress } from '../../../models/grammar';
import { normalizeAnswer } from '../../exam/engine/scoring';

export type FormKind = 'past' | 'participle';

export const SESSION_SIZE = 10;

/** Which forms are equal: cut-cut-cut is AAA, sing-sang-sung is ABC. */
export function patternOf(verb: IrregularVerb): VerbPattern {
  const { base, past, participle } = verb;
  if (base === past && past === participle) return 'AAA';
  if (base === participle) return 'ABA';
  if (past === participle) return 'ABB';
  return 'ABC';
}

/** The main form first, then the accepted spellings. */
export function acceptedForms(verb: IrregularVerb, kind: FormKind): string[] {
  const main = kind === 'past' ? verb.past : verb.participle;
  return [main, ...(verb.alt?.[kind] ?? [])];
}

/** True when `input` is one of the accepted forms (case, spaces and end punctuation are ignored). */
export function isCorrectForm(verb: IrregularVerb, kind: FormKind, input: string): boolean {
  const typed = normalizeAnswer(input);
  return typed.length > 0 && acceptedForms(verb, kind).some((f) => normalizeAnswer(f) === typed);
}

export interface GapSentence {
  kind: FormKind;
  before: string;
  after: string;
}

/** Splits a sentence at its `{{past}}` or `{{participle}}` marker. Returns null when there is no marker. */
export function splitGap(sentence: string): GapSentence | null {
  const match = /\{\{(past|participle)\}\}/.exec(sentence);
  if (!match) return null;
  return {
    kind: match[1] as FormKind,
    before: sentence.slice(0, match.index),
    after: sentence.slice(match.index + match[0].length),
  };
}

/** The sentence a gap exercise shows for a verb and form. */
export function gapSentenceFor(verb: IrregularVerb, kind: FormKind): GapSentence | null {
  return splitGap(kind === 'past' ? verb.example : verb.exampleParticiple);
}

/** The full sentence with the correct form in place of the marker. */
export function completeSentence(verb: IrregularVerb, kind: FormKind): string {
  const sentence = kind === 'past' ? verb.example : verb.exampleParticiple;
  return sentence.replace(/\{\{(past|participle)\}\}/, acceptedForms(verb, kind)[0]);
}

export function formsLabel(verb: IrregularVerb): string {
  return `${verb.base} – ${verb.past} – ${verb.participle}`;
}

export interface SelectOptions {
  count?: number;
  /** Restrict the pool to these verb ids (for "practise the verbs to review"). */
  onlyIds?: readonly string[];
  /** Returns a number in [0, 1). Replace in tests. */
  random?: () => number;
}

/** How likely a verb is to be picked: wrong answers raise it, right answers and "known" lower it. */
export function verbWeight(progress: VerbProgress | undefined): number {
  if (!progress) return 2; // not practised yet
  const base = Math.max(0.2, 1 + 2 * progress.wrong - 0.5 * progress.right);
  return progress.known ? base * 0.3 : base;
}

/** Picks verbs for a session without repeats; weak verbs come up more often. */
export function selectVerbs(
  verbs: readonly IrregularVerb[],
  progress: Readonly<Record<string, VerbProgress>>,
  options: SelectOptions = {},
): IrregularVerb[] {
  const { count = SESSION_SIZE, onlyIds, random = Math.random } = options;
  const pool = verbs.filter((v) => !onlyIds || onlyIds.includes(v.id));
  const chosen: IrregularVerb[] = [];
  while (chosen.length < count && pool.length > 0) {
    const weights = pool.map((v) => verbWeight(progress[v.id]));
    const total = weights.reduce((a, b) => a + b, 0);
    let target = random() * total;
    let index = 0;
    for (; index < pool.length - 1; index++) {
      target -= weights[index];
      if (target < 0) break;
    }
    chosen.push(pool[index]);
    pool.splice(index, 1);
  }
  return chosen;
}

/** Verbs the learner answered wrongly more often than rightly, and not marked as known. */
export function verbsToReview(
  verbs: readonly IrregularVerb[],
  progress: Readonly<Record<string, VerbProgress>>,
): IrregularVerb[] {
  return verbs.filter((v) => {
    const p = progress[v.id];
    return p !== undefined && !p.known && p.wrong > 0 && p.wrong >= p.right;
  });
}
