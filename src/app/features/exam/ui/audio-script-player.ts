import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { SpeechService } from '../../../core/speech.service';
import type { Recording } from '../../../models/exam';
import { Button, Chip, Icon } from '../../../shared/ui';
import { ExamSessionStore } from '../session/exam-session.store';

/**
 * Plays a listening script with the browser's speech synthesis, one turn at a time, with a voice per
 * speaker. Exam mode allows two plays and hides the transcript until the section is submitted;
 * practice mode is unlimited and offers the transcript. Without speech synthesis the transcript is shown.
 */
@Component({
  selector: 'app-script-player',
  imports: [Button, Chip, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="player" role="group" [attr.aria-label]="label()">
      <div class="top">
        <span class="title"><app-icon name="volume" [size]="20" /> {{ label() }}</span>
        <app-chip [command]="true" [prompt]="false">{{ playsText() }}</app-chip>
      </div>

      @if (unavailable()) {
        <p class="notice" role="status">
          Audio playback is not available here, so read the transcript instead. You can try another
          browser or check the voices installed on your device.
        </p>
      } @else {
        <div class="controls">
          <button
            appButton
            variant="primary"
            type="button"
            [disabled]="primaryDisabled()"
            (click)="onPrimary()"
          >
            <app-icon [name]="state() === 'playing' ? 'pause' : 'play'" [size]="20" />
            {{ primaryLabel() }}
          </button>
          <button
            appButton
            type="button"
            [disabled]="repeatDisabled()"
            [attr.title]="store.examMode() ? 'Not available in exam mode' : null"
            (click)="playback().repeatTurn()"
          >
            <app-icon name="repeat" [size]="18" />
            Repeat turn
          </button>
        </div>
        <div
          class="turns"
          role="progressbar"
          aria-valuemin="1"
          [attr.aria-valuemax]="turnCount()"
          [attr.aria-valuenow]="turn() + 1"
          [attr.aria-valuetext]="'Turn ' + (turn() + 1) + ' of ' + turnCount()"
          aria-label="Recording progress by turn"
        >
          @for (t of turnList(); track t) {
            <span
              class="seg"
              [class.done]="t < turn() || state() === 'ended'"
              [class.now]="t === turn() && state() !== 'idle' && state() !== 'ended'"
            ></span>
          }
        </div>
        <p class="status">
          @switch (state()) {
            @case ('playing') {
              {{ speakerName() }} is speaking &middot; turn {{ turn() + 1 }} of {{ turnCount() }}
            }
            @case ('paused') {
              Paused at turn {{ turn() + 1 }} of {{ turnCount() }}
            }
            @case ('ended') {
              Finished.
              @if (!canStart()) {
                You have used all {{ store.maxListens() }} plays.
              }
            }
            @default {
              @if (store.examMode()) {
                In the exam you can listen twice.
              } @else {
                Press play. You can listen as many times as you like.
              }
            }
          }
        </p>
      }

      @if (canToggleTranscript()) {
        <button
          appButton
          size="sm"
          variant="ghost"
          type="button"
          [attr.aria-expanded]="open()"
          (click)="open.set(!open())"
        >
          {{ open() ? 'Hide transcript' : 'Show transcript' }}
        </button>
      }
      @if (transcriptVisible()) {
        <ol class="script" aria-label="Transcript">
          @for (line of recording().turns; track $index; let i = $index) {
            <li [class.now]="i === turn() && state() === 'playing'">
              <strong>{{ nameOf(line.speaker) }}:</strong> {{ line.text }}
            </li>
          }
        </ol>
      }
    </div>
  `,
  styles: `
    .player {
      margin-bottom: var(--space-5);
      padding: var(--space-4);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }
    .title {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-weight: 800;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .turns {
      display: flex;
      gap: 3px;
      margin-block: var(--space-3) var(--space-2);
    }
    .seg {
      flex: 1;
      height: 0.6rem;
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius-pill);
      background: var(--bg);
    }
    .seg.done {
      border-color: var(--accent-strong);
      background: var(--accent-strong);
    }
    .seg.now {
      border-color: var(--border);
      background: var(--surface-2);
    }
    .status {
      margin: 0 0 var(--space-2);
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .notice {
      padding: var(--space-3);
      border: var(--bw) solid var(--warning);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--warning);
      font-weight: 600;
    }
    .script {
      margin: var(--space-3) 0 0;
      padding: var(--space-3) var(--space-4) var(--space-3) var(--space-5);
      border-left: 4px solid var(--border-muted);
      background: var(--bg);
      border-radius: var(--radius-sm);
    }
    .script li {
      margin-bottom: var(--space-2);
      padding-left: var(--space-2);
    }
    .script li.now {
      background: var(--surface-2);
    }
  `,
})
export class AudioScriptPlayer {
  readonly recording = input.required<Recording>();
  /** Id used to count plays (part or clip id). */
  readonly playKey = input.required<string>();
  readonly label = input('Recording');

  protected readonly store = inject(ExamSessionStore);
  private readonly speech = inject(SpeechService);

  protected readonly playback = computed(() => this.speech.createPlayback(this.recording()));
  protected readonly state = computed(() => this.playback().state());
  protected readonly turn = computed(() => this.playback().turn());
  protected readonly turnCount = computed(() => this.playback().turnCount);
  protected readonly turnList = computed(() =>
    Array.from({ length: this.playback().turnCount }, (_, i) => i),
  );
  protected readonly open = signal(false);

  protected readonly plays = computed(() => this.store.listens(this.playKey()));
  protected readonly canStart = computed(() => this.plays() < this.store.maxListens());
  protected readonly unavailable = computed(
    () => !this.speech.supported || this.state() === 'failed',
  );
  protected readonly playsText = computed(() => {
    const max = this.store.maxListens();
    return max === Infinity ? `Played ${this.plays()}x` : `Plays ${this.plays()}/${max}`;
  });
  protected readonly primaryLabel = computed(() => {
    switch (this.state()) {
      case 'playing':
        return 'Pause';
      case 'paused':
        return 'Resume';
      case 'ended':
        return 'Play again';
      default:
        return this.plays() === 0 ? 'Play' : 'Play again';
    }
  });
  protected readonly primaryDisabled = computed(() => {
    const s = this.state();
    return (s === 'idle' || s === 'ended') && !this.canStart();
  });
  protected readonly repeatDisabled = computed(
    () => this.store.examMode() || this.state() === 'idle',
  );
  protected readonly canToggleTranscript = computed(
    () => this.store.transcriptAllowed() && !this.store.locked() && !this.unavailable(),
  );
  protected readonly transcriptVisible = computed(
    () => this.unavailable() || this.store.locked() || (this.canToggleTranscript() && this.open()),
  );
  protected readonly speakerName = computed(() => this.nameOf(this.playback().speakerId ?? ''));

  constructor() {
    // Stop speaking when the recording changes or the view goes away.
    effect((onCleanup) => {
      const playback = this.playback();
      onCleanup(() => playback.stop());
    });
  }

  protected nameOf(speakerId: string): string {
    return this.recording().speakers.find((s) => s.id === speakerId)?.name ?? 'Speaker';
  }

  protected onPrimary(): void {
    const playback = this.playback();
    switch (playback.state()) {
      case 'playing':
        playback.pause();
        break;
      case 'paused':
        playback.resume();
        break;
      default:
        if (!this.canStart()) return;
        this.store.addListen(this.playKey());
        playback.restart();
    }
  }
}
