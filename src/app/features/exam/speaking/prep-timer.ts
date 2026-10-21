import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Button, Chip, Icon } from '../../../shared/ui';
import { ExamSessionStore } from '../session/exam-session.store';
import { formatClock } from '../ui/exam-header';

/** Optional preparation time before a long turn: a countdown the learner starts when they want. */
@Component({
  selector: 'app-prep-timer',
  imports: [Button, Chip, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="prep">
      @if (left() === null) {
        <button appButton type="button" [disabled]="store.locked()" (click)="begin()">
          <app-icon name="clock" [size]="18" />
          {{ done() ? 'Prepare again' : 'Prepare for ' + seconds() + ' seconds (optional)' }}
        </button>
      } @else {
        <app-chip [command]="true" [prompt]="false">
          <app-icon name="clock" [size]="16" />
          <span role="timer"
            ><span class="visually-hidden">Preparation time left: </span>{{ clock() }}</span
          >
        </app-chip>
        <button appButton size="sm" type="button" (click)="skip()">Skip</button>
      }
      <p class="visually-hidden" role="status">{{ notice() }}</p>
    </div>
  `,
  styles: `
    .prep {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      margin-block: var(--space-3);
    }
  `,
})
export class PrepTimer {
  readonly seconds = input(15);
  readonly finished = output();
  protected readonly store = inject(ExamSessionStore);

  protected readonly left = signal<number | null>(null);
  protected readonly done = signal(false);
  protected readonly notice = signal('');
  protected readonly clock = computed(() => formatClock(this.left() ?? 0));
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  protected begin(): void {
    this.left.set(this.seconds());
    this.done.set(false);
    this.notice.set('Preparation started.');
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const next = (this.left() ?? 0) - 1;
      if (next <= 0) this.end();
      else this.left.set(next);
    }, 1000);
  }

  protected skip(): void {
    this.end();
  }

  private end(): void {
    clearInterval(this.timer);
    this.left.set(null);
    this.done.set(true);
    this.notice.set('Preparation finished. Start recording when you are ready.');
    this.finished.emit();
  }
}
