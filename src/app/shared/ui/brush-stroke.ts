import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Hand-drawn diagonal brush stroke that "paints" itself on load (stroke-dashoffset).
 * Place it absolutely behind a headline. With reduced motion (OS or Settings) it appears already painted.
 */
@Component({
  selector: 'app-brush-stroke',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 600 200" preserveAspectRatio="none" focusable="false">
      <path
        pathLength="1"
        d="M18 150 C 90 128, 160 140, 230 118 S 380 96, 450 70 S 540 40, 584 24"
      />
      <path
        class="second"
        pathLength="1"
        d="M40 176 C 140 160, 220 168, 320 146 S 480 112, 570 84"
      />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      pointer-events: none;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
      fill: none;
      stroke: var(--brush);
      stroke-linecap: round;
    }
    path {
      stroke-width: 74;
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      animation: paint var(--dur-draw) cubic-bezier(0.65, 0, 0.35, 1) 0.15s forwards;
    }
    path.second {
      stroke-width: 34;
      animation-delay: 0.55s;
    }
    @keyframes paint {
      to {
        stroke-dashoffset: 0;
      }
    }
  `,
})
export class BrushStroke {}
