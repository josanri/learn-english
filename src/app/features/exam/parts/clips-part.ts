import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { GistDialoguesPart, ShortDialoguesPart } from '../../../models/exam';
import { AudioScriptPlayer } from '../ui/audio-script-player';
import { ChoiceQuestion, choiceOptions } from '../ui/item-controls';

/** Listening: several short recordings, one question each (`short-dialogues`, `gist-dialogues`). */
@Component({
  selector: 'app-clips-part',
  imports: [AudioScriptPlayer, ChoiceQuestion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (clip of rows(); track clip.id) {
      <app-script-player
        [recording]="clip.recording"
        [playKey]="clip.id"
        [label]="'Recording ' + clip.n"
      />
      <app-choice-question
        [itemId]="clip.questionId"
        [number]="clip.n"
        [prompt]="clip.prompt"
        [options]="clip.options"
      />
    }
  `,
})
export class ClipsPart {
  readonly part = input.required<ShortDialoguesPart | GistDialoguesPart>();
  protected readonly rows = computed(() =>
    this.part().clips.map((c, i) => ({
      id: c.id,
      n: i + 1,
      recording: c.recording,
      questionId: c.question.id,
      prompt: c.question.prompt,
      options: choiceOptions(c.question.options),
    })),
  );
}
