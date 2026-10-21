import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ArtKind = 'reading' | 'listening' | 'writing' | 'speaking' | 'mediation';

/** Original flat illustrations for each skill, drawn with thick ink strokes. Decorative only. */
@Component({
  selector: 'app-skill-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 160 110" width="160" height="110" focusable="false">
      @switch (kind()) {
        @case ('reading') {
          <path class="paper" d="M12 28c24-10 48-8 68 6v62c-20-14-44-16-68-6z" />
          <path class="paper" d="M148 28c-24-10-48-8-68 6v62c20-14 44-16 68-6z" />
          <path
            d="M26 46c14-4 28-3 40 4M26 62c14-4 28-3 40 4M94 50c12-7 26-8 40-4M94 66c12-7 26-8 40-4"
          />
          <path class="mark" d="M118 8v34l9-8 9 8V8z" />
        }
        @case ('listening') {
          <path d="M34 70V58a46 46 0 0 1 92 0v12" />
          <rect class="paper" x="22" y="62" width="26" height="40" rx="10" />
          <rect class="paper" x="112" y="62" width="26" height="40" rx="10" />
          <path d="M60 34c6-6 14-9 20-9M72 46c5-3 9-4 14-4" />
          <circle class="mark" cx="80" cy="76" r="6" />
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
  `,
})
export class SkillArt {
  readonly kind = input.required<ArtKind>();
}
