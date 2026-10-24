import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { examMistakeId } from '../../core/mistakes';
import { LocalStorageService } from '../../core/storage.service';
import { EXAMS_ROOT } from '../../data/exam-catalogue.service';
import type { Exam, ExamSummary, Skill } from '../../models/exam';
import type { AttemptData, ExamProgress } from '../../models/storage';
import { analyseSection } from '../exam/engine/insights';
import { MARKED_SKILLS } from '../exam/engine/report';

/** One saved result that has no breakdown yet. `attemptId` is null for the current attempt. */
interface PendingResult {
  attemptId: string | null;
  skill: Skill;
  data: AttemptData;
  /** True for the newest result of its skill: only that one adds items to "My mistakes". */
  latest: boolean;
}

/** Results saved before schema version 5, newest attempt first. */
export function pendingResults(progress: ExamProgress): PendingResult[] {
  const pending: PendingResult[] = [];
  const attempts: [string | null, AttemptData][] = [
    [null, progress],
    ...[...progress.attempts].reverse().map((a): [string, AttemptData] => [a.id, a]),
  ];
  for (const skill of MARKED_SKILLS) {
    let latest = true;
    for (const [attemptId, data] of attempts) {
      const result = data.results[skill];
      if (!result) continue;
      if (!result.breakdown) pending.push({ attemptId, skill, data, latest });
      latest = false;
    }
  }
  return pending;
}

/**
 * Loads full exams on demand (kept in memory for the visit; the service worker keeps them offline)
 * and fills in what older saved results miss: the breakdown by part and tag, and the wrong items.
 */
@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(LocalStorageService);
  private readonly cache = new Map<string, Promise<Exam>>();
  private running: Promise<void> | null = null;

  /** One full exam by its summary. A failed load is forgotten, so the next call tries again. */
  loadExam(summary: Pick<ExamSummary, 'path'>): Promise<Exam> {
    let request = this.cache.get(summary.path);
    if (!request) {
      request = firstValueFrom(this.http.get<Exam>(`${EXAMS_ROOT}/${summary.path}`));
      request.catch(() => this.cache.delete(summary.path));
      this.cache.set(summary.path, request);
    }
    return request;
  }

  /** Adds the missing breakdowns. Safe to call often: it runs once at a time and skips done work. */
  backfill(exams: readonly ExamSummary[]): Promise<void> {
    this.running ??= this.run(exams).finally(() => (this.running = null));
    return this.running;
  }

  private async run(exams: readonly ExamSummary[]): Promise<void> {
    for (const summary of exams) {
      const progress = this.storage.progressFor(summary.id);
      const pending = progress ? pendingResults(progress) : [];
      if (pending.length === 0) continue;
      let exam: Exam;
      try {
        exam = await this.loadExam(summary);
      } catch {
        continue; // Offline and not cached: try again on the next visit.
      }
      for (const entry of pending) {
        const section = exam.sections.find((s) => s.skill === entry.skill);
        if (!section) continue;
        const insight = analyseSection(section, entry.data.answers);
        this.storage.setBreakdown(summary.id, entry.attemptId, entry.skill, insight.breakdown);
        if (entry.latest) {
          // Old mistakes never reset an item that is already in the queue.
          const known = this.storage.practice().mistakes;
          this.storage.addMistakes(
            insight.wrong
              .map((itemId) => examMistakeId(summary.id, itemId))
              .filter((id) => !known[id]),
            entry.data.results[entry.skill]?.completedAt,
          );
        }
      }
    }
  }
}
