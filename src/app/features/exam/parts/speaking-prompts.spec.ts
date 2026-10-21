import type { CollaborativeTaskPart, MonologueTopicPart, RolePlayPart } from '../../../models/exam';
import { decisionId, isResponded, monologueId, speakingPrompts } from './speaking-prompts';

const base = { number: 1, title: '', instructions: '' };

describe('speakingPrompts', () => {
  it('adds a decision prompt to a collaborative task', () => {
    const part: CollaborativeTaskPart = {
      ...base,
      id: 'speaking-3',
      type: 'collaborative-task',
      prompt: 'Choose',
      images: [
        { id: 'a', title: 'A', alt: '' },
        { id: 'b', title: 'B', alt: '' },
      ],
    };
    expect(speakingPrompts(part).map((p) => p.id)).toEqual(['a', 'b', decisionId('speaking-3')]);
  });

  it('lists the talk and the follow-up questions of a monologue', () => {
    const part: MonologueTopicPart = {
      ...base,
      id: 'speaking-2',
      type: 'monologue-topic',
      topics: [{ id: 't1', prompt: 'Topic' }],
      preparationSeconds: 60,
      speakingSeconds: 120,
      followUpQuestions: [{ id: 'f1', prompt: 'Why?' }],
    };
    expect(speakingPrompts(part).map((p) => p.id)).toEqual([monologueId('speaking-2'), 'f1']);
  });

  it('has one prompt for a role play', () => {
    const part: RolePlayPart = {
      ...base,
      id: 'speaking-5',
      type: 'role-play',
      situation: '',
      roleDescription: '',
      cues: [],
    };
    expect(speakingPrompts(part)).toEqual([{ id: 'speaking-5', label: 'Your role play' }]);
  });
});

describe('isResponded', () => {
  it('is true for a transcript or a recording, false for blank text', () => {
    expect(isResponded({ 'speaking:q': 'Hello' }, 'q')).toBe(true);
    expect(isResponded({ 'speaking-dur:q': 4.2 }, 'q')).toBe(true);
    expect(isResponded({ 'speaking:q': '   ' }, 'q')).toBe(false);
    expect(isResponded({}, 'q')).toBe(false);
  });
});
