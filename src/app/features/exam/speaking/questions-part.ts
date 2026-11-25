import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DiscussionPart, InterviewSpeakingPart } from '../../../models/exam';
import { Badge, Icon } from '../../../shared/ui';
import { speakingPrompts, type PromptRef } from '../parts/speaking-prompts';
import { QuestionSequence } from './question-sequence';

const WARMUP_PROMPTS = [
  { suffix: 'name', label: "What's your name?" },
  { suffix: 'spell', label: 'How do you spell your surname?' },
  { suffix: 'home', label: 'Where do you live?' },
  { suffix: 'work', label: 'Do you work or are you a student?' },
];

/** Speaking parts made of questions asked one at a time: `interview` (Part 1) and `discussion` (Part 4). */
@Component({
  selector: 'app-questions-part',
  imports: [Badge, Icon, QuestionSequence],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isInterview()) {
      <details class="warmup">
        <summary>
          <span class="warmup-lead">
            <span class="warmup-icon" aria-hidden="true">
              <app-icon name="chat" [size]="20" />
            </span>
            <span class="warmup-text">
              <span class="warmup-title">Warm-up: name, spelling &amp; home</span>
              <span class="warmup-sub">
                Cambridge Part 1 starts with these four short questions
              </span>
            </span>
          </span>
          <span class="warmup-meta">
            <app-badge tone="accent">Optional</app-badge>
            <span class="chevron" aria-hidden="true"></span>
          </span>
        </summary>
        <div class="warmup-body">
          <p class="muted intro">
            Practise saying your name, spelling your surname and talking briefly about home, work or
            study. Skipping this does not affect your progress.
          </p>
          <app-question-sequence
            [questions]="warmupQuestions()"
            partType="interview"
            [targetSeconds]="15"
            label="Warm-up questions"
            [panel]="false"
          />
        </div>
      </details>
    }
    <app-question-sequence
      [questions]="questions()"
      [partType]="part().type"
      [targetSeconds]="seconds()"
      [label]="label()"
      [panel]="true"
    />
  `,
  styles: `
    .warmup {
      margin-bottom: var(--space-5);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--t-fast) var(--ease);
    }
    .warmup:hover {
      box-shadow: var(--shadow);
    }
    .warmup summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      min-height: var(--target);
      padding: var(--space-3) var(--space-4);
      list-style: none;
      cursor: pointer;
    }
    .warmup summary::-webkit-details-marker {
      display: none;
    }
    .warmup-lead {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }
    .warmup-icon {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 2.25rem;
      height: 2.25rem;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--accent);
      color: var(--on-accent);
    }
    .warmup-text {
      display: grid;
      gap: 0.1rem;
    }
    .warmup-title {
      font-weight: 800;
      line-height: 1.25;
    }
    .warmup-sub {
      color: var(--text-muted);
      font-size: var(--step--1);
      line-height: 1.3;
    }
    .warmup-meta {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      margin-left: auto;
    }
    .chevron {
      display: inline-block;
      width: 0.55rem;
      height: 0.55rem;
      border-right: var(--bw) solid currentColor;
      border-bottom: var(--bw) solid currentColor;
      transform: rotate(-45deg);
      transition: transform var(--t-fast) var(--ease);
    }
    .warmup[open] .chevron {
      transform: rotate(45deg);
    }
    .warmup-body {
      padding: var(--space-4);
      border-top: var(--bw) solid var(--border-muted);
      background: var(--bg);
      border-radius: 0 0 var(--radius) var(--radius);
    }
    .intro {
      margin: 0 0 var(--space-4);
      font-size: var(--step--1);
    }
  `,
})
export class QuestionsPart {
  readonly part = input.required<InterviewSpeakingPart | DiscussionPart>();
  protected readonly isInterview = computed(() => this.part().type === 'interview');
  protected readonly warmupQuestions = computed<PromptRef[]>(() => {
    const id = this.part().id;
    return WARMUP_PROMPTS.map((q) => ({ id: `${id}-warmup-${q.suffix}`, label: q.label }));
  });
  protected readonly questions = computed(() => speakingPrompts(this.part()));
  protected readonly seconds = computed(() => (this.part().type === 'interview' ? 30 : 45));
  protected readonly label = computed(() =>
    this.part().type === 'interview' ? 'Interview questions' : 'Discussion questions',
  );
}
