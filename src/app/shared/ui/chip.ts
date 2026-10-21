import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Small label. `command` renders a monospace "terminal" chip with a prompt sign, for IDs and timers. */
@Component({
  selector: 'app-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.command]': 'command()' },
  template: `@if (command()) {
      <span class="prompt" aria-hidden="true">$</span>
    }
    <ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.3rem 0.8rem;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius-pill);
      background: var(--bg);
      font-size: var(--step--1);
      font-weight: 600;
      line-height: 1.2;
    }
    :host(.command) {
      border-radius: var(--radius);
      background: var(--surface);
      font-family: var(--font-mono);
      font-weight: 500;
    }
    .prompt {
      color: var(--text-muted);
    }
  `,
})
export class Chip {
  readonly command = input(false);
}
