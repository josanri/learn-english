import type { Type } from '@angular/core';
import type { Part } from '../../../models/exam';
import {
  choiceItems,
  gapItems,
  letterGapItems,
  statementItems,
  type ScoreItem,
} from '../engine/scoring';

/** Every `part.type` the schema defines. */
export type PartType = Part['type'];
type PartOf<T extends PartType> = Extract<Part, { type: T }>;

/**
 * How the engine handles one part type.
 *
 * - `load` lazily imports the renderer. A renderer is a standalone component with a required
 *   `part` input; it reads answers and feedback from `ExamSessionStore` (`inject()`), so the engine
 *   never needs to know what is inside it.
 * - `items` lists the markable questions of the part in display order (empty for parts that are not
 *   auto-marked, such as writing and speaking).
 */
export interface PartDef<P extends Part = Part> {
  load: () => Promise<Type<unknown>>;
  items: (part: P) => ScoreItem[];
}

const noItems = () => [] as ScoreItem[];
const placeholder = () => import('./placeholder-part').then((m) => m.PlaceholderPart);
const textQuestions = () => import('./text-questions-part').then((m) => m.TextQuestionsPart);
const sentenceCompletion = () =>
  import('./sentence-completion-part').then((m) => m.SentenceCompletionPart);
const trueFalse = () => import('./true-false-part').then((m) => m.TrueFalsePart);
const clips = () => import('./clips-part').then((m) => m.ClipsPart);

/**
 * Registry of part renderers and item extractors. To support a new part type:
 * 1. add its interface to `models/exam.ts` (and regenerate the schema),
 * 2. create the renderer component in this folder,
 * 3. add one entry below. The mapped type makes the compiler reject a missing entry.
 */
export const PART_REGISTRY: { [T in PartType]: PartDef<PartOf<T>> } = {
  // Reading
  notices: {
    load: () => import('./notices-part').then((m) => m.NoticesPart),
    items: (p) => choiceItems(p.questions),
  },
  matching: {
    load: () => import('./matching-part').then((m) => m.MatchingPart),
    items: (p) =>
      choiceItems(p.questions).map((item) => ({
        ...item,
        optionLabels: p.texts.map((t) => `${t.id}. ${t.title}`),
      })),
  },
  'multiple-choice': { load: textQuestions, items: (p) => choiceItems(p.questions) },
  'multiple-choice-cloze': { load: textQuestions, items: (p) => choiceItems(p.questions) },
  'gapped-text': {
    load: () => import('./gapped-text-part').then((m) => m.GappedTextPart),
    items: (p) => letterGapItems(p.gaps, p.sentences, (_, i) => `Gap ${i + 1}`),
  },
  'open-cloze': {
    load: () => import('./open-cloze-part').then((m) => m.OpenClozePart),
    items: (p) => gapItems(p.gaps),
  },
  'true-false-notgiven': { load: trueFalse, items: (p) => statementItems(p.statements) },
  'sentence-completion': { load: sentenceCompletion, items: (p) => gapItems(p.gaps) },
  'gap-fill-word-bank': {
    load: () => import('./word-bank-part').then((m) => m.WordBankPart),
    items: (p) => gapItems(p.gaps),
  },
  'heading-matching': {
    load: () => import('./heading-matching-part').then((m) => m.HeadingMatchingPart),
    items: (p) =>
      letterGapItems(
        p.gaps,
        p.headings,
        (_, i) => p.paragraphs[i]?.text.slice(0, 80) ?? `Paragraph ${i + 1}`,
      ),
  },
  // Listening
  'short-dialogues': { load: clips, items: (p) => choiceItems(p.clips.map((c) => c.question)) },
  'gist-dialogues': { load: clips, items: (p) => choiceItems(p.clips.map((c) => c.question)) },
  'note-completion': { load: sentenceCompletion, items: (p) => gapItems(p.gaps) },
  'listening-interview': { load: textQuestions, items: (p) => choiceItems(p.questions) },
  'listening-multiple-choice': { load: textQuestions, items: (p) => choiceItems(p.questions) },
  'listening-true-false': { load: trueFalse, items: (p) => statementItems(p.statements) },
  'opinion-matching': {
    load: () => import('./opinion-matching-part').then((m) => m.OpinionMatchingPart),
    items: (p) => letterGapItems(p.gaps, p.options, (g) => ('prompt' in g ? g.prompt : g.id)),
  },
  // Writing, speaking and mediation have their own phases: placeholder only, nothing auto-marked.
  email: { load: placeholder, items: noItems },
  'choice-task': { load: placeholder, items: noItems },
  'short-message': { load: placeholder, items: noItems },
  'opinion-essay': { load: placeholder, items: noItems },
  interview: { load: placeholder, items: noItems },
  'photo-description': { load: placeholder, items: noItems },
  'collaborative-task': { load: placeholder, items: noItems },
  discussion: { load: placeholder, items: noItems },
  'monologue-topic': { load: placeholder, items: noItems },
  'role-play': { load: placeholder, items: noItems },
  'mediation-text': { load: placeholder, items: noItems },
};

/** Registry entry for a part, or undefined for a type this build does not know. */
export function partDef(type: string): PartDef | undefined {
  return (PART_REGISTRY as Record<string, PartDef | undefined>)[type];
}

/** Markable items of a part in display order. Unknown types have none. */
export function partItems(part: Part): ScoreItem[] {
  return partDef(part.type)?.items(part) ?? [];
}

/** Part types with a real (non-placeholder) renderer. */
export function isInteractivePart(part: Part): boolean {
  return partDef(part.type)?.load !== placeholder;
}
