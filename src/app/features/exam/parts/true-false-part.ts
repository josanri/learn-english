import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ListeningTrueFalsePart, TrueFalseNotGivenPart } from '../../../models/exam';
import { STATEMENT_CHOICES } from '../engine/scoring';
import { AudioScriptPlayer } from '../ui/audio-script-player';
import { ChoiceQuestion } from '../ui/item-controls';
import { Passage, SplitLayout } from '../ui/layout';

/** True / false / not given statements, after a passage (reading) or a recording (listening). */
@Component({
  selector: 'app-true-false-part',
  imports: [NgTemplateOutlet, SplitLayout, Passage, ChoiceQuestion, AudioScriptPlayer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (recording(); as rec) {
      <app-script-player [recording]="rec" [playKey]="part().id" label="Listen to the recording" />
    }
    @if (passage(); as text) {
      <app-split>
        <div left><app-passage [text]="text" /></div>
        <div right><ng-container [ngTemplateOutlet]="statements" /></div>
      </app-split>
    } @else {
      <ng-container [ngTemplateOutlet]="statements" />
    }
    <ng-template #statements>
      @for (s of part().statements; track s.id; let i = $index) {
        <app-choice-question
          [itemId]="s.id"
          [number]="i + 1"
          [prompt]="s.text"
          [options]="options()"
          [letters]="false"
        />
      }
    </ng-template>
  `,
})
export class TrueFalsePart {
  readonly part = input.required<TrueFalseNotGivenPart | ListeningTrueFalsePart>();
  protected readonly passage = computed(() => {
    const p = this.part();
    return 'passage' in p ? p.passage : undefined;
  });
  protected readonly recording = computed(() => {
    const p = this.part();
    return 'recording' in p ? p.recording : undefined;
  });
  /** "Not given" is offered in reading tasks, and in listening when a statement uses it. */
  protected readonly options = computed(() => {
    const p = this.part();
    const withNotGiven =
      p.type === 'true-false-notgiven' || p.statements.some((s) => s.answer === 'not-given');
    return STATEMENT_CHOICES.filter((c) => withNotGiven || c.value !== 'not-given').map((c) => ({
      value: c.value as string,
      label: c.label,
    }));
  });
}
