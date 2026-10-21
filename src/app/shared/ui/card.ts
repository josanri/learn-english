import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Plain surface with a solid border. Wrap any content; set `raised` for the offset solid shadow. */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.raised]': 'raised()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
      padding: var(--space-5);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    :host(.raised) {
      border: var(--bw-card) solid var(--card-border);
      box-shadow: 6px 6px 0 var(--shadow-solid);
    }
  `,
})
export class Card {
  readonly raised = input(false);
}
