import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ArtKind =
  'reading' | 'listening' | 'writing' | 'speaking' | 'mediation' | 'vocabulary' | 'verbs';

/** Original flat illustrations for each skill, drawn with thick ink strokes. Decorative only. */
@Component({
  selector: 'app-skill-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 160 110" width="160" height="110" focusable="false">
      @switch (kind()) {
        @case ('reading') {
          <rect class="paper" x="10" y="6" width="140" height="98" rx="8" />
          <path d="M26 24h108M26 46h32M110 46h24M26 68h40" />
          <rect class="mark" x="64" y="36" width="40" height="20" rx="4" stroke-dasharray="6 6" />
          <g transform="rotate(-6 122 86)">
            <rect class="paper" x="100" y="76" width="44" height="20" rx="6" />
            <path d="M110 86h24" />
          </g>
          <path d="M98 86C88 86 84 80 84 62M78.7 70.5L84 62l6.2 7.9" />
        }
        @case ('vocabulary') {
          <rect class="mark" x="42" y="10" width="106" height="68" rx="8" />
          <path class="thin" d="M126 24h10M126 34h10" />
          <rect class="paper" x="14" y="32" width="106" height="70" rx="8" />
          <path d="M34 88l14-38 14 38M39 76h18M94 66v22" />
          <circle cx="84" cy="78" r="10" />
        }
        @case ('verbs') {
          <path d="M28 26C58 8 102 8 132 26M125.3 14.9L132 26l-12.8 2.5" />
          <rect class="paper" x="4" y="38" width="46" height="54" rx="7" />
          <rect class="mark" x="57" y="38" width="46" height="54" rx="7" />
          <rect class="paper" x="110" y="38" width="46" height="54" rx="7" />
          <text x="27" y="70">go</text>
          <text x="80" y="70">went</text>
          <text x="133" y="70">gone</text>
        }
        @case ('listening') {
          <path d="M34 70V58a46 46 0 0 1 92 0v12" />
          <rect class="paper" x="22" y="62" width="26" height="40" rx="10" />
          <rect class="paper" x="112" y="62" width="26" height="40" rx="10" />
          <circle class="mark" cx="35" cy="82" r="5" />
          <circle class="mark" cx="125" cy="82" r="5" />
          <path
            d="M16.3 93.7a22 22 0 0 1 0-23.4M9.9 100.2a31 31 0 0 1 0-36.4M143.7 70.3a22 22 0 0 1 0 23.4M150.1 63.8a31 31 0 0 1 0 36.4"
          />
        }
        @case ('writing') {
          <rect class="paper" x="22" y="10" width="86" height="96" rx="8" />
          <path d="M38 34h54M38 52h54M38 70h30" />
          <path class="mark" d="M92 100l4-18 40-52a8 8 0 0 1 12 11L108 93z" />
          <path d="M128 40l10 10" />
        }
        @case ('speaking') {
          <rect class="paper" x="62" y="8" width="36" height="58" rx="18" />
          <path d="M44 52a36 36 0 0 0 72 0M80 88v16M62 104h36" />
          <path class="mark" d="M18 40c-6 8-6 18 0 26M142 40c6 8 6 18 0 26" />
          <path d="M70 28h20M70 40h20" />
        }
        @default {
          <path
            class="paper"
            d="M12 14h72a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H40l-16 14V62h-12a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z"
          />
          <path
            class="mark"
            d="M148 40H98a6 6 0 0 0-6 6v34a6 6 0 0 0 6 6h30l14 14V86h6a6 6 0 0 0 6-6V46a6 6 0 0 0-6-6z"
          />
          <path d="M28 32h40M28 46h24M108 58h34M108 70h22" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      color: var(--paper-ink);
    }
    svg {
      display: block;
      height: auto;
      fill: none;
      stroke: currentColor;
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .paper {
      fill: var(--paper-white);
    }
    .mark {
      fill: #ffd84a;
    }
    .thin {
      stroke-width: 3;
    }
    text {
      fill: currentColor;
      stroke: none;
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 800;
      text-anchor: middle;
    }
  `,
})
export class SkillArt {
  readonly kind = input.required<ArtKind>();
}
