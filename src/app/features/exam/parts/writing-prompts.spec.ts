import type { WritingPart, WritingSection } from '../../../models/exam';
import { isResponded } from './speaking-prompts';
import {
  checkKey,
  rubricKey,
  selectedTask,
  taskSpec,
  taskVocabulary,
  writingPrompts,
  writingSummary,
} from './writing-prompts';

const email: WritingPart = {
  type: 'email',
  id: 'writing-1',
  number: 1,
  title: 'Part 1: Email',
  instructions: '',
  task: {
    kind: 'email',
    title: 'Reply',
    prompt: 'Your friend Alex is coming. Write a reply.',
    wordCount: 'about 100 words',
    sourceEmail: { from: 'Alex', subject: 'Your visit', body: 'See you in Valencia soon!' },
    notes: ['Say where to go.'],
    contentPoints: [{ text: 'Say where to go.', keywords: ['visit', 'go to'] }],
  },
};
const choice: WritingPart = {
  type: 'choice-task',
  id: 'writing-2',
  number: 2,
  title: 'Part 2',
  instructions: '',
  options: [
    { kind: 'article', title: 'Article', prompt: 'p', wordCount: 'about 100 words' },
    {
      kind: 'story',
      title: 'Story',
      prompt: 'p',
      wordCount: 'about 100 words',
      openingSentence: 'It rained.',
      contentPoints: [{ text: 'End', keywords: ['end', 'finally'] }],
    },
  ],
};
const section: WritingSection = { skill: 'writing', timeLimitMinutes: 45, parts: [email, choice] };

describe('writing prompts', () => {
  it('has one prompt per part, keyed by the part id', () => {
    expect(writingPrompts(email)).toEqual([{ id: 'writing-1', label: 'Part 1: Email' }]);
    expect(writingPrompts(choice)).toEqual([{ id: 'writing-2', label: 'Part 2' }]);
  });

  it('counts a written answer as a response, and a blank one as none', () => {
    expect(isResponded({ 'writing-1': 'Dear Alex' }, 'writing-1')).toBe(true);
    expect(isResponded({ 'writing-1': '  \n ' }, 'writing-1')).toBe(false);
    expect(isResponded({}, 'writing-1')).toBe(false);
    expect(isResponded({ 'speaking:s1': 'hi' }, 's1')).toBe(true);
  });

  it('picks the chosen task of a choice part, the first by default', () => {
    expect(selectedTask(choice, {}).kind).toBe('article');
    expect(selectedTask(choice, { 'writing-2-type': 'story' }).kind).toBe('story');
    expect(selectedTask(choice, { 'writing-2-type': 'poem' }).kind).toBe('article');
    expect(selectedTask(email, {}).kind).toBe('email');
  });

  it('builds the task spec for the checker', () => {
    expect(taskSpec(selectedTask(email, {}))).toMatchObject({
      kind: 'email',
      contentPoints: [{ keywords: ['visit', 'go to'] }],
    });
    const story = taskSpec(selectedTask(choice, { 'writing-2-type': 'story' }));
    expect(story.openingSentence).toBe('It rained.');
    expect(taskSpec(selectedTask(choice, {})).contentPoints).toEqual([]);
  });

  it('collects names from the task for the spelling checker', () => {
    const words = taskVocabulary(selectedTask(email, {}), ['Marisol']);
    expect(words).toEqual(expect.arrayContaining(['alex', 'valencia', 'marisol']));
    expect(new Set(words).size).toBe(words.length);
  });

  it('summarises text, length, rubric and check counts', () => {
    const answers = {
      'writing-1': 'Dear Alex, I want to visit the castle.',
      'writing-2': 'Hello',
      'writing-2-type': 'story',
      [rubricKey('writing-1', 'content')]: 4,
      [rubricKey('writing-1', 'language')]: 3,
      [checkKey('writing-1')]: JSON.stringify({
        words: 8,
        spelling: 1,
        grammar: 2,
        vocabulary: 0,
        checklistDone: 3,
        checklistTotal: 5,
        at: 'x',
      }),
    };
    const [one, two] = writingSummary(section, answers);
    expect(one).toMatchObject({ words: 8, state: 'short', target: 'about 100' });
    expect(one.rubric).toEqual({
      content: 4,
      communication: null,
      organisation: null,
      language: 3,
    });
    expect(one.rubricAverage).toBe(3.5);
    expect(one.check).toMatchObject({ spelling: 1, grammar: 2, checklistTotal: 5 });
    expect(two.task.kind).toBe('story');
    expect(two.rubricAverage).toBeNull();
    expect(two.check).toBeNull();
  });

  it('ignores a broken check summary', () => {
    const [one] = writingSummary(section, { [checkKey('writing-1')]: '{oops' });
    expect(one.check).toBeNull();
  });
});
