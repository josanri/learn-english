import type {
  ChoiceQuestion,
  GapItem,
  GrammarTag,
  PromptedGap,
  StatementItem,
} from '../../../models/exam';

/**
 * Pure scoring helpers. Nothing here depends on Angular: every part type is reduced to a list of
 * `ScoreItem`s (see the part registry) and these functions mark, format and aggregate them.
 */

export type AnswerValue = string | number;
export type Answers = Readonly<Record<string, AnswerValue>>;

/** One markable question. `choice` stores the zero-based option index; `text` stores a string. */
export interface ScoreItem {
  id: string;
  kind: 'choice' | 'text';
  /** Text shown for the item in results (question, statement, gap prompt). */
  prompt: string;
  /** Correct option index (`choice`) or expected string (`text`). */
  correct: number | string;
  /** Other strings that are also right (`text` only). */
  accepted?: readonly string[];
  /** Option labels for `choice`, in order. */
  options?: readonly string[];
  /** Pre-built display labels for `choice` (defaults to `A. option`). */
  optionLabels?: readonly string[];
  /** Closed answer set for `text` items such as letters or true/false: stored value to display label. */
  choices?: readonly { value: string; label: string }[];
  explanation?: string;
  /** Grammar points tested by the item (cloze items). */
  tags?: readonly GrammarTag[];
}

export interface Score {
  correct: number;
  total: number;
  answered: number;
}

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Canonical form used to compare typed answers: case-insensitive, typographic apostrophes and quotes
 * straightened, dashes and hyphens treated as spaces, repeated spaces collapsed and surrounding
 * punctuation ignored. `Well-known`, `well known` and ` WELL  KNOWN. ` are the same answer.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛ʼ´`]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[‐-―−-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:!?'"]+|[\s.,;:!?'"]+$/g, '')
    .trim();
}

export function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  return value.trim().length > 0;
}

export function isCorrect(item: ScoreItem, value: AnswerValue | undefined): boolean {
  if (!isAnswered(value)) return false;
  if (item.kind === 'choice') return Number(value) === item.correct;
  const given = normalizeAnswer(String(value));
  const expected = [String(item.correct), ...(item.accepted ?? [])];
  return expected.some((e) => normalizeAnswer(e) === given);
}

export function scoreItems(items: readonly ScoreItem[], answers: Answers): Score {
  let correct = 0;
  let answered = 0;
  for (const item of items) {
    const value = answers[item.id];
    if (isAnswered(value)) answered++;
    if (isCorrect(item, value)) correct++;
  }
  return { correct, total: items.length, answered };
}

export function percent(score: Pick<Score, 'correct' | 'total'>): number {
  return score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
}

function choiceLabel(item: ScoreItem, index: number): string {
  const custom = item.optionLabels?.[index];
  if (custom) return custom;
  const text = item.options?.[index];
  return text === undefined ? '' : `${LETTERS[index] ?? index + 1}. ${text}`;
}

/** What the learner answered, as text for results screens. */
export function formatAnswer(item: ScoreItem, value: AnswerValue | undefined): string {
  if (!isAnswered(value)) return 'No answer';
  if (item.kind === 'choice') return choiceLabel(item, Number(value)) || String(value);
  const choice = item.choices?.find(
    (c) => normalizeAnswer(c.value) === normalizeAnswer(String(value)),
  );
  return choice?.label ?? String(value).trim();
}

/** The right answer, as text for results screens. */
export function formatCorrect(item: ScoreItem): string {
  if (item.kind === 'choice')
    return choiceLabel(item, Number(item.correct)) || String(item.correct);
  const choice = item.choices?.find((c) => c.value === item.correct);
  return choice?.label ?? String(item.correct);
}

/** Honest, non-official wording for a percentage. Not a CEFR or Cambridge result. */
export function practiceBand(percentage: number): { label: string; hint: string } {
  if (percentage >= 80) return { label: 'Strong', hint: 'Most answers were right.' };
  if (percentage >= 60) return { label: 'Solid', hint: 'A good base. Review the mistakes below.' };
  if (percentage >= 40)
    return { label: 'Getting there', hint: 'Re-read the explanations and retry.' };
  return { label: 'Keep practising', hint: 'Go through each explanation, then try again.' };
}

// ---- Builders used by the part registry ----

export function choiceItems(questions: readonly ChoiceQuestion[]): ScoreItem[] {
  return questions.map((q) => ({
    id: q.id,
    kind: 'choice',
    prompt: q.prompt,
    correct: q.answer,
    options: q.options,
    explanation: q.explanation,
    tags: q.tags,
  }));
}

/** Typed gaps (open cloze, notes, sentence completion). */
export function gapItems(gaps: readonly (GapItem | PromptedGap)[]): ScoreItem[] {
  return gaps.map((g, index) => ({
    id: g.id,
    kind: 'text',
    prompt: 'prompt' in g ? g.prompt : `Gap ${index + 1}`,
    correct: g.answer,
    accepted: g.accepted,
    explanation: g.explanation,
    tags: g.tags,
  }));
}

/** Gaps answered by picking one of lettered options (gapped text, headings, opinions). */
export function letterGapItems(
  gaps: readonly (GapItem | PromptedGap)[],
  labels: readonly string[],
  promptOf: (gap: GapItem | PromptedGap, index: number) => string,
): ScoreItem[] {
  const choices = labels.map((label, i) => ({
    value: LETTERS[i] ?? String(i + 1),
    label: `${LETTERS[i] ?? i + 1}. ${label}`,
  }));
  return gaps.map((g, index) => ({
    id: g.id,
    kind: 'text',
    prompt: promptOf(g, index),
    correct: g.answer.toUpperCase(),
    choices,
    explanation: g.explanation,
  }));
}

export const STATEMENT_CHOICES = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
  { value: 'not-given', label: 'Not given' },
] as const;

export function statementItems(statements: readonly StatementItem[]): ScoreItem[] {
  return statements.map((s) => ({
    id: s.id,
    kind: 'text',
    prompt: s.text,
    correct: s.answer,
    choices: STATEMENT_CHOICES,
    explanation: s.explanation,
  }));
}
