import type { Exam, Part, Section, Skill } from '../../../models/exam';
import { partItems } from '../parts/part-registry';
import {
  formatAnswer,
  formatCorrect,
  isAnswered,
  isCorrect,
  percent,
  scoreItems,
  type Answers,
  type Score,
  type ScoreItem,
} from './scoring';

/** Skills whose answers are marked automatically in this build. */
export const MARKED_SKILLS: readonly Skill[] = ['reading', 'listening'];

/** An item together with where it lives in the exam. `n` counts from 1 inside its part. */
export interface PlacedItem {
  item: ScoreItem;
  skill: Skill;
  partId: string;
  partNumber: number;
  n: number;
}

export function placedItems(section: Section): PlacedItem[] {
  return (section.parts as Part[]).flatMap((part) =>
    partItems(part).map((item, index) => ({
      item,
      skill: section.skill,
      partId: part.id,
      partNumber: part.number,
      n: index + 1,
    })),
  );
}

export interface ReportItem {
  item: ScoreItem;
  n: number;
  answered: boolean;
  correct: boolean;
  given: string;
  expected: string;
}

export interface PartReport {
  partId: string;
  number: number;
  title: string;
  type: string;
  score: Score;
  percent: number;
  items: ReportItem[];
}

export interface SectionReport {
  skill: Skill;
  score: Score;
  percent: number;
  parts: PartReport[];
}

/** Marks one section of an exam against a set of answers (current or archived). */
export function buildSectionReport(section: Section, answers: Answers): SectionReport {
  const parts: PartReport[] = (section.parts as Part[]).map((part) => {
    const items = partItems(part).map((item, index): ReportItem => {
      const value = answers[item.id];
      return {
        item,
        n: index + 1,
        answered: isAnswered(value),
        correct: isCorrect(item, value),
        given: formatAnswer(item, value),
        expected: formatCorrect(item),
      };
    });
    const score = scoreItems(
      items.map((i) => i.item),
      answers,
    );
    return {
      partId: part.id,
      number: part.number,
      title: part.title,
      type: part.type,
      score,
      percent: percent(score),
      items,
    };
  });
  const score = parts.reduce<Score>(
    (sum, p) => ({
      correct: sum.correct + p.score.correct,
      total: sum.total + p.score.total,
      answered: sum.answered + p.score.answered,
    }),
    { correct: 0, total: 0, answered: 0 },
  );
  return { skill: section.skill, score, percent: percent(score), parts };
}

export function markedSections(exam: Exam): Section[] {
  return exam.sections.filter((s) => MARKED_SKILLS.includes(s.skill));
}
