import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FoldPosture } from '../../../core/fold-posture.service';
import type { PhotoDescriptionPart } from '../../../models/exam';
import { PrepTimer } from './prep-timer';
import { SpeakingImage } from './speaking-image';
import { SpeakingResponse } from './speaking-response';

/**
 * Part 2: one large photograph, optional preparation, then about one minute of speaking. On a split
 * screen the photographs stay in the page and the timers and recorders fill the other screen.
 */
@Component({
  selector: 'app-photo-part',
  imports: [NgTemplateOutlet, PrepTimer, SpeakingImage, SpeakingResponse],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (part().prompt) {
      <p class="task"><strong>Your task:</strong> {{ part().prompt }}</p>
    }
    @if (fold.folded()) {
      @for (image of part().images; track image.id; let first = $first) {
        <app-speaking-image [visual]="image" [eager]="first" />
      }
      <div class="fold-panel">
        @for (image of part().images; track image.id) {
          <ng-container
            [ngTemplateOutlet]="respond"
            [ngTemplateOutletContext]="{ $implicit: image }"
          />
        }
      </div>
    } @else {
      @for (image of part().images; track image.id; let first = $first) {
        <app-speaking-image [visual]="image" [eager]="first" />
        <ng-container
          [ngTemplateOutlet]="respond"
          [ngTemplateOutletContext]="{ $implicit: image }"
        />
      }
    }
    <ng-template #respond let-image>
      <app-prep-timer [seconds]="15" />
      <app-speaking-response
        [itemId]="image.id"
        [heading]="'Describe: ' + image.title"
        hint="Speak for about one minute. Say what you can see, where it is and how the people might feel."
        [partType]="part().type"
        [targetSeconds]="60"
      />
    </ng-template>
  `,
  styles: `
    .task {
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-left-width: 6px;
      border-radius: var(--radius-sm);
      background: var(--surface);
    }
  `,
})
export class PhotoPart {
  readonly part = input.required<PhotoDescriptionPart>();
  protected readonly fold = inject(FoldPosture);
}
