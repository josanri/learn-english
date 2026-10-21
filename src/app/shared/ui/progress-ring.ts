import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Circular progress. `value` is a fraction from 0 to 1. The centre shows `text` or the percentage. */
@Component({
  selector: 'app-progress-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    '[attr.aria-label]': 'label()',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percent()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  template: `
    <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <circle class="track" cx="22" cy="22" [attr.r]="radius" />
      <circle
        class="bar"
        cx="22"
        cy="22"
        [attr.r]="radius"
        [attr.stroke-dasharray]="circumference"
        [attr.stroke-dashoffset]="offset()"
        transform="rotate(-90 22 22)"
      />
    </svg>
    <span class="text">{{ text() || percent() + '%' }}</span>
  `,
  styles: `
    :host {
      position: relative;
      display: inline-grid;
      place-items: center;
      flex: none;
    }
    svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    circle {
      fill: none;
      stroke-width: 5;
    }
    .track {
      stroke: var(--surface-2);
    }
    .bar {
      stroke: var(--accent-strong);
      stroke-linecap: round;
      transition: stroke-dashoffset calc(var(--dur) * 4);
    }
    .text {
      position: relative;
      font-family: var(--font-mono);
      font-size: var(--step--1);
      font-weight: 600;
    }
  `,
})
export class ProgressRing {
  readonly value = input(0);
  readonly size = input(64);
  readonly label = input('Progress');
  readonly text = input('');

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;
  protected readonly percent = computed(() =>
    Math.round(Math.min(1, Math.max(0, this.value())) * 100),
  );
  protected readonly offset = computed(() => CIRCUMFERENCE * (1 - this.percent() / 100));
}
