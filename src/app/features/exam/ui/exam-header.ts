import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Button, Chip, Icon, ProgressBar } from '../../../shared/ui';
import { ExamSessionStore } from '../session/exam-session.store';

/** `m:ss` (or `h:mm:ss`) for a number of seconds. Overtime is prefixed with `+`. */
export function formatClock(totalSeconds: number): string {
  const over = totalSeconds < 0;
  const s = Math.abs(Math.trunc(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  const body = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  return over ? `+${body}` : body;
}

/**
 * Sticky bar of an open section: where you are, optional timer (mono, polite warnings at 5 and 1
 * minutes), progress and the save-and-exit button.
 */
@Component({
  selector: 'app-exam-header',
  imports: [Button, Chip, Icon, ProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar container">
      <div class="where">
        <p class="eyebrow">
          {{ store.skill() }} &middot; part {{ partNumber() }} of {{ partCount() }}
        </p>
        <app-progress-bar
          [value]="progress()"
          [label]="'Completed ' + store.answeredCount() + ' of ' + store.totalCount()"
        />
        <p class="count mono">
          {{ store.answeredCount() }}/{{ store.totalCount() }}
          {{ store.sectionItems().length > 0 ? 'answered' : 'done' }}
        </p>
      </div>
      @if (store.showTimer() && !store.locked()) {
        <app-chip
          [command]="true"
          [prompt]="false"
          class="timer"
          [class.late]="store.remaining() <= 60"
        >
          <app-icon name="clock" [size]="16" />
          <span role="timer"><span class="visually-hidden">Time left: </span>{{ clock() }}</span>
        </app-chip>
      }
      <button appButton type="button" size="sm" (click)="exit.emit()">
        <app-icon name="back" [size]="16" />
        Save and exit
      </button>
    </div>
    <p class="visually-hidden" aria-live="polite">
      {{ store.showTimer() ? store.timerNotice() : '' }}
    </p>
  `,
  styles: `
    :host {
      position: sticky;
      top: calc(var(--header-height) + env(safe-area-inset-top));
      z-index: 30;
      display: block;
      border-bottom: var(--bw) solid var(--border-muted);
      background: var(--bg);
    }
    .bar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding-block: var(--space-2);
    }
    .where {
      flex: 1;
      min-width: 0;
    }
    .eyebrow {
      margin: 0 0 var(--space-1);
      text-transform: capitalize;
    }
    .count {
      margin: var(--space-1) 0 0;
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .timer {
      flex: none;
    }
    .timer.late {
      color: var(--danger);
    }
    @media (max-width: 30rem) {
      .count {
        display: none;
      }
    }
  `,
})
export class ExamHeader {
  readonly exit = output();
  protected readonly store = inject(ExamSessionStore);
  protected readonly partNumber = computed(() => this.store.partIndex() + 1);
  protected readonly partCount = computed(() => this.store.parts().length);
  protected readonly progress = computed(() =>
    this.store.totalCount() ? this.store.answeredCount() / this.store.totalCount() : 0,
  );
  protected readonly clock = computed(() => formatClock(this.store.remaining()));
}
