import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Icon } from '../../../shared/ui';
import { LETTERS } from '../engine/scoring';
import { ExamSessionStore } from '../session/exam-session.store';

export interface ChoiceOption {
  value: string | number;
  label: string;
}

/** Shows the marking of one item (correct / not quite, right answer, explanation) once it is revealed. */
@Component({
  selector: 'app-item-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fb(); as f) {
      <div class="fb" [attr.data-ok]="f.correct">
        <span class="verdict">{{
          f.correct ? 'Correct' : f.answered ? 'Not quite' : 'Not answered'
        }}</span>
        @if (!f.correct && showAnswer()) {
          <span> &middot; Answer: {{ f.correctText }}</span>
        }
        @if (f.explanation) {
          <p>{{ f.explanation }}</p>
        }
      </div>
    }
  `,
})
export class ItemFeedback {
  readonly itemId = input.required<string>();
  readonly showAnswer = input(true);
  private readonly store = inject(ExamSessionStore);
  protected readonly fb = computed(() => this.store.feedback(this.itemId()));
}

/** Toggle to mark an item to come back to. Shown in the question navigator. */
@Component({
  selector: 'app-flag-button',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="flag"
      [attr.aria-pressed]="flagged()"
      [disabled]="store.locked()"
      (click)="store.toggleFlag(itemId())"
    >
      <app-icon name="flag" [size]="18" />
      {{ flagged() ? 'Flagged for review' : 'Flag for review' }}
    </button>
  `,
})
export class FlagButton {
  readonly itemId = input.required<string>();
  protected readonly store = inject(ExamSessionStore);
  protected readonly flagged = computed(() => this.store.isFlagged(this.itemId()));
}

/**
 * One question with native radio buttons in a fieldset (multiple choice, true/false/not given).
 * `number` is the position inside the part.
 */
@Component({
  selector: 'app-choice-question',
  imports: [FlagButton, ItemFeedback],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="q" tabindex="-1" [id]="'q-' + itemId()" [disabled]="store.locked()">
      <legend>
        <span class="num"><span class="visually-hidden">Question </span>{{ number() }}</span>
        {{ prompt() }}
      </legend>
      <div>
        @for (option of options(); track option.value; let i = $index) {
          <label class="opt" [attr.data-mark]="mark(option.value)">
            <input
              type="radio"
              [name]="itemId()"
              [checked]="store.answer(itemId()) === option.value"
              (change)="store.setAnswer(itemId(), option.value)"
            />
            @if (letters()) {
              <span class="letter" aria-hidden="true">{{ letter(i) }}</span>
            }
            <span class="label">{{ option.label }}</span>
            @if (tag(option.value); as text) {
              <span class="tag">{{ text }}</span>
            }
          </label>
        }
      </div>
      <app-flag-button [itemId]="itemId()" />
      <app-item-feedback [itemId]="itemId()" [showAnswer]="false" />
    </fieldset>
  `,
})
export class ChoiceQuestion {
  readonly itemId = input.required<string>();
  readonly number = input.required<number>();
  readonly prompt = input.required<string>();
  readonly options = input.required<readonly ChoiceOption[]>();
  /** Show A, B, C beside the options. */
  readonly letters = input(true);
  protected readonly store = inject(ExamSessionStore);
  private readonly fb = computed(() => this.store.feedback(this.itemId()));

  protected letter(index: number): string {
    return LETTERS[index] ?? '';
  }

  protected mark(value: string | number): 'correct' | 'wrong' | null {
    const f = this.fb();
    if (!f) return null;
    if (f.correctValue === value) return 'correct';
    return this.store.answer(this.itemId()) === value ? 'wrong' : null;
  }

  protected tag(value: string | number): string {
    const mark = this.mark(value);
    if (mark === 'correct') return 'Correct answer';
    return mark === 'wrong' ? 'Your answer' : '';
  }
}

/** A drop-down answer (matching, gapped text, headings). Accessible name comes from `label`. */
@Component({
  selector: 'app-answer-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibleLabel()) {
      <label [for]="id()">{{ label() }}</label>
    } @else {
      <label class="visually-hidden" [for]="id()">{{ label() }}</label>
    }
    <span class="gap">
      <select
        [id]="id()"
        [disabled]="store.locked()"
        [attr.data-state]="state()"
        (change)="onChange($event)"
      >
        <option value="" [selected]="!answered()">{{ placeholder() }}</option>
        @for (option of options(); track option.value) {
          <option [value]="option.value" [selected]="store.answer(itemId()) === option.value">
            {{ option.label }}
          </option>
        }
      </select>
      @if (fb(); as f) {
        <span class="gap-fb" [attr.data-ok]="f.correct">{{
          f.correct ? 'Correct' : 'Answer: ' + f.correctText
        }}</span>
      }
    </span>
  `,
})
export class AnswerSelect {
  readonly itemId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly ChoiceOption[]>();
  readonly placeholder = input('Choose');
  readonly visibleLabel = input(false);
  protected readonly store = inject(ExamSessionStore);
  protected readonly id = computed(() => `sel-${this.itemId()}`);
  protected readonly fb = computed(() => this.store.feedback(this.itemId()));
  protected readonly answered = computed(() => this.store.answer(this.itemId()) !== undefined);
  protected readonly state = computed(() => {
    const f = this.fb();
    return f ? (f.correct ? 'correct' : 'wrong') : null;
  });

