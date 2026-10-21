import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { currentAttemptId } from '../../../core/audio-db.service';
import { SettingsService } from '../../../core/settings.service';
import { emptySession, LocalStorageService } from '../../../core/storage.service';
import { ExamCatalogueService } from '../../../data/exam-catalogue.service';
import type { Part, Skill } from '../../../models/exam';
import type { ExamSession, SectionStatus } from '../../../models/storage';
import { placedItems, type PlacedItem } from '../engine/report';
import { partPrompts } from '../parts/part-registry';
import { isResponded } from '../parts/speaking-prompts';
import {
  formatCorrect,
  isAnswered,
  isCorrect,
  scoreItems,
  type Answers,
  type AnswerValue,
  type Score,
} from '../engine/scoring';

export interface ExamLocation {
  level: string;
  board: string;
  examId: string;
}

export interface ItemFeedback {
  answered: boolean;
  correct: boolean;
  correctText: string;
  /** The right answer as stored (option index, letter, `true`, or text). */
  correctValue: number | string;
  explanation?: string;
}

export const NO_ANSWERS: Answers = Object.freeze({});
const SAVE_EVERY_SECONDS = 5;

/**
 * State of the exam being taken. Provided by `ExamShell`, so there is one store per open exam.
 *
 * - The exam JSON is loaded here (`exam`, `resource`).
 * - Answers, flags, checked parts, listens, position and elapsed time live in `LocalStorageService`
 *   (under the exam id) so they survive reloads; this store only reads them through computed signals
 *   and writes through the methods below. Storage debounces the actual localStorage write.
 * - `skill` is the open section (set by the section page from the route).
 */
@Injectable()
export class ExamSessionStore {
  private readonly storage = inject(LocalStorageService);
  private readonly settings = inject(SettingsService);
  private readonly catalogue = inject(ExamCatalogueService);

  readonly location = signal<ExamLocation | undefined>(undefined);
  readonly resource = this.catalogue.exam(() => this.location());
  readonly exam = computed(() => (this.resource.hasValue() ? this.resource.value() : undefined));
  readonly examId = computed(() => this.exam()?.id);

  /** Saved progress of the current attempt. */
  readonly progress = computed(() => {
    const id = this.examId();
    return id ? this.storage.progress()[id] : undefined;
  });
  readonly answers = computed<Answers>(() => this.progress()?.answers ?? NO_ANSWERS);
  readonly session = computed<ExamSession>(
    () => this.progress()?.session ?? emptySession(this.skill()),
  );

  readonly examMode = computed(() => this.settings.settings().examMode);
  readonly showTimer = computed(() => this.settings.settings().showTimer);

  // ---- Current section ----
  readonly skill = signal<Skill>('reading');
  readonly section = computed(() => this.exam()?.sections.find((s) => s.skill === this.skill()));
  readonly parts = computed<Part[]>(() => (this.section()?.parts as Part[] | undefined) ?? []);
  readonly sectionStatus = computed<SectionStatus>(
    () => this.progress()?.sectionStatus[this.skill()] ?? 'not-started',
  );
  /** A submitted section is read-only: the learner can only review it. */
  readonly locked = computed(() => this.sectionStatus() === 'completed');

  readonly partIndex = computed(() => {
    const saved = this.session().parts[this.skill()];
    const index = this.parts().findIndex((p) => p.id === saved);
    return index >= 0 ? index : 0;
  });
  readonly part = computed<Part | undefined>(() => this.parts()[this.partIndex()]);

  // ---- Items ----
  /** Every markable item of the whole exam, by id. */
  private readonly itemIndex = computed(() => {
    const map = new Map<string, PlacedItem>();
    for (const section of this.exam()?.sections ?? []) {
      for (const placed of placedItems(section)) map.set(placed.item.id, placed);
    }
    return map;
  });
  readonly sectionItems = computed(() =>
    [...this.itemIndex().values()].filter((p) => p.skill === this.skill()),
  );
  /** Items of the current section grouped by part, in order. */
  readonly itemsByPart = computed(() => {
    const groups = new Map<string, PlacedItem[]>();
    for (const part of this.parts()) groups.set(part.id, []);
    for (const placed of this.sectionItems()) groups.get(placed.partId)?.push(placed);
    return groups;
  });

