import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  resource,
  untracked,
  viewChild,
} from '@angular/core';
import type { Part } from '../../../models/exam';
import { Button, Icon } from '../../../shared/ui';
import { partDef } from '../parts/part-registry';
import { ExamSessionStore } from '../session/exam-session.store';

/**
 * One part of a section: heading, instructions, the renderer registered for `part.type`
 * (loaded lazily from the part registry) and, in practice mode, the "Check answers" button.
 * Focus moves to the heading whenever the part changes.
 */
@Component({
  selector: 'app-part-view',
  imports: [NgComponentOutlet, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section [attr.aria-labelledby]="headingId()">
      <h2 #heading tabindex="-1" [id]="headingId()">
        <span class="mono">Part {{ part().number }}:</span> {{ part().title }}
      </h2>
      <p class="lede">{{ part().instructions }}</p>

      @for (p of single(); track p.id) {
        @if (renderer.value(); as component) {
          <ng-container *ngComponentOutlet="component; inputs: inputs()" />
        } @else if (renderer.error()) {
          <p role="alert">This part cannot be shown in this version of the app.</p>
        } @else {
          <p role="status" class="muted">Loading part&hellip;</p>
        }
      }

      @if (checkable()) {
        <button appButton type="button" class="check" (click)="store.checkPart(part().id)">
          <app-icon name="check" [size]="18" />
          Check answers
        </button>
      }
      <p class="result" aria-live="polite">{{ resultText() }}</p>
    </section>
  `,
  styles: `
    h2 {
      font-size: var(--step-2);
      scroll-margin-top: calc(var(--header-height) + 8rem);
    }
    /* Half-folded phone held like a laptop: the top screen is short, exam.css sets the whole offset. */
    :host-context(html[data-fold='laptop']) h2 {
      scroll-margin-top: var(--space-3);
    }
    h2:focus {
      outline: none;
    }
    h2:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 4px;
    }
    .lede {
      font-size: var(--step-0);
    }
    button.check {
      margin-top: var(--space-5);
    }
    /* Phones: a full-width button is easy to hit with a thumb. */
    @media (max-width: 30rem) {
      button.check {
        display: flex;
        width: 100%;
      }
    }
    .result {
      margin-top: var(--space-3);
      font-weight: 700;
    }
  `,
})
export class PartView {
  readonly part = input.required<Part>();
  protected readonly store = inject(ExamSessionStore);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly injector = inject(Injector);

  protected readonly headingId = computed(() => `heading-${this.part().id}`);
  /** A one-element list so that the renderer is recreated (fresh state) for every part. */
  protected readonly single = computed(() => [this.part()]);
  protected readonly inputs = computed(() => ({ part: this.part() }));

  protected readonly renderer = resource({
    params: () => this.part().type,
    loader: async ({ params }) => {
      const def = partDef(params);
      if (!def) throw new Error(`No renderer registered for part type "${params}"`);
      return def.load();
    },
  });

  private readonly items = computed(() => this.store.itemsByPart().get(this.part().id) ?? []);
  protected readonly checkable = computed(
    () => !this.store.examMode() && !this.store.locked() && this.items().length > 0,
  );
  protected readonly resultText = computed(() => {
    if (!this.store.isPartRevealed(this.part().id)) return '';
    const { correct, total } = this.store.partScore(this.part().id);
    return `Checked: ${correct} of ${total} correct.`;
  });

  constructor() {
    let last: string | undefined;
    let scrollPending = false;
    effect(() => {
      const id = this.part().id;
      const ready = this.renderer.hasValue() && !this.renderer.isLoading();
      untracked(() => {
        const el = this.heading().nativeElement;
        if (last !== undefined && last !== id) {
          el.focus({ preventScroll: true });
          scrollPending = true;
        }
        last = id;
        if (!scrollPending || !ready) return;
        scrollPending = false;
        // Scroll once the renderer is in the page: on a folded phone a part with a passage only then
        // leaves the fold panel, so an earlier scroll would move the panel instead of the page.
        afterNextRender(() => el.scrollIntoView({ block: 'start' }), { injector: this.injector });
      });
    });
  }
}
