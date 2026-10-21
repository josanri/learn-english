import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OpenClozePart as OpenCloze } from '../../../models/exam';
import { AnswerInput, FlagStrip } from '../ui/item-controls';
import { Passage } from '../ui/layout';

/** Reading: type one word in each gap of the text. */
@Component({
  selector: 'app-open-cloze-part',
  imports: [Passage, AnswerInput, FlagStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-passage [text]="part().passage">
      <ng-template let-n>
        <app-answer-input [itemId]="gapId(n)" [label]="'Gap ' + n" />
      </ng-template>
    </app-passage>
    <app-flag-strip [entries]="flagEntries()" />
  `,
})
export class OpenClozePart {
  readonly part = input.required<OpenCloze>();
  protected readonly flagEntries = computed(() =>
    this.part().gaps.map((g, i) => ({ id: g.id, label: `Gap ${i + 1}` })),
  );

  protected gapId(n: number): string {
    return this.part().gaps[n - 1]?.id ?? `${this.part().id}-gap-${n}`;
  }
}
