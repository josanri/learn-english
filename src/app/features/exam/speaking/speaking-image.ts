import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { SettingsService } from '../../../core/settings.service';
import type { SpeakingVisual } from '../../../models/exam';
import { SceneIllustration } from './scene-illustration';

/**
 * The picture of a speaking prompt: the licensed photo with its credit, or (when the exam has no
 * photo yet, or the photo cannot be loaded) the original practice illustration.
 */
@Component({
  selector: 'app-speaking-image',
  imports: [SceneIllustration],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure>
      <div class="frame">
        @if (photo(); as p) {
          <img
            [src]="p.src"
            [attr.srcset]="p.srcSmall ? p.srcSmall + ' 600w, ' + p.src + ' 1200w' : null"
            sizes="(min-width: 60rem) 40rem, 100vw"
            [alt]="p.alt"
            [attr.loading]="eager() ? 'eager' : 'lazy'"
            [attr.width]="p.width ?? 1200"
            [attr.height]="p.height ?? 800"
            (error)="failed.set(true)"
          />
        } @else if (visual().illustration) {
          <app-scene-illustration [scene]="visual().illustration ?? ''" [alt]="visual().alt" />
        } @else {
          <p class="none" role="img" [attr.aria-label]="visual().alt">{{ visual().title }}</p>
        }
      </div>
      <figcaption>
        <strong>{{ visual().title }}</strong>
        @if (photo(); as p) {
          <span class="credit">
            Photo by {{ p.credit.author }} &middot;
            <a [href]="p.credit.licenseUrl" target="_blank" rel="noreferrer noopener">{{
              p.credit.license
            }}</a>
            &middot;
            <a [href]="p.credit.sourceUrl" target="_blank" rel="noreferrer noopener"
              >Source<span class="visually-hidden"> (opens in a new tab)</span></a
            >
          </span>
        } @else if (visual().illustration) {
          <span class="credit">Original practice illustration</span>
        }
      </figcaption>
      @if (showHints() && visual().describeHints?.length) {
        <details class="hints">
          <summary>Need ideas?</summary>
          <ul>
            @for (hint of visual().describeHints; track hint) {
              <li>{{ hint }}</li>
            }
          </ul>
        </details>
      }
    </figure>
  `,
  styles: `
    figure {
      margin: 0;
    }
    .frame {
      overflow: hidden;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface-2);
    }
    img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 32rem;
      object-fit: cover;
    }
    .none {
      margin: 0;
      padding: var(--space-6);
      text-align: center;
    }
    figcaption {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin-top: var(--space-2);
      font-size: var(--step--1);
    }
    .hints {
      margin-top: var(--space-2);
      font-size: var(--step--1);
    }
    .hints summary {
      cursor: pointer;
      min-height: var(--target);
      display: flex;
      align-items: center;
      color: var(--accent-text);
      font-weight: 600;
    }
    .hints ul {
      margin: 0;
      padding-left: var(--space-5);
    }
    .credit {
      color: var(--text-muted);
    }
    .credit a {
      color: var(--accent-text);
    }
  `,
})
export class SpeakingImage {
  private readonly settings = inject(SettingsService);
  readonly visual = input.required<SpeakingVisual>();
  readonly eager = input(false);

  /** Ideas to describe the picture: not shown in exam mode (no hints until the exam is finished). */
  protected readonly showHints = computed(() => !this.settings.settings().examMode);

  protected readonly failed = signal(false);
  /** The licensed photo, unless it failed to load. */
  protected readonly photo = computed(() => {
    const image = this.visual().image;
    return image && !this.failed() ? image : null;
  });
}
