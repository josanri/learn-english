import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type CardTone = 'blue' | 'cream' | 'green' | 'white' | 'coral';

/**
 * Flat-colour card with a thick border, a solid offset shadow and a slight tilt.
 * Project the artwork with `<app-skill-art art>` and the description as normal content.
 * When `link` is set the heading becomes a link whose hit area covers the whole card.
 */
@Component({
  selector: 'app-illustrated-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()', '[style.--tilt]': 'tilt()' },
  template: `
    <div class="art"><ng-content select="[art]" /></div>
    <h3>
      @if (link(); as target) {
        <a [routerLink]="target">{{ heading() }}</a>
      } @else {
        {{ heading() }}
      }
    </h3>
    <div class="body"><ng-content /></div>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      padding: var(--space-4) var(--space-4) var(--space-5);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--tone-bg);
      color: var(--paper-ink);
      box-shadow: 6px 6px 0 var(--shadow-solid);
      transform: rotate(var(--tilt, 0deg));
      transition:
        transform var(--dur),
        box-shadow var(--dur);
    }
    :host(:hover),
    :host(:focus-within) {
      transform: rotate(0deg) translate(-2px, -2px);
      box-shadow: 9px 9px 0 var(--shadow-solid);
    }
    :host([data-tone='blue']) {
      --tone-bg: var(--paper-blue);
    }
    :host([data-tone='cream']) {
      --tone-bg: var(--paper-cream);
    }
    :host([data-tone='green']) {
      --tone-bg: var(--paper-green);
    }
    :host([data-tone='white']) {
      --tone-bg: var(--paper-white);
    }
    :host([data-tone='coral']) {
      --tone-bg: var(--paper-coral);
    }
    .art {
      display: grid;
      place-items: center;
      margin-bottom: var(--space-3);
    }
    h3 {
      margin-bottom: var(--space-2);
      font-size: var(--step-2);
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    a::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
    }
    a:focus-visible {
      outline: none;
    }
    a:focus-visible::after {
      outline: 3px solid var(--focus-ring);
      outline-offset: 4px;
    }
    .body {
      color: var(--paper-ink-muted);
      font-size: var(--step--1);
      font-weight: 500;
    }
    .body :where(p) {
      margin: 0;
    }
  `,
})
export class IllustratedCard {
  readonly heading = input.required<string>();
  readonly tone = input<CardTone>('white');
  /** Rotation in degrees, for example `-2`. */
  readonly rotate = input(0);
  readonly link = input<string | unknown[] | null>(null);
  protected readonly tilt = computed(() => `${this.rotate()}deg`);
}
