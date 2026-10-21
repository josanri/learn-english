import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Horizontal progress bar. `value` is a fraction from 0 to 1. */
@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    '[attr.aria-label]': 'label()',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percent()',
  },
  template: `<span class="fill" [style.width.%]="percent()"></span>`,
  styles: `
    :host {
      display: block;
      height: 0.75rem;
      overflow: hidden;
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius-pill);
      background: var(--surface-2);
    }
    .fill {
      display: block;
      height: 100%;
      background: var(--accent-strong);
      transition: width calc(var(--dur) * 4);
    }
  `,
})
export class ProgressBar {
  readonly value = input(0);
  readonly label = input('Progress');
  protected readonly percent = computed(() =>
    Math.round(Math.min(1, Math.max(0, this.value())) * 100),
  );
}
