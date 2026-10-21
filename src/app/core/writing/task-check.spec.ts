import { analyzeTask, hasKeyword, tenseVariety } from './task-check';
import type { TaskSpec } from './types';

const email: TaskSpec = {
  kind: 'email',
  title: 'Reply',
  wordCount: 'about 100 words',
  contentPoints: [
    { text: 'Say which place you would like to visit.', keywords: ['visit', 'castle'] },
    { text: 'Suggest what Alex should bring.', keywords: ['bring', 'jacket'] },
    { text: 'Ask Alex one question.', keywords: ['what', 'do you'], question: true },
  ],
};

const status = (items: ReturnType<typeof analyzeTask>, id: string) =>
  items.find((i) => i.id === id)?.status;

describe('hasKeyword', () => {
  const text = 'we are recycling bottles at the old town';
  const words = text.split(' ');
  it('matches the start of a word', () => {
    expect(hasKeyword(text, words, 'recycl')).toBe(true);
    expect(hasKeyword(text, words, 'cycl')).toBe(false);
  });
  it('matches phrases', () => {
    expect(hasKeyword(text, words, 'old town')).toBe(true);
    expect(hasKeyword(text, words, 'new town')).toBe(false);
  });
});

describe('analyzeTask', () => {
  it('is empty without a task', () => {
    expect(analyzeTask('hello', null)).toEqual([]);
  });

  it('marks nothing as done for an empty text', () => {
    const items = analyzeTask('', email);
    expect(items.filter((i) => i.kind === 'points').every((i) => i.status === 'todo')).toBe(true);
    expect(items.find((i) => i.id === 'point-0')?.detail).toBeUndefined();
  });

  it('detects covered points, greeting and closing', () => {
    const text =
      'Dear Alex,\nI would like to visit the castle. Please bring a jacket. Do you like castles?\nBest wishes,\nMaria';
    const items = analyzeTask(text, email);
    expect(status(items, 'point-0')).toBe('done');
    expect(status(items, 'point-1')).toBe('done');
    expect(status(items, 'point-2')).toBe('done');
    expect(status(items, 'greeting')).toBe('done');
    expect(status(items, 'closing')).toBe('done');
    expect(status(items, 'length')).toBe('todo');
  });

  it('needs a question mark for a question point', () => {
    const items = analyzeTask('Dear Alex, what a day.', email);
    expect(status(items, 'point-2')).toBe('todo');
    expect(items.find((i) => i.id === 'point-2')?.detail).toContain('question mark');
  });

  it('checks the opening sentence of a story, ignoring punctuation and case', () => {
    const story: TaskSpec = {
      kind: 'story',
      title: 'Story',
      wordCount: 'about 100 words',
      contentPoints: [],
      openingSentence: 'I was just about to leave when the phone rang.',
    };
    const good = 'i was just about to leave when the phone rang, so I stopped.';
    expect(status(analyzeTask(good, story), 'opening')).toBe('done');
    expect(status(analyzeTask('One day the phone rang.', story), 'opening')).toBe('todo');
  });

  it('reports length, paragraphs, connectors and verb forms for a longer text', () => {
    const long = Array.from(
      { length: 12 },
      () => 'I went home because it was late, but I will go out later.',
    ).join(' ');
    const items = analyzeTask(long, email);
    expect(status(items, 'length')).toBe('todo');
    expect(status(items, 'paragraphs')).toBe('todo');
    expect(status(items, 'connectors')).toBe('done');
    expect(items.find((i) => i.id === 'tenses')).toBeDefined();
    const paragraphs = analyzeTask(`${long}\n${long}`, email);
    expect(status(paragraphs, 'paragraphs')).toBe('done');
  });
});

describe('tenseVariety', () => {
  it('lists the verb forms it finds', () => {
    const found = tenseVariety(
      "Yesterday I went out. I'm working now. I will call you. I have never been there.",
    );
    expect(found).toEqual(
      expect.arrayContaining(['past simple', 'present continuous', 'future', 'present perfect']),
    );
  });
});
