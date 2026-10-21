import type { ExamSummary, Skill } from '../models/exam';
import type { ExamProgress, ObjectiveResult, SectionStatus } from '../models/storage';

/**
 * Skills that can be completed in this build. An exam counts as completed when all of these that it
 * contains are done; add `writing` here when its phase ships, and it joins the check. Speaking is
 * completed when the learner submits the section; it has no score.
 */
export const COMPLETABLE_SKILLS: readonly Skill[] = ['reading', 'listening', 'speaking'];

/** Skills marked automatically: only these have a score (`results[skill]`). */
export const SCORED_SKILLS: readonly Skill[] = ['reading', 'listening'];

export interface ExamStatus {
  status: SectionStatus;
  /** Completed sections divided by the completable sections of the exam (0 to 1). */
  fraction: number;
  /** Percentage of correct auto-marked items: the current attempt, else the latest finished one. */
  scorePercent: number | null;
  /** True when the current attempt or an earlier one has every completable section done. */
  everCompleted: boolean;
}

/** Results of the auto-marked sections, keyed by skill (`objective` is the legacy combined result). */
export function resultsOf(source: Pick<ExamProgress, 'results'>): ObjectiveResult[] {
  const bySkill = SCORED_SKILLS.map((s) => source.results[s]).filter(
    (r): r is ObjectiveResult => !!r,
  );
  if (bySkill.length > 0) return bySkill;
  const legacy = source.results['objective'] ?? Object.values(source.results)[0];
  return legacy ? [legacy] : [];
}

export function percentOfResults(results: readonly ObjectiveResult[]): number | null {
  const correct = results.reduce((sum, r) => sum + r.correct, 0);
  const total = results.reduce((sum, r) => sum + r.total, 0);
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

function isDone(
  skills: readonly Skill[],
  sectionStatus: ExamProgress['sectionStatus'],
): { done: number; needed: number } {
  const needed = skills.filter((s) => COMPLETABLE_SKILLS.includes(s));
  return {
    done: needed.filter((s) => sectionStatus[s] === 'completed').length,
    needed: needed.length,
  };
}

/** Summarises saved progress for one exam: not started, in progress or completed (with score). */
export function examStatus(
  exam: Pick<ExamSummary, 'skills'>,
  progress: ExamProgress | undefined,
): ExamStatus {
  if (!progress) {
    return { status: 'not-started', fraction: 0, scorePercent: null, everCompleted: false };
  }
  const { done, needed } = isDone(exam.skills, progress.sectionStatus);
  const total = needed || 1;
  const touched =
    Object.keys(progress.answers).length > 0 ||
    Object.values(progress.sectionStatus).some((s) => s && s !== 'not-started');
  const attempts = progress.attempts ?? [];
  const completed = needed > 0 && done >= needed;
  const everCompleted =
    completed ||
    attempts.some((a) => {
      const d = isDone(exam.skills, a.sectionStatus);
      return d.needed > 0 && d.done >= d.needed;
    });
  const current = percentOfResults(resultsOf(progress));
  const lastAttempt = attempts[attempts.length - 1];
  const scorePercent = current ?? (lastAttempt ? percentOfResults(resultsOf(lastAttempt)) : null);
  const status: SectionStatus = completed
    ? 'completed'
    : touched || done > 0
      ? 'in-progress'
      : 'not-started';
  return { status, fraction: done / total, scorePercent, everCompleted };
}
