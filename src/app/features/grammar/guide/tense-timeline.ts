import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { GuideTimelineRow, TimelineShape } from '../../../models/grammar';
import { NOW_X, TIMELINE_WIDTH, dotPositions, timelineMarks } from './timeline-shapes';

/** The tenses of a guide on one past-now-future line. A tense name moves to its section. */
@Component({
  selector: 'app-tense-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="timeline" aria-labelledby="timeline-h">
      <h2 id="timeline-h">The tenses on a timeline</h2>
      <p class="hint">Choose a tense to read its part of the guide.</p>

      <div class="grid head" aria-hidden="true">
        <span></span>
        <span class="axis-labels"
          ><span>Past</span><span class="now">Now</span><span>Future</span></span
        >
        <span></span>
      </div>

      <ol>
        @for (row of rows(); track row.label) {
          <li class="grid row">
            <button
              type="button"
              class="name"
              [attr.aria-describedby]="'tl-' + $index"
              (click)="go.emit(row.section)"
            >
              {{ row.label }}
            </button>
            <svg
              class="drawing"
              [attr.viewBox]="'0 0 ' + width + ' 32'"
              aria-hidden="true"
              focusable="false"
            >
              <line class="axis" x1="4" y1="16" [attr.x2]="width - 4" y2="16" />
              <line class="now-line" [attr.x1]="now" y1="2" [attr.x2]="now" y2="30" />
              @for (mark of marks(row.shape); track $index) {
                @switch (mark.kind) {
                  @case ('bar') {
                    <rect
                      class="bar"
                      [attr.x]="mark.from"
                      y="10"
                      [attr.width]="mark.to - mark.from"
                      height="12"
                      rx="3"
                    />
                  }
                  @case ('arrow') {
                    <path class="arrow" [attr.d]="arrow(mark.from, mark.to)" />
                  }
                  @case ('dots') {
                    @for (x of dots(mark.from, mark.to); track x) {
                      <circle class="habit" [attr.cx]="x" cy="16" r="3.5" />
                    }
                  }
                  @case ('dot') {
                    <circle class="dot" [attr.cx]="mark.x" cy="16" r="6" />
                  }
                  @case ('ref') {
                    <circle class="ref" [attr.cx]="mark.x" cy="16" r="6" />
                  }
                  @case ('stop') {
                    <path class="stop" [attr.d]="cross(mark.x)" />
                  }
                }
              }
            </svg>
            <p class="text" [id]="'tl-' + $index">
              <span class="example">{{ row.example }}</span>
              <span class="description">{{ row.description }}</span>
            </p>
          </li>
        }
      </ol>

      <ul class="legend" aria-label="Key to the drawings">
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle class="dot" cx="12" cy="12" r="6" />
          </svg>
          One action
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle class="ref" cx="12" cy="12" r="6" />
          </svg>
          The time we talk about
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect class="bar" x="1" y="6" width="22" height="12" rx="3" />
          </svg>
          Action in progress
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle class="habit" cx="5" cy="12" r="3.5" />
            <circle class="habit" cx="19" cy="12" r="3.5" />
          </svg>
          Habit or repeated action
        </li>
        <li>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path class="stop" [attr.d]="cross(12)" transform="translate(0 -4)" />
          </svg>
          The habit stopped
        </li>
      </ul>
    </section>
  `,
  styles: `
    .timeline {
      margin-block: var(--space-6);
      padding: var(--space-5);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    h2 {
      font-size: var(--step-2);
    }
    .hint {
      margin-bottom: var(--space-4);
    }
    ol {
      display: grid;
      gap: var(--space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .grid {
      display: grid;
      gap: var(--space-2);
    }
    .head > span:empty {
      display: none;
    }
    .axis-labels {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-mono);
      font-size: var(--step--1);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .axis-labels .now {
      color: var(--accent-text);
      font-weight: 700;
    }
    .row {
      padding-top: var(--space-4);
      border-top: var(--bw) solid var(--border-muted);
    }
    .name {
      justify-self: start;
      min-height: var(--target);
      padding: 0 var(--space-3);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font: inherit;
      font-weight: 700;
      text-align: start;
      cursor: pointer;
    }
    .name:hover {
      background: var(--surface-2);
    }
    .drawing {
      display: block;
      width: 100%;
      height: auto;
      max-width: 100%;
    }
    .text {
      display: grid;
      gap: var(--space-1);
      margin: 0;
    }
    .example {
      font-weight: 700;
    }
    .description {
      color: var(--text-muted);
      font-size: var(--step--1);
    }

    .axis {
      stroke: var(--border-muted);
      stroke-width: 2;
    }
    .now-line {
      stroke: var(--accent-text);
      stroke-width: 2;
      stroke-dasharray: 3 3;
    }
    .bar {
      fill: var(--accent);
      stroke: var(--border);
      stroke-width: 2;
    }
    .dot {
      fill: var(--accent);
      stroke: var(--border);
      stroke-width: 2;
    }
    .ref {
      fill: var(--bg);
      stroke: var(--text);
      stroke-width: 2.5;
    }
    .habit {
      fill: var(--accent);
      stroke: var(--border);
      stroke-width: 1.5;
    }
    .arrow,
    .stop {
      fill: none;
      stroke: var(--text);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-5);
      margin: var(--space-5) 0 0;
      padding: var(--space-4) 0 0;
      border-top: var(--bw) solid var(--border-muted);
      list-style: none;
      font-size: var(--step--1);
      color: var(--text-muted);
    }
    .legend li {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .legend svg {
      width: 1.5rem;
      height: 1.5rem;
      flex: none;
    }

    @media (min-width: 48rem) {
      .grid {
        grid-template-columns: 14.5rem minmax(14rem, 1fr) minmax(0, 1fr);
        align-items: center;
        gap: var(--space-4);
      }
      .head > span:empty {
        display: block;
      }
    }
  `,
})
export class TenseTimeline {
  readonly rows = input.required<GuideTimelineRow[]>();
  /** Id of the section of the chosen tense. */
  readonly go = output<string>();

  protected readonly width = TIMELINE_WIDTH;
  protected readonly now = NOW_X;
  protected readonly marks = (shape: TimelineShape) => timelineMarks(shape);
  protected readonly dots = (from: number, to: number) => dotPositions(from, to);

  /** A line from `from` to `to` with an arrow head at `to`. */
  protected arrow(from: number, to: number): string {
    return `M ${from} 16 H ${to} M ${to - 7} 10 L ${to} 16 L ${to - 7} 22`;
  }

  /** A small cross centred on `x`. */
  protected cross(x: number): string {
    return `M ${x - 6} 10 L ${x + 6} 22 M ${x + 6} 10 L ${x - 6} 22`;
  }
}
