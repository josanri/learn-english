import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { computeStats } from '../../core/stats';
import { LocalStorageService } from '../../core/storage.service';
import type { ExamSummary } from '../../models/exam';
import { Button, Card, Icon, ProgressRing } from '../../shared/ui';

/**
 * Overall progress for a list of exams, derived from the saved document: exams completed, average
 * per skill, practice streak and a "Continue" shortcut to the exam in progress. Used on Home and /exams/b1.
 */
@Component({
  selector: 'app-progress-summary',
  imports: [RouterLink, Button, Card, Icon, ProgressRing],
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
  `,
})
export class ProgressSummary {
  readonly exams = input.required<readonly ExamSummary[]>();
  /** Hide the whole card until there is something to show. */
  readonly hideWhenEmpty = input(true);

  private readonly storage = inject(LocalStorageService);
  protected readonly stats = computed(() => computeStats(this.exams(), this.storage.state()));
  protected readonly visible = computed(
    () => !this.hideWhenEmpty() || this.stats().started > 0 || this.stats().streak > 0,
  );

  protected percentText(skill: 'reading' | 'listening'): string {
    const value = this.stats().averages[skill];
    return value === undefined ? 'No data' : `${value}%`;
  }
}
