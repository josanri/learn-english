import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { examStatus, type ExamStatus } from '../../core/progress';
import { LocalStorageService } from '../../core/storage.service';
import { ExamCatalogueService } from '../../data/exam-catalogue.service';
import { EXAM_CATEGORIES, type ExamCategoryInfo } from '../../data/exam-categories';
import type { ExamSummary } from '../../models/exam';
import { ProgressSummary } from '../progress/progress-summary';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  Icon,
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
  category: ExamCategoryInfo;
  status: ExamStatus;
}

/** `/exams/b1`: exams grouped by board, filterable by format, with saved progress for each. */
@Component({
  selector: 'app-level-page',
  imports: [
    RouterLink,
    Badge,
    Button,
    Chip,
    EmptyState,
    Icon,
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

      <div class="fold-side">
        <div class="summary">
          <app-progress-summary [exams]="allExams()" />
        </div>

        @if (formats.length > 2) {
          <div class="filter">
            <app-segmented-control label="Exam format" [options]="formats" [(value)]="format" />
          </div>
        }

        @if (topics().length > 1) {
          <div class="topics">
            <label for="topic-filter">Topic</label>
            <select id="topic-filter" [value]="topic()" (change)="onTopicChange($event)">
              <option value="all" [selected]="topic() === 'all'">
                <app-icon name="grid" [size]="16" />All topics ({{ allExams().length }})
              </option>
              @for (t of topics(); track t.id) {
                <option [value]="t.id" [selected]="topic() === t.id">
                  <app-icon [name]="t.icon" [size]="16" />{{ t.name }} ({{ t.count }})
                </option>
              }
            </select>
          </div>
        }
      </div>

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
          heading="No exams match these filters"
          description="Try another format or topic."
          icon="info"
        >
          <button appButton type="button" (click)="resetFilters()">Show all exams</button>
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
                    <app-chip
                      ><app-icon [name]="card.category.icon" [size]="16" />{{
                        card.exam.theme
                      }}</app-chip
                    >
                    <app-progress-ring
                      [value]="card.status.fraction"
                      [size]="56"
                      [label]="'Sections completed in ' + card.exam.title"
                    />
                  </div>
                  <h3>
                    <a
                      [routerLink]="['/exams', level(), card.exam.board, card.exam.id, 'reading']"
                      >{{ card.exam.title }}</a
                    >
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
    .topics {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      margin-block: var(--space-5) var(--space-7);
    }
    .topics label {
      font-size: var(--step--1);
      font-weight: 700;
      color: var(--text-muted);
    }
    .topics select {
      min-height: var(--target);
      max-width: 100%;
      padding: 0 var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font: inherit;
      font-size: var(--step--1);
      font-weight: 700;
      cursor: pointer;
    }
    .topics select:hover {
      background: var(--surface-2);
    }
    /* Customisable select: options may hold icons. Other browsers show a plain list of names. */
    @supports (appearance: base-select) {
      .topics select,
      .topics select::picker(select) {
        appearance: base-select;
      }
      .topics select {
        display: inline-flex;
        align-items: center;
        gap: var(--space-3);
        padding-block: 0;
      }
      .topics select::picker(select) {
        margin-top: var(--space-1);
        background: var(--bg);
        max-block-size: 24rem;
      }
      .topics option {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-height: var(--target);
        padding: 0 var(--space-3);
        border-radius: var(--radius);
        cursor: pointer;
      }
      .topics option::checkmark {
        display: none;
      }
      .topics option:hover {
        background: var(--surface-2);
      }
      .topics option:checked {
        background: var(--text);
        color: var(--bg);
      }
    }
    .topics select:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 3px;
    }
    .group {
      margin-bottom: var(--space-8);
    }
    .fold-side + .group {
      margin-top: var(--space-7);
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

  protected readonly topic = signal('all');

  /** Topics that have at least one exam, in the order of `EXAM_CATEGORIES`, with their exam count. */
  protected readonly topics = computed(() => {
    const counts = new Map<string, number>();
    for (const exam of this.allExams()) {
      const id = exam.category in EXAM_CATEGORIES ? exam.category : 'misc';
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return Object.entries(EXAM_CATEGORIES)
      .filter(([id]) => counts.has(id))
      .map(([id, info]) => ({ id, ...info, count: counts.get(id) ?? 0 }));
  });

  protected onTopicChange(event: Event): void {
    this.topic.set((event.target as HTMLSelectElement).value);
  }

  protected resetFilters(): void {
    this.format.set('all');
    this.topic.set('all');
  }

  protected readonly groups = computed(() => {
    const data = this.index.hasValue() ? this.index.value() : undefined;
    if (!data) return [];
    const format = this.format();
    const topic = this.topic();
    const progress = this.store.progress();
    return data.boards
      .filter((board) => format === 'all' || board.id.startsWith(format))
      .map((board) => ({
        ...board,
        cards: data.exams
          .filter((e): e is ExamSummary => e.board === board.id)
          .filter(
            (e) => topic === 'all' || (EXAM_CATEGORIES[e.category] ? e.category : 'misc') === topic,
          )
          .map((exam): ExamCard => ({
            exam,
            // An index cached before categories existed has none: fall back to the generic icon.
            category: EXAM_CATEGORIES[exam.category] ?? EXAM_CATEGORIES.misc,
            status: examStatus(exam, progress[exam.id]),
          })),
      }))
      .filter((group) => group.cards.length > 0);
  });
}
