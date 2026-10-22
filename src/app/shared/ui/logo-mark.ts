import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Brand mark: closing quotation marks on a paper-blue key tile with a solid offset base.
 * Decorative (the brand link carries the accessible name). Keep in sync with public/favicon.svg.
 */
@Component({
  selector: 'app-logo-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 32 32" focusable="false">
      <rect class="base" x="4.5" y="4.5" width="25" height="25" rx="6" />
      <rect class="tile" x="2.5" y="2.5" width="25" height="25" rx="6" />
      <circle class="ink" cx="10.2" cy="12.6" r="3.6" />
      <path class="tail" d="M13.3 12.8 C13.3 17.6 11.4 20.6 7.6 22.2" />
      <circle class="ink" cx="19.4" cy="12.6" r="3.6" />
      <path class="tail" d="M22.5 12.8 C22.5 17.6 20.6 20.6 16.8 22.2" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex: none;
      width: 1.75rem;
      height: 1.75rem;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .base {
      fill: var(--border);
    }
    .tile {
      fill: var(--paper-blue);
      stroke: var(--border);
      stroke-width: 2.4;
    }
    .ink {
      fill: var(--paper-ink);
    }
    .tail {
      fill: none;
      stroke: var(--paper-ink);
      stroke-width: 2.8;
      stroke-linecap: round;
    }
  `,
})
export class LogoMark {}
