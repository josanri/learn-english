import type { Exam, Part, Section } from '../../../models/exam';
import type { ResultBreakdown, Tally } from '../../../models/storage';
import { partItems } from '../parts/part-registry';
import { buildSectionReport } from './report';
import type { Answers, ScoreItem } from './scoring';

/** What one submitted section tells about the learner. */
export interface SectionInsight {
  breakdown: ResultBreakdown;
  /** Ids of the items answered incorrectly. Empty answers count in the tallies only. */
  wrong: string[];
}

function add(tally: Tally | undefined, correct: boolean): Tally {
  return { correct: (tally?.correct ?? 0) + (correct ? 1 : 0), total: (tally?.total ?? 0) + 1 };
}

/** Splits the score of a section by part type and grammar tag and lists the wrong answers. */
export function analyseSection(section: Section, answers: Answers): SectionInsight {
  const report = buildSectionReport(section, answers);
  const breakdown: ResultBreakdown = { parts: {}, tags: {} };
  const wrong: string[] = [];
  for (const part of report.parts) {
    for (const row of part.items) {
      breakdown.parts[part.type] = add(breakdown.parts[part.type], row.correct);
      for (const tag of row.item.tags ?? []) {
        breakdown.tags[tag] = add(breakdown.tags[tag], row.correct);
      }
      if (row.answered && !row.correct) wrong.push(row.item.id);
    }
  }
  return { breakdown, wrong };
}

export interface LocatedItem {
  section: Section;
  part: Part;
  item: ScoreItem;
  /** Position of the item inside its part, from 1 (the gap number in a cloze passage). */
  n: number;
}

/** Finds a marked item of an exam by id, or null. */
export function locateItem(exam: Exam, itemId: string): LocatedItem | null {
  for (const section of exam.sections) {
    for (const part of section.parts as Part[]) {
      const items = partItems(part);
      const index = items.findIndex((item) => item.id === itemId);
      if (index >= 0) return { section, part, item: items[index], n: index + 1 };
    }
  }
  return null;
}
