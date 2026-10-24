import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { MonologueTopicPart } from '../../../models/exam';
import { monologueId, topicKey } from '../parts/speaking-prompts';
import { ExamSessionStore } from '../session/exam-session.store';
import { PrepTimer } from './prep-timer';
import { QuestionSequence } from './question-sequence';
import { SpeakingResponse } from './speaking-response';

/** Prepared talk: choose a topic, prepare, speak, then answer follow-up questions (Trinity ISE I style). */
@Component({
  selector: 'app-monologue-part',
  imports: [PrepTimer, QuestionSequence, SpeakingResponse],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="topics" [disabled]="store.locked()">
      <legend>1. Choose a topic</legend>
      @for (topic of part().topics; track topic.id) {
        <label class="opt">
          <input
            type="radio"
            [name]="'topic-' + part().id"
            [value]="topic.id"
            [checked]="topic.id === chosenId()"
            (change)="choose(topic.id)"
          />
          <span>{{ topic.prompt }}</span>
        </label>
      }
    </fieldset>

    <div class="fold-panel">
      @if (chosen(); as topic) {
        <h3 class="step">2. Prepare (optional)</h3>
        <app-prep-timer [seconds]="part().preparationSeconds" />
        <h3 class="step">3. Give your talk</h3>
        <app-speaking-response
          [itemId]="talkId()"
          [heading]="topic.prompt"
          [hint]="'Speak for about ' + part().speakingSeconds + ' seconds.'"
          [partType]="part().type"
          [targetSeconds]="part().speakingSeconds"
        />
        <h3 class="step">4. Answer the follow-up questions</h3>
        <app-question-sequence
          [questions]="followUps()"
          partType="discussion"
          [targetSeconds]="30"
          label="Follow-up questions"
        />
      } @else {
        <p class="muted">Choose a topic to start.</p>
      }
    </div>
  `,
  styles: `
    .topics {
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      margin-bottom: var(--space-2);
      font-size: var(--step-1);
      font-weight: 800;
    }
    .opt {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: var(--target);
      margin-bottom: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
      cursor: pointer;
    }
    .opt:has(input:checked) {
      border-color: var(--border);
    }
    .opt:has(input:focus-visible) {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .step {
      margin-top: var(--space-5);
      font-size: var(--step-1);
    }
  `,
})
export class MonologuePart {
  readonly part = input.required<MonologueTopicPart>();
  protected readonly store = inject(ExamSessionStore);

  protected readonly chosenId = computed(() => {
    const value = this.store.answer(topicKey(this.part().id));
    return typeof value === 'string' ? value : '';
  });
  protected readonly chosen = computed(
    () => this.part().topics.find((t) => t.id === this.chosenId()) ?? null,
  );
  protected readonly talkId = computed(() => monologueId(this.part().id));
  protected readonly followUps = computed(() =>
    this.part().followUpQuestions.map((q) => ({ id: q.id, label: q.prompt })),
  );

  protected choose(id: string): void {
    this.store.setAnswer(topicKey(this.part().id), id);
  }
}