  /** A free-response prompt together with where it lives in the section. */
  readonly prompts = computed(() =>
    this.parts().flatMap((part, partIndex) =>
      partPrompts(part).map((prompt, i) => ({
        ...prompt,
        partId: part.id,
        partNumber: part.number,
        partIndex,
        n: i + 1,
      })),
    ),
  );
  readonly unansweredPrompts = computed(() =>
    this.prompts().filter((p) => !isResponded(this.answers(), p.id)),
  );

  /** Id of the attempt being taken (earlier ones are archived as `<examId>-1..n`). */
  readonly attemptId = computed(() => {
    const id = this.examId();
    return id ? currentAttemptId(id, this.progress()?.attempts.length ?? 0) : '';
  });

  readonly score = computed<Score>(() =>
    scoreItems(
      this.sectionItems().map((p) => p.item),
      this.answers(),
    ),
  );
  /** Marked items when the section has some, else free-response prompts (speaking). */
  readonly answeredCount = computed(() =>
    this.sectionItems().length > 0
      ? this.score().answered
      : this.prompts().length - this.unansweredPrompts().length,
  );
  readonly totalCount = computed(() =>
    this.sectionItems().length > 0 ? this.score().total : this.prompts().length,
  );
  readonly unanswered = computed(() =>
    this.sectionItems().filter((p) => !isAnswered(this.answers()[p.item.id])),
  );
  readonly flaggedItems = computed(() => {
    const flagged = new Set(this.session().flagged);
    return this.sectionItems().filter((p) => flagged.has(p.item.id));
  });

  // ---- Timer ----
  readonly elapsed = signal(0);
  readonly limitSeconds = computed(() => (this.section()?.timeLimitMinutes ?? 0) * 60);
  /** Seconds left; negative once the time is over (the learner may keep going). */
  readonly remaining = computed(() => this.limitSeconds() - this.elapsed());
  /** Latest timer warning, for an `aria-live="polite"` region. */
  readonly timerNotice = signal('');

  /** The recording transcript may be shown after submitting, or any time in practice mode. */
  readonly transcriptAllowed = computed(() => this.locked() || !this.examMode());
  /** Exam mode allows two plays per recording, as in the real exam; practice mode is unlimited. */
  readonly maxListens = computed(() => (this.examMode() ? 2 : Infinity));

