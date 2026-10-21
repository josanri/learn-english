import { countWords, lengthState, parseWordTarget, straightenQuotes } from './text';
import type { ChecklistItem, TaskSpec } from './types';

/** Words and phrases that link ideas. A few different ones are expected at B1. */
export const CONNECTORS: readonly string[] = [
  'and',
  'but',
  'because',
  'so',
  'then',
  'also',
  'however',
  'although',
  'while',
  'when',
  'after',
  'before',
  'first',
  'finally',
  'next',
  'later',
  'afterwards',
  'suddenly',
  'unfortunately',
  'luckily',
  'in the end',
  'at first',
  'for example',
  'for instance',
  'on the other hand',
  'in addition',
  'as well',
  'if',
  'since',
  'which',
  'who',
  'that is why',
  'of course',
  'besides',
  'meanwhile',
  'at last',
  'by the way',
];

const GREETING = /^\s*(dear|hi|hello|hey)\b/i;
const CLOSING =
  /\b(best wishes|kind regards|best regards|regards|yours|love|cheers|take care|all the best|speak soon|write soon|see you|looking forward|bye|many thanks|thanks again)\b/i;

function tokens(text: string): string[] {
  return (
    straightenQuotes(text)
      .toLowerCase()
      .match(/[a-z]+(?:'[a-z]+)?/g) ?? []
  );
}

/** True when the keyword (the start of a word, or a phrase) appears in the text. */
export function hasKeyword(lowerText: string, words: readonly string[], keyword: string): boolean {
  const key = keyword.toLowerCase();
  if (/[^a-z]/.test(key)) return lowerText.includes(key);
  return words.some((w) => w.startsWith(key));
}

/** Verb forms found in the text, as a rough measure of variety. */
export function tenseVariety(text: string): string[] {
  const t = straightenQuotes(text).toLowerCase();
  const found: string[] = [];
  const test = (name: string, regex: RegExp) => {
    if (regex.test(t)) found.push(name);
  };
  test('past simple', /\b(was|were|went|had|did|saw|made|took|came|got|\w+ed)\b/);
  test(
    'present simple',
    /\b(i|you|we|they) (am|are|have|like|love|live|think|go|want|know|need|enjoy)\b|\b(he|she|it) (is|has|likes|lives|goes|works)\b|\bit's\b|\bi'm\b/,
  );
  test('future', /\b(will|won't|going to)\b|'ll\b/);
  test(
    'present perfect',
    /\b(have|has|haven't|hasn't) (\w+ed|been|gone|seen|done|made|taken|had|met|read|written|never|ever|just|already)\b|'ve (\w+ed|been|gone|seen|done|made|taken|had|met|read|written|never|ever|just|already)\b/,
  );
  test('present continuous', /\b(am|is|are) \w+ing\b|'(m|re) \w+ing\b/);
  test('modal verbs', /\b(can|could|should|would|might|must|may)\b/);
  test('conditional', /\bif\b.{0,40}\b(will|would|could|can)\b/);
  return found;
}

function normalise(text: string): string {
  return straightenQuotes(text)
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The checklist shown under the task. Everything here is a hint, never a mark. */
export function analyzeTask(text: string, task: TaskSpec | null): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  if (!task) return out;
  const lower = straightenQuotes(text).toLowerCase();
  const words = tokens(text);
  const count = countWords(text);
  const target = parseWordTarget(task.wordCount);
  const hasText = count > 0;

  for (const [i, point] of task.contentPoints.entries()) {
    const keywordFound = point.keywords.some((k) => hasKeyword(lower, words, k));
    const questionOk = !point.question || text.includes('?');
    const done = hasText && keywordFound && questionOk;
    out.push({
      id: `point-${i}`,
      kind: 'points',
      label: point.text,
      status: done ? 'done' : 'todo',
      detail: !hasText
        ? undefined
        : done
          ? 'Looks covered.'
          : point.question && keywordFound
            ? 'Add a question with a question mark.'
            : 'Not found yet. Check that you answered this point.',
    });
  }

  const kind = task.kind;
  if (kind === 'email' || kind === 'letter') {
    out.push({
      id: 'greeting',
      kind: 'form',
      label: 'Start with a greeting such as "Dear Alex," or "Hi Sam,".',
      status: GREETING.test(text) ? 'done' : 'todo',
    });
    out.push({
      id: 'closing',
      kind: 'form',
      label: 'End with a closing such as "Best wishes," or "See you soon!".',
      status: CLOSING.test(text.trim().slice(-120)) ? 'done' : 'todo',
    });
  }
  if (kind === 'story' && task.openingSentence) {
    out.push({
      id: 'opening',
      kind: 'form',
      label: 'Begin with the sentence given in the task.',
      status: normalise(text).startsWith(normalise(task.openingSentence)) ? 'done' : 'todo',
    });
  }

  const state = lengthState(count, target);
  out.push({
    id: 'length',
    kind: 'form',
    label: `Write ${task.wordCount}.`,
    status: state === 'good' ? 'done' : 'todo',
    detail:
      state === 'empty'
        ? undefined
        : state === 'short'
          ? `You have ${count} words. Add a little more.`
          : state === 'long'
            ? `You have ${count} words. Try to be more concise.`
            : `${count} words.`,
  });

  if (count >= 70 && kind !== 'message') {
    const paragraphs = text.split(/\n/).filter((p) => p.trim().length > 0).length;
    out.push({
      id: 'paragraphs',
      kind: 'form',
      label: 'Use paragraphs to organise your ideas.',
      status: paragraphs >= 2 ? 'done' : 'todo',
      detail: paragraphs >= 2 ? `${paragraphs} paragraphs.` : 'Start a new line for each new idea.',
    });
  }

  if (count >= 40) {
    const wordSet = new Set(words);
    const used = CONNECTORS.filter((c) => (c.includes(' ') ? lower.includes(c) : wordSet.has(c)));
    out.push({
      id: 'connectors',
      kind: 'form',
      label: 'Link your ideas with connecting words (because, but, then, however...).',
      status: used.length >= 3 ? 'done' : 'todo',
      detail: `${used.length} different linking ${used.length === 1 ? 'word' : 'words'} found.`,
    });
  }

  if (count >= 60) {
    const tenses = tenseVariety(text);
    out.push({
      id: 'tenses',
      kind: 'form',
      label: 'Use a variety of verb forms (past, present, future, perfect, modals).',
      status: tenses.length >= 3 ? 'done' : 'todo',
      detail: tenses.length > 0 ? `Found: ${tenses.join(', ')}.` : undefined,
    });
  }
  return out;
}
