import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { OpinionMatchingPart as OpinionMatching } from '../../../models/exam';
import { LETTERS } from '../engine/scoring';
import { AudioScriptPlayer } from '../ui/audio-script-player';
import { SelectRow } from '../ui/item-controls';

/** Listening: match each speaker (or question) to one of the lettered options. */
@Component({
  selector: 'app-opinion-matching-part',
  imports: [AudioScriptPlayer, SelectRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-script-player
      [recording]="part().recording"
      [playKey]="part().id"
      label="Listen to the recording"
    />
    <h3>Options</h3>
    <ul class="options">
      @for (o of options(); track o.value) {
        <li class="text-card">{{ o.label }}</li>
      }
    </ul>
    @for (row of rows(); track row.id) {
      <app-select-row [itemId]="row.id" [label]="row.label" [options]="options()" />
    }
  `,
  styles: `
    .options {
      margin: 0 0 var(--space-5);
      padding: 0;
      list-style: none;
    }
    .options li {
      margin-bottom: var(--space-2);
      padding-block: var(--space-2);
    }
  `,
})
export class OpinionMatchingPart {
  readonly part = input.required<OpinionMatching>();
  protected readonly options = computed(() =>
    this.part().options.map((o, i) => ({ value: LETTERS[i], label: `${LETTERS[i]}. ${o}` })),
  );
  protected readonly rows = computed(() =>
    this.part().gaps.map((gap, i) => ({ id: gap.id, label: `${i + 1}. ${gap.prompt}` })),
  );
}
