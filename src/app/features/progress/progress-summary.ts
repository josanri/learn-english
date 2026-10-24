import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { computeStats, weakAreas } from '../../core/stats';
import { LocalStorageService } from '../../core/storage.service';
import type { ExamSummary } from '../../models/exam';
import { Button, Card, Icon, ProgressRing } from '../../shared/ui';
import { mistakeCounts } from '../mistakes/mistake-queue';
import { InsightsService } from './insights.service';
import { WeakAreasList } from './weak-areas-list';
import { GRAMMAR_TAGS, isGrammarTag } from '../../models/grammar-tags';
import { partTypeInfo } from '../../models/part-labels';

/**
 * Overall progress for a list of exams, derived from the saved document: exams completed, average
 * per skill, practice streak, a "Continue" shortcut to the exam in progress, the weak areas and the
 * mistakes waiting for practice. Used on Home and /exams/b1.
 */
@Component({
  selector: 'app-progress-summary',
  imports: [RouterLink, Button, Card, Icon, ProgressRing, WeakAreasList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <app-card [raised]="true">
        <h2 id="progress-title">Your progress</h2>
        <div class="grid">
          <div class="ring">
            <app-progress-ring
              [value]="stats().total ? stats().completed / stats().total : 0"
              [size]="88"
              [text]="stats().completed + '/' + stats().total"
              label="Exams completed"
            />
            <p>
              exams<br />
              completed
            </p>
          </div>
          <dl class="stats">
            <div>
              <dt>Reading average</dt>
              <dd class="mono">{{ percentText('reading') }}</dd>
            </div>
            <div>
              <dt>Listening average</dt>
              <dd class="mono">{{ percentText('listening') }}</dd>
            </div>
            <div>
              <dt>Practice streak</dt>
              <dd class="mono">{{ stats().streak }} {{ stats().streak === 1 ? 'day' : 'days' }}</dd>
            </div>
          </dl>
        </div>
        @if (stats().continueTarget; as target) {
          <div class="continue">
            <p>
              <span class="muted">In progress:&nbsp;</span><strong>{{ target.exam.title }}</strong>
            </p>
            <a
              appButton
              variant="primary"
              size="sm"
              [routerLink]="[
                '/exams',
                target.exam.level.toLowerCase(),
                target.exam.board,
                target.exam.id,
                target.skill,
              ]"
            >
              Continue
              <app-icon name="arrow" [size]="18" />
            </a>
          </div>
        }
        @if (hasWeakAreas() || mistakes().due + mistakes().waiting > 0) {
          <div class="weak">
            @if (hasWeakAreas()) {
              <!-- Closed by default: the lists are long and the rest of the card comes first. -->
              <details>
                <summary>
                  <span class="weak-title">Your weak areas</span>
                  @if (weakest(); as w) {
                    <span class="muted weakest">Weakest: {{ w.label }} ({{ w.percent }}%)</span>
                  }
                  <app-icon class="chevron" name="arrow" [size]="18" />
                </summary>
                <app-weak-areas-list [areas]="weak()" headingId="summary-weak" />
              </details>
            }
            <p class="mistakes">
              <span>
                @if (mistakes().due > 0) {
                  <strong>{{ mistakes().due }}</strong>
                  {{ mistakes().due === 1 ? 'mistake is' : 'mistakes are' }} ready to practise
                  again.
                } @else {
                  No mistakes to practise now. The next ones come back later.
                }
              </span>
              <a appButton size="sm" routerLink="/practice/mistakes">
                My mistakes
                <app-icon name="arrow" [size]="18" />
              </a>
            </p>
          </div>
        }
      </app-card>
    }
  `,
  styles: `
    h2 {
      margin-bottom: var(--space-4);
      font-size: var(--step-2);
    }
    .grid {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-5) var(--space-6);
    }
    .ring {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .ring p {
      margin: 0;
      color: var(--text-muted);
      font-size: var(--step--1);
      line-height: 1.3;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4) var(--space-6);
      margin: 0;
    }
    dt {
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    dd {
      margin: 0;
      font-size: var(--step-2);
      font-weight: 700;
    }
    .continue {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-5);
      padding-top: var(--space-4);
      border-top: var(--bw) solid var(--border-muted);
    }
    .continue p {
      margin: 0;
    }
    .weak {
      margin-top: var(--space-5);
      padding-top: var(--space-4);
      border-top: var(--bw) solid var(--border-muted);
    }
    summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-3);
      min-height: var(--target);
      cursor: pointer;
      list-style: none;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .weak-title {
      font-size: var(--step-1);
      font-weight: 700;
    }
    .weakest {
      font-size: var(--step--1);
    }
    .chevron {
      margin-inline-start: auto;
      transform: rotate(90deg);
      transition: transform var(--dur);
    }
    details[open] .chevron {
      transform: rotate(-90deg);
    }
    details[open] > summary {
      margin-bottom: var(--space-3);
    }
    .mistakes {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin: var(--space-4) 0 0;
    }
  `,
})
export class ProgressSummary {
  readonly exams = input.required<readonly ExamSummary[]>();
  /** Hide the whole card until there is something to show. */
  readonly hideWhenEmpty = input(true);

  private readonly storage = inject(LocalStorageService);
  private readonly insights = inject(InsightsService);
  protected readonly stats = computed(() => computeStats(this.exams(), this.storage.state()));
  protected readonly weak = computed(() => weakAreas(this.storage.state()));
  /** The lowest part type or grammar point, shown on the closed summary line. */
  protected readonly weakest = computed(() => {
    const { parts, tags } = this.weak();
    const best = [...parts.slice(0, 1), ...tags.slice(0, 1)].sort(
      (a, b) => a.percent - b.percent,
    )[0];
    if (!best) return null;
    const label = isGrammarTag(best.id)
      ? GRAMMAR_TAGS[best.id].label
      : (partTypeInfo(best.id)?.label ?? best.id);
    return { label, percent: best.percent };
  });
  protected readonly hasWeakAreas = computed(
    () => this.weak().parts.length > 0 || this.weak().tags.length > 0,
  );
  protected readonly mistakes = computed(() =>
    mistakeCounts(this.storage.practice().mistakes, new Date()),
  );

  constructor() {
    // Results saved before the breakdown existed get it now (only exams with results are loaded).
    effect(() => {
      const exams = this.exams();
      if (exams.length) void untracked(() => this.insights.backfill(exams));
    });
  }
  protected readonly visible = computed(
    () => !this.hideWhenEmpty() || this.stats().started > 0 || this.stats().streak > 0,
  );

  protected percentText(skill: 'reading' | 'listening'): string {
    const value = this.stats().averages[skill];
    return value === undefined ? 'No data' : `${value}%`;
  }
}