  constructor() {
    const key = computed(() => {
      const id = this.examId();
      return id && this.section() ? `${id}/${this.skill()}` : null;
    });
    effect((onCleanup) => {
      if (!key() || this.locked()) return;
      untracked(() => {
        this.elapsed.set(this.session().elapsed[this.skill()] ?? 0);
        this.timerNotice.set('');
      });
      const timer = setInterval(() => untracked(() => this.tick()), 1000);
      onCleanup(() => {
        clearInterval(timer);
        untracked(() => this.persistElapsed());
      });
    });
    // Remembers the section the learner is in, so "Continue" opens the same place.
    effect(() => {
      const id = this.examId();
      const skill = this.skill();
      if (!id || !this.section()) return;
      untracked(() => {
        if (this.progress()?.session?.skill !== skill) {
          this.storage.updateSession(id, (s) => ({ ...s, skill }), skill);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.persistElapsed());
  }

  /** Called once a second while a section is open and unlocked. */
  tick(): void {
    if (typeof document !== 'undefined' && document.hidden) return;
    const next = this.elapsed() + 1;
    this.elapsed.set(next);
    const left = this.limitSeconds() - next;
    if (left === 300) this.timerNotice.set('5 minutes left.');
    else if (left === 60) this.timerNotice.set('1 minute left.');
    else if (left === 0) {
      this.timerNotice.set('Time is up. You can finish your answers and submit.');
    }
    if (next % SAVE_EVERY_SECONDS === 0) this.persistElapsed();
  }

  private persistElapsed(): void {
    const id = this.examId();
    const skill = this.skill();
    if (!id || !this.section()) return;
    const value = this.elapsed();
    if (value === (this.progress()?.session?.elapsed[skill] ?? 0)) return;
    this.storage.updateSession(
      id,
      (s) => ({ ...s, elapsed: { ...s.elapsed, [skill]: value } }),
      skill,
    );
  }

  // ---- Reading state ----
  answer(itemId: string): AnswerValue | undefined {
    return this.answers()[itemId];
  }

  isFlagged(itemId: string): boolean {
    return this.session().flagged.includes(itemId);
  }

  listens(key: string): number {
    return this.session().listens[key] ?? 0;
  }

  /** True when feedback may be shown: section submitted, or part checked in practice mode. */
  isRevealed(itemId: string): boolean {
    const placed = this.itemIndex().get(itemId);
    if (!placed) return false;
    if (this.progress()?.sectionStatus[placed.skill] === 'completed') return true;
    return !this.examMode() && this.session().checked.includes(placed.partId);
  }

  isPartRevealed(partId: string): boolean {
    const first = this.itemsByPart().get(partId)?.[0];
    return first ? this.isRevealed(first.item.id) : false;
  }

  feedback(itemId: string): ItemFeedback | null {
    if (!this.isRevealed(itemId)) return null;
    const placed = this.itemIndex().get(itemId);
    if (!placed) return null;
    const value = this.answers()[itemId];
    return {
      answered: isAnswered(value),
      correct: isCorrect(placed.item, value),
      correctText: formatCorrect(placed.item),
      correctValue: placed.item.correct,
      explanation: placed.item.explanation,
    };
  }

  // ---- Changes ----
  setAnswer(itemId: string, value: AnswerValue): void {
    const id = this.examId();
    if (!id || this.locked()) return;
    this.storage.setAnswer(id, itemId, value);
    if (this.sectionStatus() === 'not-started') {
      this.storage.setSectionStatus(id, this.skill(), 'in-progress');
    }
  }

  removeAnswer(itemId: string): void {
    const id = this.examId();
    if (!id || this.locked()) return;
    this.storage.removeAnswer(id, itemId);
  }

  toggleFlag(itemId: string): void {
    const id = this.examId();
    if (!id || this.locked()) return;
    this.storage.updateSession(
      id,
      (s) => ({
        ...s,
        flagged: s.flagged.includes(itemId)
          ? s.flagged.filter((f) => f !== itemId)
          : [...s.flagged, itemId],
      }),
      this.skill(),
    );
  }

  goToPart(index: number): void {
    const id = this.examId();
    const part = this.parts()[index];
    if (!id || !part) return;
    const skill = this.skill();
    this.storage.updateSession(
      id,
      (s) => ({ ...s, parts: { ...s.parts, [skill]: part.id } }),
      skill,
    );
  }

  /** Practice mode: reveal marking and explanations for one part. */
  checkPart(partId: string): void {
    const id = this.examId();
    if (!id || this.examMode()) return;
    this.storage.updateSession(
      id,
      (s) => (s.checked.includes(partId) ? s : { ...s, checked: [...s.checked, partId] }),
      this.skill(),
    );
  }

  partScore(partId: string): Score {
    const items = this.itemsByPart().get(partId) ?? [];
    if (items.length === 0) {
      const prompts = this.prompts().filter((p) => p.partId === partId);
      const answered = prompts.filter((p) => isResponded(this.answers(), p.id)).length;
      return { correct: 0, total: prompts.length, answered };
    }
    return scoreItems(
      items.map((p) => p.item),
      this.answers(),
    );
  }

  /** Counts one more start of a recording from its beginning. */
  addListen(key: string): void {
    const id = this.examId();
    if (!id) return;
    this.storage.updateSession(
      id,
      (s) => ({ ...s, listens: { ...s.listens, [key]: (s.listens[key] ?? 0) + 1 } }),
      this.skill(),
    );
  }

  /** Marks the open section as finished and saves its score. Answers become read-only. */
  submitSection(): void {
    const id = this.examId();
    if (!id || this.locked()) return;
    this.persistElapsed();
    const { correct, total } = this.score();
    // Sections without marked items (speaking) are only marked as completed; they have no score.
    if (total > 0) {
      this.storage.setResult(id, this.skill(), {
        correct,
        total,
        completedAt: new Date().toISOString(),
      });
    }
    this.storage.setSectionStatus(id, this.skill(), 'completed');
  }

  /** Archives the current attempt and starts an empty one. */
  retry(): void {
    const id = this.examId();
    if (id) this.storage.startNewAttempt(id);
    this.elapsed.set(0);
  }
}
