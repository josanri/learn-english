import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import {
  checkFlashcards,
  checkPhrasalVerbs,
  checkStory,
  checkStoryIndex,
  countStoryWords,
  exampleUsesWord,
  glossKeys,
  indexEntry,
} from './practice-rules.mjs';

const card = (patch = {}) => ({
  id: 'borrow',
  w: 'borrow',
  p: 'v',
  t: 'general',
  d: 'take something and give it back later',
  e: 'Can I borrow your pen?',
  ...patch,
});
const deck = (cards, topics = [{ id: 'general', name: 'Everyday words' }]) => ({ topics, cards });

const verb = (patch = {}) => ({
  id: 'give-up',
  verb: 'give up',
  meaning: 'stop doing something',
  example: 'She [[gave up]] chocolate.',
  group: 'daily',
  ...patch,
});
const verbs = (list) => ({ groups: [{ id: 'daily', name: 'Daily life' }], verbs: list });

const text =
  'Marta found an old {{notebook}} in the {{kitchen}}. It was {{hidden|hide}} behind a brick.';
const story = (patch = {}) => {
  const paragraphs = [
    text,
    'She read every page. Then she ran to the garden to show her grandfather what she had found.'.repeat(
      8,
    ),
  ];
  return {
    id: 'notebook',
    title: 'The notebook',
    summary: 'A girl finds a notebook.',
    topic: 'Family',
    level: 'B1',
    words: countStoryWords(paragraphs),
    paragraphs,
    glossary: {
      notebook: { meaning: 'a small book for writing in' },
      kitchen: { meaning: 'the room where you cook' },
      hide: { meaning: 'put something where nobody can see it' },
    },
    questions: [0, 1, 2].map((i) => ({
      question: `Question ${i}?`,
      options: ['a', 'b', 'c'],
      answer: 1,
      explanation: 'Because.',
    })),
    ...patch,
  };
};

test('a good deck passes and examples may use inflected forms', () => {
  assert.deepEqual(checkFlashcards(deck([card()])), []);
  assert.equal(exampleUsesWord('She applied for the job.', 'apply'), true);
  assert.equal(exampleUsesWord('Nothing here.', 'borrow'), false);
});

test('flashcards: duplicates, unknown topics and examples without the word fail', () => {
  const errors = checkFlashcards(
    deck([card(), card(), card({ id: 'x', w: 'lend', t: 'food', e: 'No match here.' })]),
  );
  assert.ok(errors.some((e) => e.includes('duplicate id')));
  assert.ok(errors.some((e) => e.includes('unknown topic')));
  assert.ok(errors.some((e) => e.includes('does not use "lend"')));
});

test('phrasal verbs: marked words must match the particles', () => {
  assert.deepEqual(checkPhrasalVerbs(verbs([verb()])), []);
  assert.deepEqual(
    checkPhrasalVerbs(
      verbs([verb({ example: '[[Turn]] it [[up]].', verb: 'turn up', id: 'turn-up' })]),
    ),
    [],
  );
  const errors = checkPhrasalVerbs(
    verbs([
      verb({ example: 'She [[gave in]] chocolate.' }),
      verb({ id: 'x', verb: 'go', example: 'I [[go]].' }),
    ]),
  );
  assert.ok(errors.some((e) => e.includes('must be the verb followed by "up"')));
  assert.ok(errors.some((e) => e.includes('needs a verb and at least one particle')));
});

test('phrasal verbs: similar ids must exist', () => {
  const errors = checkPhrasalVerbs(verbs([verb({ similar: ['nope', 'give-up'] })]));
  assert.ok(errors.some((e) => e.includes('unknown id "nope"')));
  assert.ok(errors.some((e) => e.includes('lists the verb itself')));
});

test('stories: glossary, words and questions', () => {
  assert.deepEqual(glossKeys(text), ['notebook', 'kitchen', 'hide']);
  assert.deepEqual(checkStory(story(), 'notebook'), []);
  const broken = story({
    words: 3,
    glossary: { notebook: { meaning: 'x' }, extra: { meaning: 'y' } },
    questions: [{ question: 'Q?', options: ['a', 'a', 'b'], answer: 5, explanation: 'E' }],
  });
  const errors = checkStory(broken, 'notebook');
  assert.ok(errors.some((e) => e.includes('"kitchen" is glossed')));
  assert.ok(errors.some((e) => e.includes('"extra" is never marked')));
  assert.ok(errors.some((e) => e.includes('"words" is 3')));
  assert.ok(errors.some((e) => e.includes('at least three questions')));
});

test('story index must match the files', () => {
  const s = story();
  assert.deepEqual(checkStoryIndex({ stories: [indexEntry(s)] }, [s]), []);
  const errors = checkStoryIndex(
    { stories: [{ ...indexEntry(s), title: 'Other' }, { id: 'ghost' }] },
    [s],
  );
  assert.ok(errors.some((e) => e.includes('"title" differs')));
  assert.ok(errors.some((e) => e.includes('"ghost" is in index.json but has no file')));
});

test('the real practice files pass', () => {
  const root = new URL('../../src/assets/', import.meta.url);
  const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
  assert.deepEqual(checkFlashcards(read('vocabulary/flashcards.json')), []);
  assert.deepEqual(checkPhrasalVerbs(read('vocabulary/phrasal-verbs.json')), []);
  const ids = readdirSync(new URL('reader/stories/', root)).map((n) => n.replace(/\.json$/, ''));
  const stories = ids.map((id) => read(`reader/stories/${id}.json`));
  for (const s of stories) assert.deepEqual(checkStory(s, s.id), [], s.id);
  assert.deepEqual(checkStoryIndex(read('reader/index.json'), stories), []);
});
