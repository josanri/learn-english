import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { AudioDbService, recordingKey } from '../../../core/audio-db.service';
import { MicRecorderService, type FinishedRecording } from '../../../core/mic-recorder.service';
import { SettingsService } from '../../../core/settings.service';
import { SpeechRecognitionService, joinText } from '../../../core/speech-recognition.service';
import { SpeechService } from '../../../core/speech.service';
import { Badge, Button, Chip, Icon, ToastService } from '../../../shared/ui';
import { durationKey, transcriptKey } from '../parts/speaking-prompts';
import { ExamSessionStore } from '../session/exam-session.store';
import { formatClock } from '../ui/exam-header';
import { SpeechFeedback } from './speech-feedback';

/**
 * One spoken response: record (with live transcript), play back, record again, delete, and edit the
 * transcript. The recording lives in IndexedDB under `<examId>:<attemptId>:<itemId>`; the transcript
 * is the answer `speaking:<itemId>` and the audio length is `speaking-dur:<itemId>`.
 *
 * Provides its own recorder and recognition services, so every card has independent state and the
 * microphone is released when the card goes away.
 */
@Component({
  selector: 'app-speaking-response',
  imports: [Badge, Button, Chip, Icon, SpeechFeedback],
  providers: [MicRecorderService, SpeechRecognitionService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="card"
      [attr.aria-labelledby]="'h-' + uid()"
      [id]="'in-' + itemId()"
      tabindex="-1"
    >
      <header class="head">
        <h3 [id]="'h-' + uid()">{{ heading() }}</h3>
        @if (hasRecording()) {
          <app-badge tone="success">Recorded</app-badge>
        }
      </header>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }

      @if (examiner() && speech.supported) {
        <p>
          <button appButton size="sm" type="button" [disabled]="recording()" (click)="ask()">
            <app-icon name="volume" [size]="18" />
            {{ asking() ? 'Examiner is speaking...' : 'Hear the question' }}
          </button>
        </p>
      }

      <div class="controls">
        @if (!store.locked()) {
          @if (recording()) {
            <button appButton variant="danger" type="button" (click)="stop()">
              <app-icon name="stop" [size]="20" />
              Stop recording
            </button>
          } @else {
            <button appButton variant="primary" type="button" [disabled]="busy()" (click)="start()">
              <app-icon name="mic" [size]="20" />
              {{ hasRecording() ? 'Record again' : 'Start recording' }}
            </button>
          }
        }
        @if (recording() || targetSeconds() > 0) {
          @if (store.showTimer() || recording()) {
            <app-chip [command]="true" [prompt]="false">
              <app-icon name="clock" [size]="16" />
              @if (recording()) {
                <span role="timer"
                  ><span class="visually-hidden">Time left: </span>{{ clock() }}</span
                >
              } @else {
                <span>Suggested {{ suggested() }}</span>
              }
            </app-chip>
          }
        }
        @if (recording()) {
          <div class="meter" aria-hidden="true">
            <span class="bar" [style.width.%]="mic.level() * 100"></span>
          </div>
        }
      </div>

      <p class="status" role="status">{{ statusText() }}</p>
      @if (mic.error()) {
        <p class="error" role="alert">{{ mic.error() }}</p>
      }
      @if (saveError()) {
        <p class="error" role="alert">{{ saveError() }}</p>
      }
      @if (recognition.error()) {
        <p class="error" role="alert">{{ recognition.error() }}</p>
      }

      @if (!store.locked()) {
        @if (!recognition.supported) {
          <p class="notice">
            Live transcription is not available in this browser. You can still record your answer;
            type what you said in the transcript box if you want feedback.
          </p>
        } @else if (recognition.needsOnlinePermission()) {
          <div class="notice">
            <p>
              Your device cannot transcribe English on its own, and online speech recognition is
              switched off. The browser may send your speech to its recognition service. Your
              recording itself always stays on this device.
            </p>
            <button appButton size="sm" type="button" (click)="allowOnline()">
              Allow online recognition
            </button>
          </div>
        } @else if (recognition.capability() === 'downloadable') {
          <div class="notice">
            <p>On-device English recognition can be downloaded for this browser.</p>
            <button
              appButton
              size="sm"
              type="button"
              [disabled]="recognition.installing()"
              (click)="install()"
            >
              {{ recognition.installing() ? 'Downloading...' : 'Download on-device recognition' }}
            </button>
          </div>
        }
      }

      @if (recording() && recognition.supported) {
        <div class="live" aria-label="Live transcript">
          <span class="visually-hidden">Live transcript: </span>
          <span class="final" aria-live="polite" aria-atomic="false">{{ liveFinal() }}</span>
          @if (recognition.interimTranscript()) {
            <span class="interim" aria-hidden="true"> {{ recognition.interimTranscript() }}</span>
          } @else if (!liveFinal()) {
            <span class="placeholder">Listening. Your words will appear here.</span>
          }
        </div>
      }

      @if (audioUrl()) {
        <div class="playback">
          <audio controls [src]="audioUrl()" [attr.aria-label]="'Your recording: ' + heading()">
            Your browser cannot play audio.
          </audio>
          @if (!store.locked() && !recording()) {
            <button appButton size="sm" variant="ghost" type="button" (click)="remove()">
              <app-icon name="trash" [size]="16" />
              Delete recording
            </button>
          }
        </div>
      }

      <div class="field">
        <label [for]="'t-' + uid()">Transcript <span class="muted">(you can edit it)</span></label>
        <textarea
          [id]="'t-' + uid()"
          rows="4"
          [value]="transcript()"
          [readOnly]="recording() || store.locked()"
          placeholder="What you say appears here. You can also type or correct your answer."
          (input)="edit($any($event.target).value)"
        ></textarea>
      </div>

      @if (store.transcriptAllowed()) {
        @if ((transcript().trim() || hasRecording()) && !recording()) {
          <details class="feedback">
            <summary>Practice feedback for this answer</summary>
            <app-speech-feedback
              [text]="transcript()"
              [durationSeconds]="duration()"
              [partType]="partType()"
              [uid]="uid()"
            />
          </details>
        }
      } @else {
        <p class="muted small">Practice feedback appears after you finish this section.</p>
      }
    </article>
  `,
  styles: `
    .card {
      margin-block: var(--space-4);
      padding: var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .card:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 3px;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }
    h3 {
      margin: 0;
      font-size: var(--step-1);
      letter-spacing: 0;
    }
    .hint {
      color: var(--text-muted);
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      margin-block: var(--space-3);
    }
    .meter {
      flex: 1 1 8rem;
      min-width: 6rem;
      height: 0.75rem;
      overflow: hidden;
      border: var(--bw) solid var(--border);
      border-radius: 999px;
      background: var(--bg);
    }
    .bar {
      display: block;
      height: 100%;
      background: var(--accent);
      transition: width 80ms linear;
    }
    .status {
      min-height: 1.5em;
      margin: 0 0 var(--space-2);
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .error {
      margin: 0 0 var(--space-2);
      color: var(--danger);
      font-weight: 600;
    }
    .notice {
      margin-block: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-left-width: 6px;
      border-radius: var(--radius-sm);
      background: var(--bg);
      font-size: var(--step--1);
    }
    .notice p {
      margin: 0 0 var(--space-2);
    }
    .live {
      margin-block: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      font-size: var(--step-0);
      line-height: 1.5;
    }
    .interim,
    .placeholder {
      color: var(--text-muted);
      font-style: italic;
    }
    .playback {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      margin-block: var(--space-3);
    }
    audio {
      max-width: 100%;
    }
    .field label {
      display: block;
      margin-bottom: var(--space-1);
      font-weight: 700;
    }
    textarea {
      width: 100%;
      min-height: 7rem;
      padding: var(--space-3);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font: inherit;
      resize: vertical;
    }
    textarea:read-only {
      background: var(--surface-2);
    }
    .feedback {
      margin-top: var(--space-3);
    }
    .feedback summary {
      display: flex;
      align-items: center;
      min-height: var(--target);
      font-weight: 700;
      cursor: pointer;
    }
    .small {
      margin: var(--space-3) 0 0;
      font-size: var(--step--1);
    }
  `,
})
export class SpeakingResponse {
  /** Stable id of the prompt: the answer key suffix and the recording key. */
  readonly itemId = input.required<string>();
  readonly heading = input.required<string>();
  readonly hint = input('');
  /** Kind of part, for the useful phrases (`interview`, `photo-description`...). */
  readonly partType = input.required<string>();
  /** Suggested speaking time in seconds (0 for none). It counts down while recording. */
  readonly targetSeconds = input(0);
  /** Offers to read the heading aloud as the examiner. */
  readonly examiner = input(false);
  /** True while this card is recording (parents disable navigation meanwhile). */
  readonly recordingChange = output<boolean>();

  protected readonly store = inject(ExamSessionStore);
  protected readonly mic = inject(MicRecorderService);
  protected readonly recognition = inject(SpeechRecognitionService);
  protected readonly speech = inject(SpeechService);
  private readonly audio = inject(AudioDbService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);

  protected readonly uid = computed(() => this.itemId().replace(/[^a-zA-Z0-9_-]/g, '-'));
  private readonly key = computed(() => {
    const examId = this.store.examId();
    return examId ? recordingKey(examId, this.store.attemptId(), this.itemId()) : '';
  });

  protected readonly audioUrl = signal('');
  protected readonly saveError = signal('');
  protected readonly asking = signal(false);
  protected readonly recording = computed(() => this.mic.state() === 'recording');
  protected readonly busy = computed(
    () => this.mic.state() === 'requesting' || this.mic.state() === 'saving',
  );
  protected readonly hasRecording = computed(() => this.audioUrl() !== '');
  protected readonly elapsed = signal(0);
  protected readonly timeUp = signal(false);

  protected readonly transcript = computed(() => {
    const value = this.store.answer(transcriptKey(this.itemId()));
    return typeof value === 'string' ? value : '';
  });
  protected readonly duration = computed(() => {
    const value = this.store.answer(durationKey(this.itemId()));
    return typeof value === 'number' ? value : null;
  });
  protected readonly liveFinal = computed(() => this.recognition.finalTranscript());
  protected readonly suggested = computed(() => formatClock(this.targetSeconds()));
  protected readonly clock = computed(() =>
    formatClock(this.targetSeconds() > 0 ? this.targetSeconds() - this.elapsed() : this.elapsed()),
  );
  protected readonly statusText = computed(() => {
    switch (this.mic.state()) {
      case 'requesting':
        return 'Waiting for the microphone. Allow access if your browser asks.';
      case 'recording':
        return this.timeUp()
          ? 'Time is up. You can finish your sentence and stop recording.'
          : 'Recording. Speak now.';
      case 'saving':
        return 'Saving your recording...';
      default:
        return this.asking() ? 'The examiner is speaking.' : '';
    }
  });

  private audioObjectUrl = '';
  /** What the current recording writes to; captured at start so that leaving the page still saves it. */
  private session: { key: string; itemId: string; base: string } | null = null;
  /** Where recognised text goes; kept for a moment after stopping because late results still arrive. */
  private live: { itemId: string; base: string } | null = null;
  private liveTimer: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;
  private tick: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // Load the saved recording whenever the exam, attempt or prompt changes.
    effect((onCleanup) => {
      const key = this.key();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      untracked(() => this.setAudio(null));
      if (!key) return;
      this.audio
        .load(key)
        .then((blob) => {
          if (!cancelled) this.setAudio(blob);
        })
        .catch(() => {
          if (!cancelled) this.saveError.set('The saved recording could not be loaded.');
        });
    });

    // Live text goes into the answer as it arrives.
    effect(() => {
      const final = this.recognition.finalTranscript();
      untracked(() => this.pushTranscript(final));
    });

    effect(() => this.recordingChange.emit(this.recording()));

    // Safety net for leaving the page while recording: keep what was said.
    this.mic.salvage = (finished) => void this.persist(finished, this.session);

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearInterval(this.tick);
      clearTimeout(this.liveTimer);
      this.speech.cancelSpeech();
      this.pushTranscript(this.recognition.finalTranscript());
      if (this.audioObjectUrl) URL.revokeObjectURL(this.audioObjectUrl);
      this.audioObjectUrl = '';
    });
  }

  protected async start(): Promise<void> {
    if (this.store.locked() || this.busy() || this.recording()) return;
    this.speech.cancelSpeech();
    this.asking.set(false);
    this.saveError.set('');
    const replace = this.hasRecording();
    const base = replace ? '' : this.transcript();
    this.session = { key: this.key(), itemId: this.itemId(), base };
    clearTimeout(this.liveTimer);
    this.live = { itemId: this.itemId(), base };
    const track = await this.mic.start();
    if (!track) {
      this.session = null;
      this.live = null;
      return;
    }
    this.elapsed.set(0);
    this.timeUp.set(false);
    clearInterval(this.tick);
    this.tick = setInterval(() => {
      this.elapsed.update((n) => n + 1);
      if (this.targetSeconds() > 0 && this.elapsed() === this.targetSeconds())
        this.timeUp.set(true);
    }, 1000);
    if (this.recognition.supported) await this.recognition.start(track);
  }

  protected async stop(): Promise<void> {
    clearInterval(this.tick);
    this.recognition.stop();
    const session = this.session;
    const finished = await this.mic.stop();
    await this.persist(finished, session);
    this.mic.done();
    this.session = null;
    this.liveTimer = setTimeout(() => (this.live = null), 3000);
  }

  protected async persist(
    finished: FinishedRecording | null,
    session: SpeakingResponse['session'],
  ): Promise<void> {
    if (!finished || !session) return;
    try {
      await this.audio.save(session.key, finished.blob);
      this.store.setAnswer(durationKey(session.itemId), finished.durationSeconds);
      if (!this.destroyed && session.key === this.key()) this.setAudio(finished.blob);
    } catch {
      this.saveError.set(
        'The recording finished, but this browser could not save it on your device. Private windows often block this.',
      );
    }
  }

  protected async remove(): Promise<void> {
    try {
      await this.audio.delete(this.key());
      this.store.removeAnswer(durationKey(this.itemId()));
      this.setAudio(null);
      this.toast.show('Recording deleted. Your transcript is kept.', 'success');
    } catch {
      this.saveError.set('The recording could not be deleted.');
    }
  }

  protected edit(value: string): void {
    this.store.setAnswer(transcriptKey(this.itemId()), value);
  }

  protected async ask(): Promise<void> {
    this.asking.set(true);
    await this.speech.speakText(this.heading());
    this.asking.set(false);
  }

  protected allowOnline(): void {
    this.settings.update({ onlineRecognition: true });
    this.recognition.needsOnlinePermission.set(false);
    if (this.recording()) void this.recognition.start(this.mic.track);
    else this.toast.show('Online recognition is on. Start recording again.', 'success');
  }

  protected async install(): Promise<void> {
    const ok = await this.recognition.install();
    this.toast.show(
      ok ? 'On-device recognition is ready.' : 'The download did not finish. You can try again.',
      ok ? 'success' : 'info',
    );
  }

  /** Writes recognised text into the answer: after the text that was there before this recording. */
  private pushTranscript(final: string): void {
    const live = this.live;
    if (!final || !live) return;
    this.store.setAnswer(transcriptKey(live.itemId), joinText(live.base, final));
  }

  private setAudio(blob: Blob | null): void {
    if (this.audioObjectUrl) URL.revokeObjectURL(this.audioObjectUrl);
    this.audioObjectUrl = blob ? URL.createObjectURL(blob) : '';
    this.audioUrl.set(this.audioObjectUrl);
  }
}
