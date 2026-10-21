import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Short status label. Meaning is always in the text, colour is only reinforcement. */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0.15rem 0.6rem;
      border: var(--bw) solid currentColor;
      border-radius: var(--radius-sm);
      background: var(--bg);
      color: var(--text-muted);
      font-size: var(--step--1);
      font-weight: 700;
      line-height: 1.3;
      white-space: nowrap;
    }
    :host([data-tone='success']) {
      color: var(--success);
    }
    :host([data-tone='warning']) {
      color: var(--warning);
    }
    :host([data-tone='danger']) {
      color: var(--danger);
    }
    :host([data-tone='accent']) {
      color: var(--accent-text);
    }
  `,
})
export class Badge {
  readonly tone = input<'neutral' | 'accent' | 'success' | 'warning' | 'danger'>('neutral');
}
