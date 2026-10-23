import type { PhrasalProgress, PhrasalVerb } from '../../models/practice';

/** Exercises of the phrasal verb trainer. */
export type PhrasalMode = 'meaning' | 'gap' | 'particle';

export const PHRASAL_SESSION_SIZE = 12;
/** Right answers in a row after which a phrasal verb counts as learnt. */
export const LEARNT_STREAK = 3;
const OPTION_COUNT = 4;

/** A piece of an example sentence; `marked` pieces are the words of the phrasal verb. */
export interface ExamplePart {
  text: string;
  marked: boolean;
}

/** Splits `I [[gave up]] sugar` into plain and marked pieces. */
export function parseExample(example: string): ExamplePart[] {
  const parts: ExamplePart[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let last = 0;
  for (let match = pattern.exec(example); match; match = pattern.exec(example)) {
    if (match.index > last) parts.push({ text: example.slice(last, match.index), marked: false });
    parts.push({ text: match[1], marked: true });
    last = match.index + match[0].length;
  }
  if (last < example.length) parts.push({ text: example.slice(last), marked: false });
  return parts;
}

/** The sentence without brackets. */
export function plainExample(example: string): string {
  return example.replace(/\[\[([^\]]+)\]\]/g, '$1');
}

/** Words after the verb: `out of` for `run out of`. */
export function particleOf(verb: PhrasalVerb): string {
  return verb.verb.split(' ').slice(1).join(' ');
}

/** First word of the base form: `run` for `run out of`. */
export function headOf(verb: PhrasalVerb): string {
  return verb.verb.split(' ')[0];
}

/** One piece of a sentence with a gap. `gap` pieces are drawn as a blank. */
export interface GapPart {
  text: string;
  gap: boolean;
}

/** The example with every word of the phrasal verb blanked (one gap per marked piece). */
export function gapForVerb(verb: PhrasalVerb): GapPart[] {
  return parseExample(verb.example).map((p) => ({ text: p.text, gap: p.marked }));
}

/**
 * The example with only the particles blanked: the verb itself stays, in the form the sentence
 * uses (`I ran ___ milk.`). Consecutive particle words share one gap.
 */
export function gapForParticle(verb: PhrasalVerb): GapPart[] {
  const result: GapPart[] = [];
  let seenVerb = false;
  for (const part of parseExample(verb.example)) {
    if (!part.marked) {
      result.push({ text: part.text, gap: false });
      continue;
    }
    if (!seenVerb) {
      seenVerb = true;
      const [first, ...rest] = part.text.split(' ');
      result.push({ text: first, gap: false });
      if (rest.length > 0)
        result.push({ text: ` `, gap: false }, { text: rest.join(' '), gap: true });
      continue;
    }
    result.push({ text: part.text, gap: true });
  }
  return result;
}

/** Common particles used to make wrong options in the particle exercise. */
const PARTICLES = [
  'up',
  'down',
  'out',
  'off',
  'on',
  'in',
  'over',
  'back',
  'away',
  'around',
  'through',
  'after',
  'into',
  'for',
  'with',
  'by',
];

export interface Choice {
  label: string;
  correct: boolean;
}

/** Pick `count` items from `pool` without repeats. */
function sample<T>(pool: readonly T[], count: number, random: () => number): T[] {
  const copy = [...pool];
  const picked: T[] = [];
  while (picked.length < count && copy.length > 0) {
    picked.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
  }
  return picked;
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  return sample(items, items.length, random);
}

/**
 * Entries that must not be offered as wrong answers for `verb`: the same base form with another
 * meaning (two senses of `take off`) and entries marked as similar in either direction.
 */
function blocked(verb: PhrasalVerb, all: readonly PhrasalVerb[]): Set<string> {
  const ids = new Set<string>([verb.id, ...(verb.similar ?? [])]);
  for (const other of all) {
    if (other.verb === verb.verb || other.similar?.includes(verb.id)) ids.add(other.id);
  }
  return ids;
}

/** Four options for an exercise: the right one and three wrong ones that cannot also be right. */
export function choicesFor(
  verb: PhrasalVerb,
  mode: PhrasalMode,
  all: readonly PhrasalVerb[],
  random: () => number = Math.random,
): Choice[] {
  const exclude = blocked(verb, all);
  const others = all.filter((v) => !exclude.has(v.id));
  let wrong: string[];
  let right: string;
  if (mode === 'meaning') {
    right = verb.meaning;
    const meanings = [...new Set(others.map((v) => v.meaning))].filter((m) => m !== right);
    wrong = sample(meanings, OPTION_COUNT - 1, random);
  } else if (mode === 'gap') {
    right = verb.verb;
    const forms = [...new Set(others.map((v) => v.verb))].filter((f) => f !== right);
    // Prefer verbs with the same number of words, so the length of the answer gives nothing away.
    const size = right.split(' ').length;
    const same = forms.filter((f) => f.split(' ').length === size);
    wrong = sample(same.length >= OPTION_COUNT - 1 ? same : forms, OPTION_COUNT - 1, random);
  } else {
    right = particleOf(verb);
    const head = headOf(verb);
    // A particle that makes another real phrasal verb with the same head could also be right.
    const taken = new Set(all.filter((v) => headOf(v) === head).map(particleOf));
    const size = right.split(' ').length;
    const multi = [...new Set(all.map(particleOf))].filter((p) => p.split(' ').length === size);
    const pool = (size === 1 ? PARTICLES : multi).filter((p) => p !== right && !taken.has(p));
    wrong = sample(pool, OPTION_COUNT - 1, random);
  }
  return shuffle(
    [{ label: right, correct: true }, ...wrong.map((label) => ({ label, correct: false }))],
    random,
  );
}

/** How likely a phrasal verb is to be picked: new and missed verbs come up more, learnt ones less. */
export function phrasalWeight(progress: PhrasalProgress | undefined): number {
  if (!progress) return 2;
  const base = Math.max(0.25, 1 + 2 * progress.wrong - 0.4 * progress.right);
  return progress.streak >= LEARNT_STREAK ? base * 0.3 : base;
}

export interface PhrasalSelectOptions {
  count?: number;
  /** Group id, or null for every group. */
  group?: string | null;
  onlyIds?: readonly string[];
  random?: () => number;
}

/** Picks verbs for a session without repeats, favouring new and weak ones. */
export function selectPhrasal(
  verbs: readonly PhrasalVerb[],
  progress: Readonly<Record<string, PhrasalProgress>>,
  options: PhrasalSelectOptions = {},
): PhrasalVerb[] {
  const { count = PHRASAL_SESSION_SIZE, group = null, onlyIds, random = Math.random } = options;
  const pool = verbs.filter(
    (v) => (!group || v.group === group) && (!onlyIds || onlyIds.includes(v.id)),
  );
  const chosen: PhrasalVerb[] = [];
  while (chosen.length < count && pool.length > 0) {
    const weights = pool.map((v) => phrasalWeight(progress[v.id]));
    let target = random() * weights.reduce((a, b) => a + b, 0);
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

export function isLearnt(progress: PhrasalProgress | undefined): boolean {
  return (progress?.streak ?? 0) >= LEARNT_STREAK;
}

/** Practised verbs that were missed at least as often as they were answered right. */
export function phrasalToReview(
  verbs: readonly PhrasalVerb[],
  progress: Readonly<Record<string, PhrasalProgress>>,
): PhrasalVerb[] {
  return verbs.filter((v) => {
    const p = progress[v.id];
    return p !== undefined && p.wrong > 0 && p.wrong >= p.right && !isLearnt(p);
  });
}
