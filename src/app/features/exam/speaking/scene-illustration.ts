import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const SCENES: Record<string, { sky: string; ground: string; accent: string }> = {
  garden: { sky: '#e8f2ea', ground: '#acc89d', accent: '#6e9a70' },
  cooking: { sky: '#f4eadc', ground: '#d9c3a5', accent: '#dd9664' },
  cycling: { sky: '#e3eef4', ground: '#b6cfaa', accent: '#4c8291' },
  music: { sky: '#ede8f2', ground: '#c6b2cb', accent: '#846b9e' },
  classroom: { sky: '#e8eff4', ground: '#d0c6a9', accent: '#6687a6' },
  computer: { sky: '#e8edf2', ground: '#cbc7bd', accent: '#7186ad' },
  cafe: { sky: '#f2eadd', ground: '#d1bca2', accent: '#b87957' },
  train: { sky: '#e5eef3', ground: '#bfc9ca', accent: '#66889b' },
  beach: { sky: '#dceef3', ground: '#e9d7a8', accent: '#4d9ab0' },
  museum: { sky: '#eee9e1', ground: '#d2c5ae', accent: '#9c8264' },
  market: { sky: '#e8eee1', ground: '#c7c394', accent: '#809246' },
  park: { sky: '#e1eef0', ground: '#afc69e', accent: '#6d9673' },
};
const FALLBACK = SCENES['park'];

/**
 * Simple original illustration for a speaking prompt (the scenes of the React version), drawn as
 * inline SVG. The colours are fixed on purpose: it is a picture, not part of the theme.
 * Used until a licensed photo is available, or when a photo cannot be loaded.
 */
