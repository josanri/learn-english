import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ExamSessionStore } from '../session/exam-session.store';
import { RUBRIC, rubricKey, type RubricCriterionId } from '../parts/writing-prompts';

/**
 * Self-assessment against the four Cambridge writing criteria: the learner moves a 0 to 5 slider
 * for each. It is a reflection tool and never an official mark. A slider only counts once moved
 * (until then it shows "not rated").
 */
@Component({
  selector: 'app-writing-rubric',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="muted intro">
      Read your text again and rate it yourself. <strong>This is not an official mark.</strong> It
      only helps you see what to improve. 0 is very weak, 5 is very good.
    </p>
    @for (c of criteria; track c.id) {
      <div class="row">
        <label [for]="id(c.id)">
          <strong>{{ c.name }}</strong>
          <span class="question muted">{{ c.question }}</span>
        </label>
        <div class="control">
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            [id]="id(c.id)"
            [value]="value(c.id) ?? 0"
            [disabled]="store.locked()"
            [attr.aria-valuetext]="valueText(c.id)"
            (input)="rate(c.id, $event)"
          />
          <output class="mono" [for]="id(c.id)">{{ value(c.id) ?? '-' }}/5</output>
        </div>
        <p class="status muted">{{ valueText(c.id) }}</p>
      </div>
    }
    @if (average() !== null) {
      <p class="avg">
        Your self-rating: <strong class="mono">{{ average() }}</strong> out of 5 on average.
      </p>
    }
  `,
  styles: `
    .intro {
      margin-top: 0;
      font-size: var(--step--1);
    }
    .row {
      margin-bottom: var(--space-4);
    }
    label {
      display: block;
      margin-bottom: var(--space-1);
    }
    .question {
      display: block;
      font-size: var(--step--1);
    }
    .control {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    input[type='range'] {
      flex: 1;
      min-width: 0;
      min-height: var(--target);
    }
    output {
      min-width: 3.5ch;
      text-align: right;
    }
    .status {
      margin: 0;
      font-size: var(--step--1);
    }
    .avg {
      margin: 0;
    }
  `,
})
export class WritingRubric {
  readonly partId = input.required<string>();
  protected readonly store = inject(ExamSessionStore);
  protected readonly criteria = RUBRIC;

  protected id(criterion: RubricCriterionId): string {
    return `rubric-${this.partId()}-${criterion}`;
  }

  protected value(criterion: RubricCriterionId): number | null {
    const v = this.store.answers()[rubricKey(this.partId(), criterion)];
    return typeof v === 'number' ? v : null;
  }

  protected valueText(criterion: RubricCriterionId): string {
    const v = this.value(criterion);
    if (v === null) return 'Not rated yet';
    return ['Very weak', 'Weak', 'Not enough', 'Fair', 'Good', 'Very good'][v] ?? '';
  }

  protected readonly average = computed(() => {
    const values = RUBRIC.map((c) => this.value(c.id)).filter((v): v is number => v !== null);
    return values.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
      : null;
  });

  protected rate(criterion: RubricCriterionId, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.setAnswer(rubricKey(this.partId(), criterion), value);
  }
}
