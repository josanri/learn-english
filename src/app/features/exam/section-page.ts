import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { Skill } from '../../models/exam';
import { Button, Icon, ToastService } from '../../shared/ui';
import { ExamSessionStore } from './session/exam-session.store';
import { ExamHeader } from './ui/exam-header';
import { focusItem } from './ui/focus-item';
import { PartView } from './ui/part-view';
import { QuestionNavigator } from './ui/question-navigator';
import { SubmitReview } from './ui/submit-review';

/**
 * A Reading or Listening section: sticky header, question navigator, part tabs, the current part
 * (rendered through the part registry) and the review-and-submit step. Route data supplies `skill`.
 */
@Component({
  selector: 'app-section-page',
  imports: [RouterLink, Button, Icon, ExamHeader, QuestionNavigator, PartView, SubmitReview],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.section(); as section) {
      <app-exam-header (exit)="exit()" />
      <div class="container page">
        @if (reviewing()) {
          <app-submit-review
            (back)="reviewing.set(false)"
            (jump)="jumpTo($event)"
            (confirmed)="submit()"
          />
        } @else {
          @if (store.locked()) {
            <p class="banner" role="status">
              <app-icon name="check" [size]="18" />
              @if (marked()) {
                Submitted: {{ store.score().correct }} of {{ store.score().total }} correct. You are
                reviewing your answers.
              } @else if (store.skill() === 'writing') {
                Submitted. Your writing is locked, and you can read it again here.
              } @else {
                Submitted. You can play back your recordings and read your transcripts.
              }
              <a routerLink="../results">See results</a>
            </p>
          }
          @if (!marked()) {
            <p class="notice">
              @if (store.skill() === 'writing') {
                <strong>Practice only.</strong> The suggestions and the checklist are a guide to
                help you practise, not an exam mark. Your text stays on this device. The checker
                runs in your browser and only uses the internet if you turn on LanguageTool in
                Settings.
              } @else {
                <strong>Practice only.</strong> Speaking feedback here is a guide to help you
                practise, not an exam score. Recordings stay on this device. Speech recognition may
                use your browser's online service if you allow it in Settings.
              }
            </p>
          }
          @if (marked()) {
            <app-question-navigator />
          }
          <nav aria-label="Parts of this section">
            <ol class="parts">
              @for (tab of tabs(); track tab.id) {
                <li>
                  <button
                    type="button"
                    class="tab"
                    [attr.aria-current]="tab.current ? 'step' : null"
                    (click)="store.goToPart(tab.index)"
                  >
                    Part {{ tab.number }}
                    @if (tab.total > 0) {
                      <span class="mono">{{ tab.answered }}/{{ tab.total }}</span>
                    }
                  </button>
                </li>
              }
            </ol>
          </nav>

          @if (store.part(); as part) {
            <app-part-view
              [part]="part"
              [class.fold-panel]="store.skill() === 'reading' || store.skill() === 'listening'"
            />
          }

          <div class="pager">
            <button
              appButton
              type="button"
              [disabled]="store.partIndex() === 0"
              (click)="store.goToPart(store.partIndex() - 1)"
            >
              <app-icon name="back" [size]="18" />
              Previous part
            </button>
            @if (store.partIndex() < store.parts().length - 1) {
              <button
                appButton
                variant="primary"
                type="button"
                (click)="store.goToPart(store.partIndex() + 1)"
              >
                Next part
                <app-icon name="arrow" [size]="18" />
              </button>
            } @else if (store.locked()) {
              <a appButton variant="primary" routerLink="../results">See results</a>
            } @else {
              <button appButton variant="primary" type="button" (click)="reviewing.set(true)">
                Review and submit
              </button>
            }
          </div>
        }
      </div>
    } @else {
      <div class="container page">
        <p role="alert">This exam has no {{ skill() }} section.</p>
      </div>
    }
  `,
  styles: `
    .page {
      --exam-chrome: 19rem;
    }
    .banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--success);
      border-radius: var(--radius);
      background: var(--surface);
      font-weight: 600;
    }
    .notice {
      margin: 0 0 var(--space-4);
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-left-width: 6px;
      border-radius: var(--radius-sm);
      background: var(--surface);
      font-size: var(--step--1);
    }
    .parts {
      display: flex;
      gap: var(--space-2);
      margin: 0 0 var(--space-5);
      padding: 0 0 var(--space-2);
      list-style: none;
      flex-wrap: wrap;
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target);
      padding: 0 var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--bg);
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
    }
    .tab .mono {
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    /* Phones: the parts form a grid of equal buttons, so none is cut off or hidden by a scroll. */
    @media (max-width: 30rem) {
      .parts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
      }
      .tab {
        justify-content: center;
        width: 100%;
      }
    }
    /* Half-folded phone held like a book: the page is one screen wide, so the tabs act as on a phone. */
    :host-context(html[data-fold='book']) .parts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
    }
    :host-context(html[data-fold='book']) .tab {
      justify-content: center;
      width: 100%;
    }
    .tab[aria-current='step'] {
      border-color: var(--border);
      background: var(--text);
      color: var(--bg);
    }
    .tab[aria-current='step'] .mono {
      color: var(--bg);
    }
    .pager {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-6);
    }
  `,
})
export class SectionPage {
  /** Bound from the route data (`skill`). */
  readonly skill = input.required<string>();

  protected readonly store = inject(ExamSessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly reviewing = signal(false);
  /** Sections with marked items get the question navigator; free-response ones (speaking) do not. */
  protected readonly marked = computed(() => this.store.sectionItems().length > 0);

  protected readonly tabs = computed(() =>
    this.store.parts().map((part, index) => {
      const score = this.store.partScore(part.id);
      return {
        id: part.id,
        number: part.number,
        index,
        current: index === this.store.partIndex(),
        answered: score.answered,
        total: score.total,
      };
    }),
  );

  constructor() {
    effect(() => {
      this.store.skill.set(this.skill() as Skill);
      this.reviewing.set(false);
    });
  }

  protected exit(): void {
    this.toast.show('Progress saved on this device.', 'success');
    void this.router.navigate(['/exams', this.store.location()?.level ?? 'b1']);
  }

  protected jumpTo(target: { id: string; partIndex: number }): void {
    this.reviewing.set(false);
    this.store.goToPart(target.partIndex);
    focusItem(target.id);
  }

  protected submit(): void {
    this.store.submitSection();
    this.reviewing.set(false);
    this.toast.show('Section submitted. Here are your results.', 'success');
    void this.router.navigate(['../results'], { relativeTo: this.route });
  }
}
