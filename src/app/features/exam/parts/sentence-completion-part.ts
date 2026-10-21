import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type {
  NoteCompletionPart,
  SentenceCompletionPart as SentenceCompletion,
} from '../../../models/exam';
import { AudioScriptPlayer } from '../ui/audio-script-player';
import { AnswerInput, FlagStrip } from '../ui/item-controls';
import { Passage, SplitLayout } from '../ui/layout';

const BLANK = '___';

/**
 * Complete sentences or notes by typing a word or short phrase. With a passage (reading) the text sits
 * beside the sentences; with a recording (listening notes) the player comes first.
 */
@Component({
  selector: 'app-sentence-completion-part',
  imports: [NgTemplateOutlet, SplitLayout, Passage, AnswerInput, AudioScriptPlayer, FlagStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (recording(); as rec) {
      <app-script-player [recording]="rec" [playKey]="part().id" label="Listen to the recording" />
    }
    @if (passage(); as text) {
      <app-split>
        <div left><app-passage [text]="text" /></div>
        <div right><ng-container [ngTemplateOutlet]="gaps" /></div>
      </app-split>
    } @else {
      <ng-container [ngTemplateOutlet]="gaps" />
    }
    <ng-template #gaps>
      @if (maxWords(); as max) {
        <p class="hint">
          Write no more than {{ max }} {{ max === 1 ? 'word' : 'words' }} in each gap.
        </p>
      } @else {
        <p class="hint">Write one word or a short phrase in each gap.</p>
      }
      <ol class="notes">
        @for (row of rows(); track row.id) {
          <li class="row-field">
            <span class="line">
              <span class="visually-hidden">Gap {{ row.n }}: </span>
              {{ row.before }}
              <app-answer-input [itemId]="row.id" [label]="row.label" />
              {{ row.after }}
            </span>
          </li>
        }
      </ol>
      <app-flag-strip [entries]="flagEntries()" />
    </ng-template>
  `,
  styles: `
    .notes {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
  `,
})
export class SentenceCompletionPart {
  readonly part = input.required<SentenceCompletion | NoteCompletionPart>();
  protected readonly passage = computed(() => {
    const p = this.part();
    return 'passage' in p ? p.passage : undefined;
  });
  protected readonly recording = computed(() => {
    const p = this.part();
    return 'recording' in p ? p.recording : undefined;
  });
  protected readonly maxWords = computed(() => {
    const p = this.part();
    return 'maxWords' in p ? p.maxWords : undefined;
  });
  /** Prompts with `___` put the input at the blank; prompts without it get the input after the text. */
  protected readonly rows = computed(() =>
    this.part().gaps.map((gap, i) => {
      const at = gap.prompt.indexOf(BLANK);
      const before = at >= 0 ? gap.prompt.slice(0, at) : gap.prompt;
      const after = at >= 0 ? gap.prompt.slice(at + BLANK.length) : '';
      return {
        id: gap.id,
        n: i + 1,
        before,
        after,
        label: `Gap ${i + 1}: ${gap.prompt.replace(BLANK, 'blank')}`,
      };
    }),
  );
  protected readonly flagEntries = computed(() =>
    this.part().gaps.map((g, i) => ({ id: g.id, label: `Gap ${i + 1}` })),
  );
}
