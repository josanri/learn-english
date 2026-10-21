import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { NoticesPart as Notices } from '../../../models/exam';
import { ChoiceQuestion, choiceOptions } from '../ui/item-controls';

/** Reading: short notices, one multiple-choice question each. */
@Component({
  selector: 'app-notices-part',
  imports: [ChoiceQuestion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (row of rows(); track row.id) {
      <blockquote class="text-card">
        <span class="visually-hidden">Notice {{ row.n }}: </span>{{ row.notice }}
      </blockquote>
      <app-choice-question
        [itemId]="row.id"
        [number]="row.n"
        [prompt]="row.prompt"
        [options]="row.options"
      />
    }
  `,
  styles: `
    blockquote {
      margin-bottom: var(--space-2);
      font-weight: 600;
    }
  `,
})
export class NoticesPart {
  readonly part = input.required<Notices>();
  protected readonly rows = computed(() =>
    this.part().questions.map((q, i) => ({
      id: q.id,
      n: i + 1,
      notice: this.part().notices[i] ?? '',
      prompt: q.prompt,
      options: choiceOptions(q.options),
    })),
  );
}
