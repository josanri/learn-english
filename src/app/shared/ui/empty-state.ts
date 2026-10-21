import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from './icon';

/** Message for pages with nothing to show yet. Project an action (button or link) as content. */
@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-icon [name]="icon()" [size]="40" />
    <h2>{{ heading() }}</h2>
    @if (description()) {
      <p>{{ description() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--space-2);
      padding: var(--space-7) var(--space-4);
      border: var(--bw) dashed var(--border-muted);
      border-radius: var(--radius-lg);
      text-align: center;
    }
    h2 {
      margin: var(--space-2) 0 0;
      font-size: var(--step-2);
    }
    p {
      max-width: 28rem;
      margin: 0 0 var(--space-3);
      color: var(--text-muted);
    }
  `,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly description = input('');
  readonly icon = input<IconName>('info');
}
