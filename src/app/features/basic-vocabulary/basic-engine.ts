import type { BasicWord, PhrasalProgress } from '../../models/practice';
import {
  isLearnt,
  parseExample,
  phrasalWeight,
  plainExample,
  shuffle,
  type Choice,
  type GapPart,
} from '../phrasal-verbs/phrasal-engine';

export { isLearnt, parseExample, plainExample, shuffle, type Choice, type GapPart };

/**
 * Exercises of the basic vocabulary trainer: definition to word, word to definition, the example
 * with a gap, the spoken word to its spelling, and the definition to a typed word.
 */
export type BasicMode = 'word' | 'meaning' | 'gap' | 'listen' | 'spell';

export const BASIC_SESSION_SIZE = 10;
const OPTION_COUNT = 4;

/** The example with the word blanked. */
export function gapForWord(word: BasicWord): GapPart[] {
  return parseExample(word.e).map((p) => ({ text: p.text, gap: p.marked }));
}

/** Lowercase letters and digits only, so `T-shirt`, `t shirt` and `tshirt` are the same answer. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function spellingIsRight(typed: string, word: BasicWord): boolean {
  const answer = normalizeAnswer(typed);
  return answer.length > 0 && answer === normalizeAnswer(word.w);
}

/** First letter and one blank per other letter (`d _ _ _ _` for `dress`); spaces and hyphens stay. */
export function spellingHint(word: BasicWord): string {
  return [...word.w].map((char, i) => (i > 0 && /[a-z]/i.test(char) ? '_' : char)).join(' ');
}

/** Words that must not be offered as wrong answers for `word`: itself, same text, and `similar`. */
function blocked(word: BasicWord, all: readonly BasicWord[]): Set<string> {
  const ids = new Set<string>([word.id, ...(word.similar ?? [])]);
  const text = word.w.toLowerCase();
  for (const other of all) {
    if (other.w.toLowerCase() === text || other.similar?.includes(word.id)) ids.add(other.id);
  }
  return ids;
}

/** Pick `count` items from `pool` without repeats. */
function sample<T>(pool: readonly T[], count: number, random: () => number): T[] {
  return shuffle(pool, random).slice(0, count);
}

/**
 * Four options: the right one and three wrong ones from the same topic (same group first, so the
 * options look alike). Labels are definitions in the meaning exercise and words in the others.
 */
export function basicChoices(
  word: BasicWord,
  mode: Exclude<BasicMode, 'spell'>,
  all: readonly BasicWord[],
  random: () => number = Math.random,
): Choice[] {
  const exclude = blocked(word, all);
  const label = (w: BasicWord) => (mode === 'meaning' ? w.d : w.w);
  const right = label(word);
  const usable = all.filter((w) => !exclude.has(w.id) && label(w) !== right);
  const sameGroup = usable.filter((w) => w.t === word.t && w.g === word.g);
  const sameTopic = usable.filter((w) => w.t === word.t && w.g !== word.g);
  const others = usable.filter((w) => w.t !== word.t);
  const wrong: string[] = [];
  for (const pool of [sameGroup, sameTopic, others]) {
    for (const w of sample(pool, OPTION_COUNT, random)) {
      if (wrong.length < OPTION_COUNT - 1 && !wrong.includes(label(w))) wrong.push(label(w));
    }
  }
  return shuffle(
    [{ label: right, correct: true }, ...wrong.map((l) => ({ label: l, correct: false }))],
    random,
  );
}

export interface BasicSelectOptions {
  count?: number;
  onlyIds?: readonly string[];
  random?: () => number;
}

/** Picks words for a session without repeats; new and missed words come up more, learnt ones less. */
export function selectBasic(
  words: readonly BasicWord[],
  progress: Readonly<Record<string, PhrasalProgress>>,
  options: BasicSelectOptions = {},
): BasicWord[] {
  const { count = BASIC_SESSION_SIZE, onlyIds, random = Math.random } = options;
  const pool = words.filter((w) => !onlyIds || onlyIds.includes(w.id));
  const chosen: BasicWord[] = [];
  while (chosen.length < count && pool.length > 0) {
    const weights = pool.map((w) => phrasalWeight(progress[w.id]));
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

/** Practised words that were missed at least as often as they were answered right. */
export function basicToReview(
  words: readonly BasicWord[],
  progress: Readonly<Record<string, PhrasalProgress>>,
): BasicWord[] {
  return words.filter((w) => {
    const p = progress[w.id];
    return p !== undefined && p.wrong > 0 && p.wrong >= p.right && !isLearnt(p);
  });
}

export interface TopicProgress {
  total: number;
  learnt: number;
  practised: number;
}

export function topicProgress(
  words: readonly BasicWord[],
  progress: Readonly<Record<string, PhrasalProgress>>,
): TopicProgress {
  return {
    total: words.length,
    learnt: words.filter((w) => isLearnt(progress[w.id])).length,
    practised: words.filter((w) => progress[w.id] !== undefined).length,
  };
}

/** The exercise order of a mixed session; `listen` only when the browser can speak. */
export function mixedModes(canSpeak: boolean): BasicMode[] {
  return canSpeak
    ? ['word', 'gap', 'listen', 'meaning', 'spell']
    : ['word', 'gap', 'meaning', 'spell'];
}