@Component({
  selector: 'app-scene-illustration',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 640 300" role="img" [attr.aria-label]="alt()" focusable="false">
      <defs>
        <linearGradient [attr.id]="'sky-' + scene()" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" [attr.stop-color]="colours().sky" />
          <stop offset="1" stop-color="#ffffff" stop-opacity="0.28" />
        </linearGradient>
      </defs>
      <rect width="640" height="300" [attr.fill]="'url(#sky-' + scene() + ')'" />
      <circle cx="535" cy="57" r="25" fill="#f6dca4" opacity="0.9" />
      <path d="M0 197 Q160 153 315 192 T640 176 V300 H0Z" [attr.fill]="colours().ground" />

      @switch (kind()) {
        @case ('train') {
          <rect
            x="48"
            y="54"
            width="260"
            height="109"
            rx="5"
            fill="#f9fbfa"
            stroke="#82949a"
            stroke-width="4"
          />
          <text
            x="74"
            y="91"
            [attr.fill]="colours().accent"
            font-size="19"
            font-family="sans-serif"
          >
            Next train 10:24
          </text>
          <path
            d="M72 111h180m-180 22h128"
            stroke="#b4c1c2"
            stroke-width="6"
            stroke-linecap="round"
          />
          <path d="M0 236h640" stroke="#737b7d" stroke-width="7" />
          <path d="M0 251h640" stroke="#d8d9d4" stroke-width="4" stroke-dasharray="18 13" />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 363, y: 104, c: colours().accent, s: 1 }"
          />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 454, y: 124, c: '#d88861', s: 0.84 }"
          />
        }
        @case ('beach') {
          <path d="M0 189 Q180 170 340 195 T640 181 V225 H0Z" fill="#78b7c1" />
          <path d="M0 225 Q175 205 336 226 T640 217 V270 H0Z" fill="#f5e6be" />
          <path
            d="M0 247h640"
            stroke="#ffffff"
            stroke-width="5"
            stroke-dasharray="20 10"
            opacity="0.8"
          />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 252, y: 120, c: colours().accent, s: 1 }"
          />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 358, y: 128, c: '#d88861', s: 0.86 }"
          />
        }
        @case ('learning') {
          <rect
            x="85"
            y="64"
            width="140"
            height="94"
            rx="5"
            fill="#ffffff"
            stroke="#82949a"
            stroke-width="3"
          />
          <path
            d="M103 89h105M103 109h72M103 129h87"
            [attr.stroke]="colours().accent"
            stroke-width="5"
            stroke-linecap="round"
          />
          <rect x="199" y="190" width="260" height="11" rx="5" fill="#9b856a" />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 278, y: 112, c: colours().accent, s: 0.85 }"
          />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 380, y: 105, c: '#d88861', s: 0.88 }"
          />
        }
        @case ('table') {
          <rect x="130" y="173" width="385" height="16" rx="7" fill="#9b765a" />
          <path d="M173 188v65m300-65v65" stroke="#80664f" stroke-width="9" />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 220, y: 87, c: colours().accent, s: 0.8 }"
          />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 423, y: 91, c: '#738c78', s: 0.8 }"
          />
          <ellipse
            cx="320"
            cy="164"
            rx="52"
            ry="14"
            fill="#f5f2e9"
            stroke="#948a75"
            stroke-width="3"
          />
          @if (scene() === 'market') {
            <g [attr.fill]="colours().accent">
              <circle cx="301" cy="159" r="11" />
              <circle cx="320" cy="154" r="12" />
              <circle cx="340" cy="160" r="10" />
            </g>
          }
        }
        @default {
          @if (scene() === 'garden' || scene() === 'park') {
            <g [attr.fill]="colours().accent" opacity="0.8">
              <circle cx="100" cy="108" r="46" />
              <circle cx="164" cy="122" r="35" />
              <circle cx="465" cy="117" r="52" />
              <path d="M130 135v75m336-66v65" stroke="#745e43" stroke-width="12" />
            </g>
          }
          @if (scene() === 'cycling') {
            <g fill="none" stroke="#465d6a" stroke-width="5">
              <circle cx="194" cy="210" r="35" />
              <circle cx="343" cy="210" r="35" />
              <path d="m194 210 42-64 39 64h-81l35-39h64l50 39m-68-92h28" />
            </g>
          }
          @if (scene() === 'music') {
            <g>
              <rect x="428" y="135" width="120" height="74" rx="4" fill="#544d63" />
              <path
                d="M445 186h85M462 164v42M490 155v51M518 167v39"
                stroke="#dbb986"
                stroke-width="5"
              />
              <circle cx="488" cy="98" r="17" fill="#d99b76" />
            </g>
          }
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 253, y: 111, c: colours().accent, s: 1 }"
          />
          <ng-container
            [ngTemplateOutlet]="person"
            [ngTemplateOutletContext]="{ x: 365, y: 120, c: '#d88861', s: 0.92 }"
          />
          @if (scene() === 'garden') {
            <g [attr.stroke]="colours().accent" stroke-width="4">
              <path d="M312 211v37m22-37v37m-42-25h64" />
              <circle cx="312" cy="206" r="5" fill="#e7b780" />
              <circle cx="334" cy="206" r="5" fill="#e7b780" />
            </g>
          }
        }
      }
      <rect x="0" y="264" width="640" height="36" fill="#ffffff" opacity="0.7" />
      <text
        x="24"
        y="288"
        fill="#526168"
        font-size="13"
        font-family="sans-serif"
        letter-spacing="2"
      >
        {{ label() }}
      </text>
    </svg>

    <ng-template #person let-x="x" let-y="y" let-c="c" let-s="s">
      <svg:g [attr.transform]="'translate(' + x + ' ' + y + ') scale(' + s + ')'">
        <circle cx="0" cy="0" r="12" fill="#d99b76" />
        <path d="M-16 16 Q0 6 16 16 L20 62 H-20Z" [attr.fill]="c" />
        <path
          d="M-12 62 L-17 93 M12 62 L18 93"
          stroke="#495e69"
          stroke-width="8"
          stroke-linecap="round"
        />
        <path
          d="M-15 25 L-30 48 M15 25 L29 43"
          stroke="#d99b76"
          stroke-width="7"
          stroke-linecap="round"
        />
      </svg:g>
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
  `,
})
export class SceneIllustration {
  /** Scene name from the exam data (`garden`, `cooking`, `train`...). */
  readonly scene = input.required<string>();
  readonly alt = input.required<string>();

  protected readonly colours = computed(() => SCENES[this.scene()] ?? FALLBACK);
  protected readonly kind = computed(() => {
    const scene = this.scene();
    if (scene === 'train' || scene === 'beach') return scene;
    if (scene === 'classroom' || scene === 'computer') return 'learning';
    if (scene === 'cooking' || scene === 'cafe' || scene === 'market') return 'table';
    return 'outdoor';
  });
  protected readonly label = computed(
    () => `${this.scene().replace('-', ' ').toUpperCase()} - SPEAKING PRACTICE`,
  );
}
