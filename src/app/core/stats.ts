import type { ExamSummary, Skill } from '../models/exam';
import type { ExamProgress, PersistedState } from '../models/storage';
import { COMPLETABLE_SKILLS, examStatus } from './progress';
import { localDay } from './state-migrations';

export interface ContinueTarget {
  exam: ExamSummary;
  skill: Skill;
  updatedAt: string;
}

export interface ProgressStats {
  total: number;
  /** Exams with any saved work (current or earlier attempts). */
  started: number;
  /** Exams whose reading and listening were both submitted at least once. */
  completed: number;
  /** Average percentage per auto-marked skill, from the latest result of each exam. */
  averages: Partial<Record<Skill, number>>;
  /** Consecutive days of practice ending today (or yesterday, so the streak is not lost before you practise). */
  streak: number;
  practisedToday: boolean;
  /** The exam in progress that was touched last. */
  continueTarget: ContinueTarget | null;
}

/** Consecutive days present in `days`, counting back from today, or from yesterday if today is missing. */
export function currentStreak(days: readonly string[], today: Date): number {
  const set = new Set(days);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!set.has(localDay(cursor) ?? '')) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (set.has(localDay(cursor) ?? '')) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function latestResult(progress: ExamProgress, skill: Skill) {
  const current = progress.results[skill];
  if (current) return current;
  for (let i = progress.attempts.length - 1; i >= 0; i--) {
    const found = progress.attempts[i].results[skill];
    if (found) return found;
  }
  return undefined;
}

/** Everything the Home and /b1 summaries show, derived from the saved document. */
export function computeStats(
  exams: readonly ExamSummary[],
  state: Pick<PersistedState, 'progress' | 'activity'>,
  today = new Date(),
): ProgressStats {
  let started = 0;
  let completed = 0;
  let continueTarget: ContinueTarget | null = null;
  const sums: Partial<Record<Skill, { percent: number; count: number }>> = {};

  for (const exam of exams) {
    const progress = state.progress[exam.id];
    const status = examStatus(exam, progress);
    if (!progress) continue;
    if (status.status !== 'not-started' || status.everCompleted) started++;
    if (status.everCompleted) completed++;
    for (const skill of COMPLETABLE_SKILLS) {
      const r = latestResult(progress, skill);
      if (!r || r.total === 0) continue;
      const entry = (sums[skill] ??= { percent: 0, count: 0 });
      entry.percent += (r.correct / r.total) * 100;
      entry.count++;
    }
    if (
      status.status === 'in-progress' &&
      (!continueTarget || progress.updatedAt > continueTarget.updatedAt)
    ) {
      const next = exam.skills.find(
        (s) => COMPLETABLE_SKILLS.includes(s) && progress.sectionStatus[s] !== 'completed',
      );
      const saved = progress.session?.skill;
      const resume =
        saved && COMPLETABLE_SKILLS.includes(saved) && progress.sectionStatus[saved] !== 'completed'
          ? saved
          : undefined;
      continueTarget = {
        exam,
        skill: resume ?? next ?? exam.skills[0],
        updatedAt: progress.updatedAt,
      };
    }
  }

  const averages: Partial<Record<Skill, number>> = {};
  for (const [skill, entry] of Object.entries(sums) as [
    Skill,
    { percent: number; count: number },
  ][]) {
    averages[skill] = Math.round(entry.percent / entry.count);
  }
  const todayKey = localDay(today);
  return {
    total: exams.length,
    started,
    completed,
    averages,
    streak: currentStreak(state.activity, today),
    practisedToday: !!todayKey && state.activity.includes(todayKey),
    continueTarget,
  };
}
