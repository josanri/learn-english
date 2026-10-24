import type { Exam, NoticesPart, Part } from '../../models/exam';
import { partTypeInfo } from '../../models/part-labels';
import { locateItem } from '../exam/engine/insights';
import { splitPassage } from '../exam/engine/passage';
import { formatCorrect, type ScoreItem } from '../exam/engine/scoring';

/** Text around a gap: the learner fills the blank between `before` and `after`. */
export interface GapContext {
  before: string;
  after: string;
}

interface CardBase {
  /** For example `Reading Part 5 · Choose the missing word`. */
  heading: string;
  explanation?: string;
  /** The right answer as text, shown after the answer. */
  expected: string;
  /** Route to the part in its exam, with `?part=`. */
  link: { commands: string[]; queryParams: { part: string } };
}

/**
 * - `choice`: the app marks the answer (cloze and notice questions, which stand alone).
 * - `text`: a typed word, marked like the exam (open cloze).
 * - `self`: the item needs its long text or recording; the learner opens the part, then says if
 *   they knew the answer.
 */
export type ExamMistakeCard =
  | (CardBase & {
      kind: 'choice';
      context?: GapContext;
      notice?: string;
      prompt: string;
      options: readonly string[];
      correct: number;
    })
  | (CardBase & { kind: 'text'; context?: GapContext; item: ScoreItem })
  | (CardBase & { kind: 'self'; prompt?: string; skill: string });

const SKILL_NAME: Record<string, string> = { reading: 'Reading', listening: 'Listening' };

/** Sentences of a passage: split after `.`, `!` or `?` and at line breaks. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const GAP_MARK = '\u0000';

/**
 * The sentence of a cloze passage that holds gap `n`, with the other gaps filled in with their
 * answers. A very short sentence gets the sentence before it too, so the gap has some context.
 */
export function gapContext(
  passage: string,
  n: number,
  answerOf: (gap: number) => string,
): GapContext | undefined {
  const text = splitPassage(passage)
    .map((seg) => (seg.type === 'text' ? seg.text : seg.gap === n ? GAP_MARK : answerOf(seg.gap)))
    .join('');
  const list = sentences(text);
  const index = list.findIndex((s) => s.includes(GAP_MARK));
  if (index < 0) return undefined;
  const words = list[index].split(/\s+/).length;
  const sentence = words < 7 && index > 0 ? `${list[index - 1]} ${list[index]}` : list[index];
  const [before, after = ''] = sentence.split(GAP_MARK);
  return { before, after };
}

function clozeAnswers(part: Part): (gap: number) => string {
  if (part.type === 'multiple-choice-cloze') {
    return (gap) => {
      const q = part.questions[gap - 1];
      return q ? (q.options[q.answer] ?? '') : '';
    };
  }
  if (part.type === 'open-cloze') return (gap) => part.gaps[gap - 1]?.answer ?? '';
  return () => '';
}

/** Builds the review card of an exam item, or null when the item no longer exists. */
export function buildExamCard(exam: Exam, itemId: string): ExamMistakeCard | null {
  const found = locateItem(exam, itemId);
  if (!found) return null;
  const { section, part, item, n } = found;
  const info = partTypeInfo(part.type);
  const base: CardBase = {
    heading: `${SKILL_NAME[section.skill] ?? section.skill} Part ${part.number} · ${info?.label ?? part.title}`,
    explanation: item.explanation,
    expected: formatCorrect(item),
    link: {
      commands: ['/exams', exam.level.toLowerCase(), exam.board, exam.id, section.skill],
      queryParams: { part: part.id },
    },
  };

  if (part.type === 'multiple-choice-cloze' && item.options) {
    return {
      ...base,
      kind: 'choice',
      context: gapContext(part.passage, n, clozeAnswers(part)),
      prompt: `Choose the word for the gap.`,
      options: item.options,
      correct: Number(item.correct),
    };
  }
  if (part.type === 'open-cloze') {
    return {
      ...base,
      kind: 'text',
      context: gapContext(part.passage, n, clozeAnswers(part)),
      item,
    };
  }
  if (part.type === 'notices' && item.options) {
    return {
      ...base,
      kind: 'choice',
      notice: (part as NoticesPart).notices[n - 1],
      prompt: item.prompt,
      options: item.options,
      correct: Number(item.correct),
    };
  }
  // Prompts such as `Gap 3` say nothing without the text, so they are left out.
  const prompt = /^(Gap|Paragraph) \d+$/.test(item.prompt) ? undefined : item.prompt;
  return { ...base, kind: 'self', prompt, skill: section.skill };
}
