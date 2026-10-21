import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { MatchingPart as Matching } from '../../../models/exam';
import { SelectRow } from '../ui/item-controls';
import { SplitLayout } from '../ui/layout';

/** Reading: match each person to one of the texts. Drop-downs, never drag and drop. */
@Component({
  selector: 'app-matching-part',
  imports: [SplitLayout, SelectRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-split leftLabel="Texts" rightLabel="People">
      <div left>
        @for (text of part().texts; track text.id) {
          <article class="text-card">
            <h3>
              <span class="tag">{{ text.id }}</span
              >{{ text.title }}
            </h3>
            {{ text.text }}
          </article>
        }
      </div>
      <div right>
        @for (row of rows(); track row.id) {
          <app-select-row [itemId]="row.id" [label]="row.label" [options]="options()" />
        }
      </div>
    </app-split>
  `,
})
export class MatchingPart {
  readonly part = input.required<Matching>();
  protected readonly options = computed(() =>
    this.part().texts.map((t, value) => ({ value, label: `${t.id}. ${t.title}` })),
  );
  protected readonly rows = computed(() =>
    this.part().questions.map((q, i) => ({
      id: q.id,
      label: `${i + 1}. ${q.prompt}: ${this.part().people[i]?.text ?? ''}`,
    })),
  );
}
