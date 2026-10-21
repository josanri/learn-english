import { httpResource } from '@angular/common/http';
import { Injectable, type Signal } from '@angular/core';
import type { Exam, LevelIndex } from '../models/exam';

/** Folder (relative to the base href) that contains the exam JSON files. */
export const EXAMS_ROOT = 'assets/exams';

/**
 * Lazily loads exam data. Nothing is bundled: the index and each exam are fetched as static JSON.
 * Layout: `assets/exams/<level>/index.json` and `assets/exams/<level>/<board>/<examId>.json`.
 */
@Injectable({ providedIn: 'root' })
export class ExamCatalogueService {
  /** Lightweight listing for one level (for example `b1`). */
  levelIndex(level: Signal<string>) {
    return httpResource<LevelIndex>(() => `${EXAMS_ROOT}/${level()}/index.json`);
  }

  /** One full exam. Pass `undefined` from the callback to skip loading. */
  exam(path: () => { level: string; board: string; examId: string } | undefined) {
    return httpResource<Exam>(() => {
      const p = path();
      return p ? `${EXAMS_ROOT}/${p.level}/${p.board}/${p.examId}.json` : undefined;
    });
  }
}
