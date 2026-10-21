import type { SpeakingPart } from '../../../models/exam';
import type { Answers } from '../engine/scoring';

/** A free-response prompt (something the learner records or types), as opposed to a marked item. */
export interface PromptRef {
  id: string;
  label: string;
}

/** Answer keys. `speaking:<id>` has existed since the React version; the others were added in phase 04. */
export const transcriptKey = (id: string) => `speaking:${id}`;
/** Seconds of audio recorded for the prompt (needed for words per minute). */
export const durationKey = (id: string) => `speaking-dur:${id}`;
/** Topic id the learner picked in a `monologue-topic` part. */
export const topicKey = (partId: string) => `speaking-topic:${partId}`;

/** Prompt id of the long turn of a monologue part and of the final choice in a collaborative task. */
export const monologueId = (partId: string) => `${partId}-talk`;
export const decisionId = (partId: string) => `${partId}-choice`;

/** Every response the learner gives in a speaking part, in display order. */
export function speakingPrompts(part: SpeakingPart): PromptRef[] {
  switch (part.type) {
    case 'interview':
    case 'discussion':
      return part.questions.map((q) => ({ id: q.id, label: q.prompt }));
    case 'photo-description':
      return part.images.map((i) => ({ id: i.id, label: i.title }));
    case 'collaborative-task':
      return [
        ...part.images.map((i) => ({ id: i.id, label: i.title })),
        { id: decisionId(part.id), label: 'Your decision' },
      ];
    case 'monologue-topic':
      return [
        { id: monologueId(part.id), label: 'Your talk' },
        ...part.followUpQuestions.map((q) => ({ id: q.id, label: q.prompt })),
      ];
    case 'role-play':
      return [{ id: part.id, label: 'Your role play' }];
  }
}

/** True once the learner has recorded something or typed a transcript for the prompt. */
export function isResponded(answers: Answers, id: string): boolean {
  const text = answers[transcriptKey(id)];
  return (
    (typeof text === 'string' && text.trim().length > 0) || answers[durationKey(id)] !== undefined
  );
}
