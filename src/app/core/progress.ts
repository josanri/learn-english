import type { ExamSummary } from '../models/exam';
import type { ExamProgress, SectionStatus } from '../models/storage';

export interface ExamStatus {
  status: SectionStatus;
  /** Completed sections divided by the sections of the exam (0 to 1). */
  fraction: number;
  /** Percentage of correct objective items when a score is saved. */
  scorePercent: number | null;
}

/** Summarises saved progress for one exam: not started, in progress or completed (with score). */
export function examStatus(
  exam: Pick<ExamSummary, 'skills'>,
  progress: ExamProgress | undefined,
): ExamStatus {
  const total = exam.skills.length || 1;
  if (!progress) return { status: 'not-started', fraction: 0, scorePercent: null };
  const done = exam.skills.filter((s) => progress.sectionStatus[s] === 'completed').length;
  const touched =
    Object.keys(progress.answers).length > 0 ||
    Object.values(progress.sectionStatus).some((s) => s && s !== 'not-started');
  const objective = progress.results['objective'] ?? Object.values(progress.results)[0];
  const scorePercent =
    objective && objective.total > 0
      ? Math.round((objective.correct / objective.total) * 100)
      : null;
  const status: SectionStatus =
    done >= exam.skills.length && exam.skills.length > 0
      ? 'completed'
      : touched || done > 0
        ? 'in-progress'
        : 'not-started';
  return { status, fraction: done / total, scorePercent };
}
