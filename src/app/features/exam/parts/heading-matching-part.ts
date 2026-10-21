import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { HeadingMatchingPart as HeadingMatching } from '../../../models/exam';
import { LETTERS } from '../engine/scoring';
import { SelectRow } from '../ui/item-controls';

/** Reading: choose the best heading for each paragraph. */
@Component({
  selector: 'app-heading-matching-part',
  imports: [SelectRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Headings</h3>
    <ul class="headings">
      @for (h of options(); track h.value) {
        <li class="text-card">{{ h.label }}</li>
      }
    </ul>
    @for (row of rows(); track row.id) {
      <article class="text-card">
        <h3>Paragraph {{ row.n }}</h3>
        {{ row.text }}
      </article>
      <app-select-row [itemId]="row.id" [label]="row.label" [options]="options()" />
    }
  `,
  styles: `
    .headings {
      margin: 0 0 var(--space-5);
      padding: 0;
      list-style: none;
    }
    .headings li {
      margin-bottom: var(--space-2);
      padding-block: var(--space-2);
    }
  `,
})
export class HeadingMatchingPart {
  readonly part = input.required<HeadingMatching>();
  protected readonly options = computed(() =>
    this.part().headings.map((h, i) => ({ value: LETTERS[i], label: `${LETTERS[i]}. ${h}` })),
  );
  protected readonly rows = computed(() =>
    this.part().gaps.map((gap, i) => ({
      id: gap.id,
      n: i + 1,
      text: this.part().paragraphs[i]?.text ?? '',
      label: `Heading for paragraph ${i + 1}`,
    })),
  );
}