  protected onChange(event: Event): void {
    const index = (event.target as HTMLSelectElement).selectedIndex - 1;
    const option = this.options()[index];
    this.store.setAnswer(this.itemId(), option ? option.value : '');
  }
}

/** A short typed answer (open cloze, notes). */
@Component({
  selector: 'app-answer-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibleLabel()) {
      <label [for]="id()">{{ label() }}</label>
    } @else {
      <label class="visually-hidden" [for]="id()">{{ label() }}</label>
    }
    <span class="gap">
      <input
        type="text"
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        [id]="id()"
        [value]="value()"
        [disabled]="store.locked()"
        [attr.data-state]="state()"
        (input)="onInput($event)"
      />
      @if (fb(); as f) {
        <span class="gap-fb" [attr.data-ok]="f.correct">{{
          f.correct ? 'Correct' : 'Answer: ' + f.correctText
        }}</span>
      }
    </span>
  `,
})
export class AnswerInput {
  readonly itemId = input.required<string>();
  readonly label = input.required<string>();
  readonly visibleLabel = input(false);
  protected readonly store = inject(ExamSessionStore);
  protected readonly id = computed(() => `in-${this.itemId()}`);
  protected readonly value = computed(() => String(this.store.answer(this.itemId()) ?? ''));
  protected readonly fb = computed(() => this.store.feedback(this.itemId()));
  protected readonly state = computed(() => {
    const f = this.fb();
    return f ? (f.correct ? 'correct' : 'wrong') : null;
  });

  protected onInput(event: Event): void {
    this.store.setAnswer(this.itemId(), (event.target as HTMLInputElement).value);
  }
}

/** Options for a multiple-choice question: the value is the zero-based option index. */
export function choiceOptions(options: readonly string[]): ChoiceOption[] {
  return options.map((label, value) => ({ value, label }));
}

/** A labelled drop-down row with flag and feedback (matching tasks). */
@Component({
  selector: 'app-select-row',
  imports: [AnswerSelect, FlagButton, ItemFeedback],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row-field">
      <app-answer-select
        [itemId]="itemId()"
        [label]="label()"
        [options]="options()"
        [visibleLabel]="true"
      />
      <div>
        <app-flag-button [itemId]="itemId()" />
      </div>
      <app-item-feedback [itemId]="itemId()" [showAnswer]="false" />
    </div>
  `,
})
export class SelectRow {
  readonly itemId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly ChoiceOption[]>();
}

/** Flag toggles for questions that sit inside a passage (gaps), one compact button each. */
@Component({
  selector: 'app-flag-strip',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="strip" role="group" aria-label="Flag gaps for review">
      @for (entry of entries(); track entry.id) {
        <button
          type="button"
          class="flag"
          [attr.aria-pressed]="store.isFlagged(entry.id)"
          [disabled]="store.locked()"
          (click)="store.toggleFlag(entry.id)"
        >
          <app-icon name="flag" [size]="16" />
          {{ entry.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .strip {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    .flag {
      margin: 0;
    }
    /* Phones: equal buttons that fill every row, instead of a last button alone on a row. */
    @media (max-width: 30rem) {
      .strip {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(5.5rem, 1fr));
      }
      .flag {
        justify-content: center;
      }
    }
  `,
})
export class FlagStrip {
  readonly entries = input.required<readonly { id: string; label: string }[]>();
  protected readonly store = inject(ExamSessionStore);
}
