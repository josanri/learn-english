import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DiscussionPart, InterviewSpeakingPart } from '../../../models/exam';
import { speakingPrompts } from '../parts/speaking-prompts';
import { QuestionSequence } from './question-sequence';

/** Speaking parts made of questions asked one at a time: `interview` (Part 1) and `discussion` (Part 4). */
@Component({
  selector: 'app-questions-part',
  imports: [QuestionSequence],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-question-sequence
      [questions]="questions()"
      [partType]="part().type"
      [targetSeconds]="seconds()"
      [label]="label()"
      [panel]="true"
    />
  `,
})
export class QuestionsPart {
  readonly part = input.required<InterviewSpeakingPart | DiscussionPart>();
  protected readonly questions = computed(() => speakingPrompts(this.part()));
  protected readonly seconds = computed(() => (this.part().type === 'interview' ? 30 : 45));
  protected readonly label = computed(() =>
    this.part().type === 'interview' ? 'Interview questions' : 'Discussion questions',
  );
}
