import type { ExamSummary, Skill } from '../models/exam';
import type { ExamProgress, PersistedState } from '../models/storage';
import { COMPLETABLE_SKILLS, SCORED_SKILLS, examStatus } from './progress';
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

/** A part type or grammar tag with the learner's score over the latest result of every exam. */
export interface WeakArea {
  id: string;
  correct: number;
  total: number;
  percent: number;
}

export interface WeakAreas {
  parts: WeakArea[];
  tags: WeakArea[];
}

/** Fewer answered items than this say too little about a weakness. */
export const WEAK_AREA_MIN_ITEMS = 6;

/**
 * Sums the breakdown of the latest result of every exam and skill. Areas with at least
 * `minItems` items come back lowest percentage first (ties: more items first).
 */
export function weakAreas(
  state: Pick<PersistedState, 'progress'>,
  minItems = WEAK_AREA_MIN_ITEMS,
): WeakAreas {
  const breakdowns: unknown[] = [];
  for (const progress of Object.values(state.progress)) {
    for (const skill of SCORED_SKILLS) breakdowns.push(latestResult(progress, skill)?.breakdown);
  }
  return rankBreakdowns(breakdowns, minItems);
}

/** Adds up breakdowns (saved data, so every value is checked) and ranks the areas, weakest first. */
export function rankBreakdowns(breakdowns: readonly unknown[], minItems: number): WeakAreas {
  const parts = new Map<string, { correct: number; total: number }>();
  const tags = new Map<string, { correct: number; total: number }>();
  const addAll = (target: typeof parts, source: unknown) => {
    if (!source || typeof source !== 'object') return;
    for (const [id, tally] of Object.entries(source as Record<string, unknown>)) {
      const t = tally as { correct?: unknown; total?: unknown } | null;
      if (typeof t?.correct !== 'number' || typeof t.total !== 'number' || t.total <= 0) continue;
      const sum = target.get(id) ?? { correct: 0, total: 0 };
      target.set(id, { correct: sum.correct + t.correct, total: sum.total + t.total });
    }
  };
  for (const breakdown of breakdowns) {
    if (!breakdown || typeof breakdown !== 'object') continue;
    const b = breakdown as { parts?: unknown; tags?: unknown };
    addAll(parts, b.parts);
    addAll(tags, b.tags);
  }
  const rank = (map: typeof parts): WeakArea[] =>
    [...map]
      .filter(([, t]) => t.total >= minItems)
      .map(([id, t]) => ({ id, ...t, percent: Math.round((t.correct / t.total) * 100) }))
      .sort((a, b) => a.percent - b.percent || b.total - a.total);
  return { parts: rank(parts), tags: rank(tags) };
}

/** Everything the Home and /exams/b1 summaries show, derived from the saved document. */
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
