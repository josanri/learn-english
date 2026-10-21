import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { Button, Card, Icon } from '../../../shared/ui';
import { ExamSessionStore } from '../session/exam-session.store';

/**
 * Last step before submitting a section: counts, the questions still unanswered and flagged ones
 * (each jumps back to the question), and the confirmation. Nothing is submitted until the button is pressed.
 */
@Component({
  selector: 'app-submit-review',
  imports: [Button, Card, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card [raised]="true">
      <h2 #heading tabindex="-1">Review and submit {{ store.skill() }}</h2>
      <p>
        You have answered <strong>{{ store.answeredCount() }}</strong> of
        <strong>{{ store.totalCount() }}</strong> questions.
      </p>

      @if (unanswered().length > 0) {
        <h3>Not answered ({{ unanswered().length }})</h3>
        <ul class="jump">
          @for (u of unanswered(); track u.id) {
            <li>
              <button appButton size="sm" type="button" (click)="jump.emit(u)">
                Part {{ u.part }}, question {{ u.n }}
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="ok"><app-icon name="check" [size]="18" /> Every question has an answer.</p>
      }

      @if (flagged().length > 0) {
        <h3>Flagged for review ({{ flagged().length }})</h3>
        <ul class="jump">
          @for (f of flagged(); track f.id) {
            <li>
              <button appButton size="sm" type="button" (click)="jump.emit(f)">
                Part {{ f.part }}, question {{ f.n }}
              </button>
            </li>
          }
        </ul>
      }

      <p class="warn">
        After you submit, your answers are locked and you will see your marks. You can start again
        later with Retry.
      </p>
      <div class="actions">
        <button appButton type="button" (click)="back.emit()">Back to questions</button>
        <button appButton variant="primary" type="button" (click)="confirmed.emit()">
          Submit {{ store.skill() }}
        </button>
      </div>
    </app-card>
  `,
  styles: `
    h2 {
      font-size: var(--step-2);
    }
    h2:focus {
      outline: none;
    }
    h3 {
      margin-top: var(--space-4);
      font-size: var(--step-0);
      letter-spacing: 0;
    }
    .jump {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0 0 var(--space-3);
      padding: 0;
      list-style: none;
    }
    .ok {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--success);
      font-weight: 700;
    }
    .warn {
      margin-top: var(--space-4);
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  `,
})
export class SubmitReview {
  readonly back = output();
  readonly confirmed = output();
  readonly jump = output<{ id: string; part: number; partIndex: number; n: number }>();

  protected readonly store = inject(ExamSessionStore);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  private readonly partIndexOf = computed(
    () => new Map(this.store.parts().map((p, i) => [p.id, i])),
  );
  protected readonly unanswered = computed(() =>
    this.store.unanswered().map((p) => ({
      id: p.item.id,
      part: p.partNumber,
      partIndex: this.partIndexOf().get(p.partId) ?? 0,
      n: p.n,
    })),
  );
  protected readonly flagged = computed(() =>
    this.store.flaggedItems().map((p) => ({
      id: p.item.id,
      part: p.partNumber,
      partIndex: this.partIndexOf().get(p.partId) ?? 0,
      n: p.n,
    })),
  );

  constructor() {
    afterNextRender(() => {
      window.scrollTo(0, 0);
      this.heading().nativeElement.focus({ preventScroll: true });
    });
  }
}
