import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RolePlayPart as RolePlay } from '../../../models/exam';
import { SpeakingResponse } from './speaking-response';

/** A simulated conversation: the situation, your role and cue cards, answered in one recording. */
@Component({
  selector: 'app-role-play-part',
  imports: [SpeakingResponse],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="situation">
      <p><strong>Situation:</strong> {{ part().situation }}</p>
      <p><strong>Your role:</strong> {{ part().roleDescription }}</p>
      <p><strong>Cover each point:</strong></p>
      <ul>
        @for (cue of part().cues; track cue) {
          <li>{{ cue }}</li>
        }
      </ul>
    </div>
    <app-speaking-response
      class="fold-panel"
      [itemId]="part().id"
      heading="Say your part of the conversation"
      hint="Speak as if the other person were answering you. Cover every cue."
      [partType]="part().type"
      [targetSeconds]="120"
    />
  `,
  styles: `
    .situation {
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-left-width: 6px;
      border-radius: var(--radius-sm);
      background: var(--surface);
    }
    p {
      margin-block: var(--space-2);
    }
    ul {
      margin: 0;
      padding-left: var(--space-5);
    }
  `,
})
export class RolePlayPart {
  readonly part = input.required<RolePlay>();
}
