import type { WritingPart, WritingSection, WritingTask } from '../../../models/exam';
import {
  countWords,
  lengthState,
  parseWordTarget,
  type LengthState,
} from '../../../core/writing/text';
import type { TaskSpec } from '../../../core/writing/types';
import type { Answers } from '../engine/scoring';
import type { PromptRef } from './speaking-prompts';

/**
 * Answer keys of the Writing section.
 * - `writing-1`, `writing-2`: the text (same keys as the React version).
 * - `writing-2-type`: the task chosen in a `choice-task` part (`article` or `story`).
 * - `writing-rubric:<partId>:<criterion>`: the learner's own 0 to 5 rating.
 * - `writing-check:<partId>`: JSON summary of the last check (see `WritingCheckSummary`).
 */
export const textKey = (partId: string) => partId;
export const typeKey = (partId: string) => `${partId}-type`;
export const rubricKey = (partId: string, criterion: RubricCriterionId) =>
  `writing-rubric:${partId}:${criterion}`;
export const checkKey = (partId: string) => `writing-check:${partId}`;

export type RubricCriterionId = 'content' | 'communication' | 'organisation' | 'language';

/** The four Cambridge writing criteria, in plain words. Self-assessment only. */
export const RUBRIC: readonly { id: RubricCriterionId; name: string; question: string }[] = [
  {
    id: 'content',
    name: 'Content',
    question: 'Did I cover every point in the task and keep to the topic?',
  },
  {
    id: 'communication',
    name: 'Communicative achievement',
    question: 'Is the style right for the reader (friendly, clear, the right kind of text)?',
  },
  {
    id: 'organisation',
    name: 'Organisation',
    question: 'Are my ideas in a logical order, in paragraphs, linked with connecting words?',
  },
  {
    id: 'language',
    name: 'Language',
    question: 'Did I use a good range of words and structures, with few mistakes?',
  },
];

/** Summary of the checker that is saved with the answer (counts only, no text). */
export interface WritingCheckSummary {
  words: number;
  spelling: number;
  grammar: number;
  vocabulary: number;
  /** Checklist items done / total. */
  checklistDone: number;
  checklistTotal: number;
  /** ISO time of the check. */
  at: string;
}

export function writingPrompts(part: WritingPart): PromptRef[] {
  return [{ id: textKey(part.id), label: part.title }];
}

/** Tasks the learner can pick from in a part (one, except in `choice-task`). */
export function tasksOf(part: WritingPart): WritingTask[] {
  return part.type === 'choice-task' ? part.options : [part.task];
}

/** The task being answered: the chosen option of a `choice-task` part, else the only task. */
export function selectedTask(part: WritingPart, answers: Answers): WritingTask {
  const tasks = tasksOf(part);
  const chosen = answers[typeKey(part.id)];
  return tasks.find((t) => t.kind === chosen) ?? tasks[0]!;
}

/** What the checker needs from a task. */
export function taskSpec(task: WritingTask): TaskSpec {
  return {
    kind: task.kind,
    title: task.title,
    wordCount: task.wordCount,
    contentPoints: task.contentPoints ?? [],
    ...(task.openingSentence ? { openingSentence: task.openingSentence } : {}),
  };
}

/** Words from the task text (names, places) that the spelling checker must accept. */
export function taskVocabulary(task: WritingTask, extra: readonly string[] = []): string[] {
  const parts = [
    task.title,
    task.prompt,
    task.openingSentence ?? '',
    task.sourceEmail?.from ?? '',
    task.sourceEmail?.subject ?? '',
    task.sourceEmail?.body ?? '',
    ...(task.notes ?? []),
    ...extra,
  ];
  const words = parts.join(' ').match(/[\p{L}]+(?:['’][\p{L}]+)*/gu) ?? [];
  return [...new Set(words.map((w) => w.toLowerCase().replace(/’/g, "'")))];
}

export interface WritingPartSummary {
  partId: string;
  title: string;
  task: WritingTask;
  text: string;
  words: number;
  state: LengthState;
  target: string;
  /** Ratings 0 to 5, or null when the learner did not rate that criterion. */
  rubric: Record<RubricCriterionId, number | null>;
  rubricAverage: number | null;
  check: WritingCheckSummary | null;
}

function parseCheck(value: unknown): WritingCheckSummary | null {
  if (typeof value !== 'string') return null;
  try {
    const v = JSON.parse(value) as Partial<WritingCheckSummary>;
    if (typeof v.words !== 'number' || typeof v.spelling !== 'number') return null;
    return {
      words: v.words,
      spelling: v.spelling,
      grammar: v.grammar ?? 0,
      vocabulary: v.vocabulary ?? 0,
      checklistDone: v.checklistDone ?? 0,
      checklistTotal: v.checklistTotal ?? 0,
      at: v.at ?? '',
    };
  } catch {
    return null;
  }
}

/** Everything the Results page (and later the PDF report) shows about the written answers. */
export function writingSummary(section: WritingSection, answers: Answers): WritingPartSummary[] {
  return section.parts.map((part) => {
    const task = selectedTask(part, answers);
    const raw = answers[textKey(part.id)];
    const text = typeof raw === 'string' ? raw : '';
    const words = countWords(text);
    const target = parseWordTarget(task.wordCount);
    const rubric = Object.fromEntries(
      RUBRIC.map((c) => {
        const v = answers[rubricKey(part.id, c.id)];
        return [c.id, typeof v === 'number' ? v : null];
      }),
    ) as Record<RubricCriterionId, number | null>;
    const rated = Object.values(rubric).filter((v): v is number => v !== null);
    return {
      partId: part.id,
      title: part.title,
      task,
      text,
      words,
      state: lengthState(words, target),
      target: target.label,
      rubric,
      rubricAverage: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
      check: parseCheck(answers[checkKey(part.id)]),
    };
  });
}
