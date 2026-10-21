import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Button, Icon } from '../../../shared/ui';
import { isResponded, type PromptRef } from '../parts/speaking-prompts';
import { ExamSessionStore } from '../session/exam-session.store';
import { SpeakingResponse } from './speaking-response';

/**
 * Questions one at a time. The examiner can read the current question aloud; the learner answers
 * it, then moves on. Navigation is disabled while a recording is running so that nothing is lost.
 */
@Component({
  selector: 'app-question-sequence',
  imports: [Button, Icon, SpeakingResponse],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="dots" [attr.aria-label]="label()">
      <ol>
        @for (q of questions(); track q.id; let i = $index) {
          <li>
            <button
              type="button"
              class="dot"
              [attr.aria-current]="i === index() ? 'step' : null"
              [attr.aria-label]="'Question ' + (i + 1) + (answered(q.id) ? ', answered' : '')"
              [attr.data-done]="answered(q.id)"
              [disabled]="recording()"
              (click)="index.set(i)"
            >
              {{ i + 1 }}
            </button>
          </li>
        }
      </ol>
    </nav>

    @for (q of current(); track q.id) {
      <app-speaking-response
        [itemId]="q.id"
        [heading]="q.label"
        [hint]="'Question ' + (index() + 1) + ' of ' + questions().length"
        [partType]="partType()"
        [targetSeconds]="targetSeconds()"
        [examiner]="true"
        (recordingChange)="recording.set($event)"
      />
    }

    <div class="pager">
      <button
        appButton
        size="sm"
        type="button"
        [disabled]="index() === 0 || recording()"
        (click)="index.set(index() - 1)"
      >
        <app-icon name="back" [size]="16" />
        Previous question
      </button>
      <button
        appButton
        size="sm"
        type="button"
        [disabled]="index() >= questions().length - 1 || recording()"
        (click)="index.set(index() + 1)"
      >
        Next question
        <app-icon name="arrow" [size]="16" />
      </button>
    </div>
    @if (recording()) {
      <p class="muted note">Stop recording before you go to another question.</p>
    }
  `,
  styles: `
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .dot {
      display: inline-grid;
      place-items: center;
      width: var(--target);
      height: var(--target);
      padding: 0;
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-mono);
      font-weight: 700;
      cursor: pointer;
    }
    .dot[data-done='true'] {
      border-color: var(--success);
    }
    .dot[aria-current='step'] {
      border-color: var(--border);
      background: var(--text);
      color: var(--bg);
    }
    .dot:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .pager {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .note {
      font-size: var(--step--1);
    }
  `,
})
export class QuestionSequence {
  readonly questions = input.required<PromptRef[]>();
  readonly partType = input.required<string>();
  readonly targetSeconds = input(30);
  readonly label = input('Questions');

  private readonly store = inject(ExamSessionStore);
  protected readonly index = signal(0);
  protected readonly recording = signal(false);
  /** One-element list: the response card is recreated for every question. */
  protected readonly current = computed(() => {
    const q = this.questions()[this.index()];
    return q ? [q] : [];
  });

  protected answered(id: string): boolean {
    return isResponded(this.store.answers(), id);
  }
}
