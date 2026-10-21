import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type {
  ListeningInterviewPart,
  ListeningMultipleChoicePart,
  MultipleChoiceClozePart,
  MultipleChoiceTextPart,
} from '../../../models/exam';
import { AudioScriptPlayer } from '../ui/audio-script-player';
import { ChoiceQuestion, choiceOptions } from '../ui/item-controls';
import { Passage, SplitLayout } from '../ui/layout';

type Source =
  | MultipleChoiceTextPart
  | MultipleChoiceClozePart
  | ListeningInterviewPart
  | ListeningMultipleChoicePart;

/**
 * Multiple-choice questions, optionally beside a passage (reading) or after a recording (listening).
 * Serves `multiple-choice`, `multiple-choice-cloze`, `listening-interview` and `listening-multiple-choice`.
 */
@Component({
  selector: 'app-text-questions-part',
  imports: [NgTemplateOutlet, SplitLayout, Passage, ChoiceQuestion, AudioScriptPlayer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (recording(); as rec) {
      <app-script-player [recording]="rec" [playKey]="part().id" label="Listen to the recording" />
    }
    @if (passage(); as text) {
      <app-split>
        <div left><app-passage [text]="text" /></div>
        <div right>
          <ng-container [ngTemplateOutlet]="questions" />
        </div>
      </app-split>
    } @else {
      <ng-container [ngTemplateOutlet]="questions" />
    }
    <ng-template #questions>
      @for (q of rows(); track q.id) {
        <app-choice-question
          [itemId]="q.id"
          [number]="q.n"
          [prompt]="q.prompt"
          [options]="q.options"
        />
      }
    </ng-template>
  `,
})
export class TextQuestionsPart {
  readonly part = input.required<Source>();
  protected readonly passage = computed(() => {
    const p = this.part();
    return 'passage' in p ? p.passage : undefined;
  });
  protected readonly recording = computed(() => {
    const p = this.part();
    return 'recording' in p ? p.recording : undefined;
  });
  protected readonly rows = computed(() =>
    this.part().questions.map((q, i) => ({
      id: q.id,
      n: i + 1,
      prompt: q.prompt,
      options: choiceOptions(q.options),
    })),
  );
}
