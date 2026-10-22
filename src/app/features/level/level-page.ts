import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { examStatus, type ExamStatus } from '../../core/progress';
import { LocalStorageService } from '../../core/storage.service';
import { ExamCatalogueService } from '../../data/exam-catalogue.service';
import type { ExamSummary } from '../../models/exam';
import { ProgressSummary } from '../progress/progress-summary';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ProgressRing,
  SegmentedControl,
  type SegmentOption,
} from '../../shared/ui';

/** Exam formats offered as filters. An exam belongs to a format when its board id starts with `value`. */
const FORMATS: SegmentOption[] = [
  { value: 'all', label: 'All formats' },
  { value: 'cambridge', label: 'Cambridge' },
];

interface ExamCard {
  exam: ExamSummary;
  status: ExamStatus;
}

/** `/b1`: exams grouped by board, filterable by format, with saved progress for each. */
@Component({
  selector: 'app-level-page',
  imports: [
    RouterLink,
    Badge,
    Button,
    Chip,
    EmptyState,
    ProgressRing,
    ProgressSummary,
    SegmentedControl,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">{{ level().toUpperCase() }} &middot; Intermediate</p>
      <h1>{{ level().toUpperCase() }} practice exams</h1>
      <p class="lede">
        Pick an exam. Your answers are saved on this device, so you can stop and come back.
      </p>

      <div class="summary">
        <app-progress-summary [exams]="allExams()" />
      </div>

      @if (formats.length > 2) {
        <div class="filter">
          <app-segmented-control label="Exam format" [options]="formats" [(value)]="format" />
        </div>
      }

      @if (index.isLoading()) {
        <p role="status" class="muted">Loading exams&hellip;</p>
      } @else if (index.error()) {
        <app-empty-state
          heading="The exam list could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="index.reload()">Try again</button>
        </app-empty-state>
      } @else if (groups().length === 0) {
        <app-empty-state
          heading="No exams in this format yet"
          description="New formats are added over time. Try another format."
          icon="info"
        >
          <button appButton type="button" (click)="format.set('all')">Show all formats</button>
        </app-empty-state>
      } @else {
        @for (group of groups(); track group.id) {
          <section class="group" [attr.aria-labelledby]="'board-' + group.id">
            <h2 class="section-title" [id]="'board-' + group.id">{{ group.name }}</h2>
            <p class="muted">{{ group.description }}</p>
            <ul class="exam-list">
              @for (card of group.cards; track card.exam.id) {
                <li class="exam">
                  <div class="top">
                    <app-chip>{{ card.exam.theme }}</app-chip>
                    <app-progress-ring
                      [value]="card.status.fraction"
                      [size]="56"
                      [label]="'Sections completed in ' + card.exam.title"
                    />
                  </div>
                  <h3>
                    <a [routerLink]="['/', level(), card.exam.board, card.exam.id, 'reading']">{{
                      card.exam.title
                    }}</a>
                  </h3>
                  <p class="muted">{{ card.exam.subtitle }}</p>
                  <div class="meta">
                    <app-chip [command]="true" [prompt]="false"
                      >{{ card.exam.estimatedMinutes }} min</app-chip
                    >
                    @switch (card.status.status) {
                      @case ('completed') {
                        <app-badge tone="success">
                          Completed
                          @if (card.status.scorePercent !== null) {
                            &middot; {{ card.status.scorePercent }}%
                          }
                        </app-badge>
                      }
                      @case ('in-progress') {
                        <app-badge tone="accent">In progress</app-badge>
                        @if (card.status.scorePercent !== null) {
                          <app-badge>Last score {{ card.status.scorePercent }}%</app-badge>
                        }
                      }
                      @default {
                        <app-badge>Not started</app-badge>
                      }
                    }
                  </div>
                </li>
              }
            </ul>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .summary {
      margin-top: var(--space-5);
    }
    .filter {
      margin-block: var(--space-5) var(--space-7);
    }
    .group {
      margin-bottom: var(--space-8);
    }
    .group .section-title {
      font-size: var(--step-3);
      margin-bottom: var(--space-2);
    }
    .exam-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
      gap: var(--space-6);
      margin: var(--space-5) 0 0;
      padding: 0 6px 0 0;
      list-style: none;
    }
    .exam {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: var(--space-4) var(--space-5) var(--space-5);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      box-shadow: 6px 6px 0 var(--shadow-solid);
      transition:
        transform var(--dur),
        box-shadow var(--dur);
    }
    .exam:hover,
    .exam:focus-within {
      transform: translate(-2px, -2px);
      box-shadow: 9px 9px 0 var(--shadow-solid);
    }
    .top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }
    h3 {
      margin-bottom: var(--space-2);
      font-size: var(--step-2);
    }
    h3 a {
      color: var(--text);
      text-decoration: none;
    }
    h3 a::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
    }
    h3 a:focus-visible {
      outline: none;
    }
    h3 a:focus-visible::after {
      outline: 3px solid var(--focus-ring);
      outline-offset: 4px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-top: auto;
      padding-top: var(--space-3);
    }
    .exam p {
      margin-bottom: var(--space-3);
    }
  `,
})
export class LevelPage {
  /** Bound from the route data (`level`), for example `b1`. */
  readonly level = input.required<string>();

  private readonly store = inject(LocalStorageService);
  protected readonly index = inject(ExamCatalogueService).levelIndex(this.level);
  protected readonly formats = FORMATS;
  protected readonly format = signal('all');

  protected readonly allExams = computed(() =>
    this.index.hasValue() ? this.index.value().exams : [],
  );

  protected readonly groups = computed(() => {
    const data = this.index.hasValue() ? this.index.value() : undefined;
    if (!data) return [];
    const format = this.format();
    const progress = this.store.progress();
    return data.boards
      .filter((board) => format === 'all' || board.id.startsWith(format))
      .map((board) => ({
        ...board,
        cards: data.exams
          .filter((e): e is ExamSummary => e.board === board.id)
          .map((exam): ExamCard => ({ exam, status: examStatus(exam, progress[exam.id]) })),
      }))
      .filter((group) => group.cards.length > 0);
  });
}
