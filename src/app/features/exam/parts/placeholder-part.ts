import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Part } from '../../../models/exam';

/** Stand-in renderer for part types that have no practice screen yet (writing, speaking, mediation). */
@Component({
  selector: 'app-placeholder-part',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="text-card" role="note">
      This kind of task ({{ part().type }}) does not have a practice screen yet. It is coming in a
      later update.
    </p>
  `,
})
export class PlaceholderPart {
  readonly part = input.required<Part>();
}
