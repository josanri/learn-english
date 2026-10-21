import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { USEFUL_PHRASES, analyzeSpeech } from '../../../core/speech-metrics';
import { formatClock } from '../ui/exam-header';

/**
 * Orientative feedback on one spoken answer: duration, words, pace, sentence length, vocabulary
 * variety, B1 linking words, hesitations and phrases worth trying. Practice guidance only.
 */
@Component({
  selector: 'app-speech-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fb" [attr.aria-labelledby]="headingId()">
      <h4 [id]="headingId()">Practice feedback</h4>
      <p class="muted note">
        These numbers are only a guide to help you practise. They are not an exam score, and speech
        recognition can make mistakes, so correct the transcript first.
      </p>
      @if (metrics().words === 0) {
        <p>Record or type an answer to see feedback.</p>
      } @else {
        <dl class="stats">
          <div>
            <dt>Time</dt>
            <dd class="mono">
              {{ metrics().durationSeconds === null ? 'n/a' : clock(metrics().durationSeconds) }}
            </dd>
          </div>
          <div>
            <dt>Words</dt>
            <dd class="mono">{{ metrics().words }}</dd>
          </div>
          <div>
            <dt>Words per minute</dt>
            <dd class="mono">{{ metrics().wordsPerMinute ?? 'n/a' }}</dd>
          </div>
          <div>
            <dt>Average sentence</dt>
            <dd class="mono">
              {{
                metrics().averageSentenceLength === null
                  ? 'n/a'
                  : metrics().averageSentenceLength + ' words'
              }}
            </dd>
          </div>
          <div>
            <dt>Word variety</dt>
            <dd class="mono">
              {{
                metrics().lexicalVariety === null ? 'n/a' : percent(metrics().lexicalVariety) + '%'
              }}
            </dd>
          </div>
        </dl>
        <p class="muted small">
          A comfortable pace is about 100 to 150 words per minute. Sentence length needs full stops
          in the transcript; add them when you edit.
        </p>
        <p>
          <strong>Linking words you used:</strong>
          @if (metrics().connectors.length > 0) {
            @for (c of metrics().connectors; track c.text; let last = $last) {
              <span class="mono">{{ c.text }}{{ c.count > 1 ? ' x' + c.count : '' }}</span
              >{{ last ? '' : ', ' }}
            }
          } @else {
            none yet. Try because, however, although, so or first of all.
          }
        </p>
        <p>
          <strong>Hesitation sounds:</strong>
          @if (metrics().fillers.length > 0) {
            @for (c of metrics().fillers; track c.text; let last = $last) {
              <span class="mono">{{ c.text }}{{ c.count > 1 ? ' x' + c.count : '' }}</span
              >{{ last ? '' : ', ' }}
            }
            . A short pause is better than a filler.
          } @else {
            none found.
          }
        </p>
      }
      <p><strong>Useful phrases for this part:</strong></p>
      <ul>
        @for (phrase of phrases(); track phrase) {
          <li>{{ phrase }}</li>
        }
      </ul>
    </section>
  `,
  styles: `
    .fb {
      padding: var(--space-4);
      border: var(--bw) dashed var(--border-muted);
      border-radius: var(--radius);
      background: var(--bg);
    }
    h4 {
      margin: 0 0 var(--space-2);
      font-size: var(--step-0);
    }
    .note,
    .small {
      font-size: var(--step--1);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      gap: var(--space-3);
      margin: var(--space-3) 0;
    }
    .stats div {
      padding: var(--space-2) var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius-sm);
      background: var(--surface);
    }
    dt {
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    dd {
      margin: 0;
      font-size: var(--step-1);
      font-weight: 700;
    }
    ul {
      margin: 0;
      padding-left: var(--space-5);
    }
  `,
})
export class SpeechFeedback {
  readonly text = input.required<string>();
  readonly durationSeconds = input<number | null>(null);
  readonly partType = input.required<string>();
  readonly uid = input.required<string>();

  protected readonly metrics = computed(() => analyzeSpeech(this.text(), this.durationSeconds()));
  protected readonly phrases = computed(() => USEFUL_PHRASES[this.partType()] ?? []);
  protected readonly headingId = computed(() => `fb-${this.uid()}`);

  protected clock(seconds: number | null): string {
    return seconds === null ? '' : formatClock(Math.round(seconds));
  }

  protected percent(value: number | null): number {
    return Math.round((value ?? 0) * 100);
  }
}
