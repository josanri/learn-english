import type { Issue } from './types';

/** Words that end with a full stop without ending the sentence. */
const ABBREVIATIONS = new Set([
  'e.g',
  'i.e',
  'etc',
  'vs',
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'st',
  'a.m',
  'p.m',
  'no',
  'approx',
  'tel',
  'ps',
  'p.s',
]);

/**
 * Sentence starts that begin with a lower-case letter. Done in code rather than as a rule because
 * it needs to skip abbreviations ("e.g. tea"), numbers ("No. 5"), ellipses and list-like lines.
 */
export function checkCapitals(text: string): Issue[] {
  const issues: Issue[] = [];
  const add = (index: number) => {
    const letter = text.charAt(index);
    const start = index;
    const end = index + 1;
    issues.push({
      id: `capital-letter:${start}:${end}`,
      ruleId: 'capital-letter',
      group: 'grammar',
      severity: 'error',
      source: 'rules',
      category: 'Capital letters',
      start,
      end,
      original: letter,
      message: 'Start a sentence with a capital letter.',
      suggestions: [letter.toUpperCase()],
    });
  };

  // The very first letter of the text.
  const first = /^\s*([a-z])/.exec(text);
  if (first?.[1] !== undefined) add(first[0].length - 1);

  // After . ! ? (and closing quotes or brackets), then spaces, or after a line break.
  const regex = /([.!?]+)(["')\]]*)(\s+)([a-z])/g;
  for (const match of text.matchAll(regex)) {
    const letterIndex = match.index + match[0].length - 1;
    const marks = match[1] ?? '';
    if (
      marks.length >= 2 &&
      marks.startsWith('.') &&
      !marks.includes('?') &&
      !marks.includes('!')
    ) {
      continue; // ellipsis
    }
    if (marks === '.') {
      const before = text.slice(0, match.index);
      const lastWord = /([A-Za-z.]+|\d+)$/.exec(before)?.[1]?.toLowerCase() ?? '';
      if (ABBREVIATIONS.has(lastWord) || /^\d+$/.test(lastWord) || lastWord.length === 1) continue;
    }
    add(letterIndex);
  }

  // A new line after a sentence end or a comma (greetings such as "Hi Alex,").
  const lines = /([.!?,:])[ \t]*\n\s*([a-z])/g;
  for (const match of text.matchAll(lines)) {
    const letterIndex = match.index + match[0].length - 1;
    if (!issues.some((i) => i.start === letterIndex)) add(letterIndex);
  }
  return issues.sort((a, b) => a.start - b.start);
}
