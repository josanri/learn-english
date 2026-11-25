import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import {
  checkBasicVocabulary,
  checkFlashcards,
  checkPhrasalVerbs,
  checkSpeakingKit,
  checkStory,
  checkStoryIndex,
  countStoryWords,
  exampleUsesWord,
  glossKeys,
  iconNamesFrom,
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

const basicWord = (patch = {}) => ({
  id: 'dress',
  w: 'dress',
  t: 'clothes',
  g: 'Clothes',
  d: 'one piece of clothing that covers the body and part of the legs',
  e: 'She wore a red [[dress]].',
  img: '',
  ...patch,
});
const basicFile = (words, topicPatch = {}) => ({
  topics: [
    {
      id: 'clothes',
      name: 'Clothes',
      intro: 'Say what people wear.',
      icon: 'bag',
      img: '',
      phrases: ['I wear jeans.', 'She has a red dress.', 'He likes hats.'],
      ...topicPatch,
    },
  ],
  words,
});
const fourWords = () => [
  basicWord(),
  basicWord({
    id: 'skirt',
    w: 'skirt',
    d: 'clothing that hangs from the waist',
    e: 'A [[skirt]].',
  }),
  basicWord({ id: 'coat', w: 'coat', d: 'a long, warm thing to wear outside', e: 'My [[coat]].' }),
  basicWord({ id: 'hat', w: 'hat', d: 'a thing for your head', e: 'A [[hat]]!' }),
];

test('basic vocabulary accepts a valid file', () => {
  assert.deepEqual(checkBasicVocabulary(basicFile(fourWords()), new Set(['bag'])), []);
});

test('basic vocabulary needs the word marked, a fair definition and a known icon', () => {
  const words = fourWords();
  words[0] = basicWord({ e: 'She wore a red [[dresses]].', d: 'a dress for parties' });
  words[1] = { ...words[1], e: 'A skirt.', similar: ['ghost'] };
  const errors = checkBasicVocabulary(basicFile(words, { icon: 'unicorn' }), new Set(['bag']));
  assert.ok(errors.some((e) => e.includes('must be "dress"')));
  assert.ok(errors.some((e) => e.includes('gives the word away')));
  assert.ok(errors.some((e) => e.includes('mark the word once')));
  assert.ok(errors.some((e) => e.includes('unknown id "ghost"')));
  assert.ok(errors.some((e) => e.includes('unknown icon "unicorn"')));
});

test('basic vocabulary pictures must be existing SVG files', () => {
  const words = fourWords();
  words[0] = { ...words[0], img: 'assets/images/basic/dress.svg' };
  words[1] = { ...words[1], img: 'photos/skirt.jpg' };
  const errors = checkBasicVocabulary(basicFile(words), new Set(['bag']), () => false);
  assert.ok(errors.some((e) => e.includes('"assets/images/basic/dress.svg" does not exist')));
  assert.ok(errors.some((e) => e.includes('must be assets/images/basic/<name>.svg')));
});

test('pictures are single full-colour files: the old "fill" layer is rejected', () => {
  const words = fourWords();
  words[0] = {
    ...words[0],
    img: 'assets/images/basic/hat.svg',
    fill: 'assets/images/basic/hat-fill.svg',
  };
  const errors = checkBasicVocabulary(basicFile(words), new Set(['bag']), () => true);
  assert.ok(errors.some((e) => e.includes('"fill" is not used')));
});

test('basic vocabulary needs four words per topic', () => {
  const errors = checkBasicVocabulary(basicFile([basicWord()]), new Set(['bag']));
  assert.ok(errors.some((e) => e.includes('at least four words')));
});

test('icon names are read from the icon source', () => {
  const source =
    "const ICONS = {\n  sun: '<x/>',\n  'fire-truck': '<y/>',\n};\nexport type IconName = 1;";
  assert.deepEqual([...iconNamesFrom(source)], ['sun', 'fire-truck']);
});

test('speaking kit checks questions and checklist links', () => {
  const kit = {
    steps: [{ title: 'Answer', hint: 'Say it.', starters: ['Yes.'] }],
    example: { question: 'Q?', answer: 'A.' },
    phraseGroups: [
      { id: 'time', name: 'Time', intro: 'Think.', phrases: [{ text: 'Well', use: 'u' }] },
    ],
    topics: [
      {
        id: 'home',
        name: 'Home',
        questions: [
          { id: 'home-1', q: 'Where do you live?', model: 'In a flat.' },
          { id: 'home-2', q: 'Describe your room', model: 'It is small.' },
          { id: 'home-1', q: 'Is it big?', model: '' },
        ],
      },
    ],
    checklist: [{ id: 'a', text: 'Do it.', link: 'https://example.com' }],
  };
  const errors = checkSpeakingKit(kit);
  assert.ok(errors.some((e) => e.includes('"home-2": "q" must end')));
  assert.ok(errors.some((e) => e.includes('"home-1": duplicate id')));
  assert.ok(errors.some((e) => e.includes('"model" is empty')));
  assert.ok(errors.some((e) => e.includes('must be an app path')));
});

test('the real practice files pass', () => {
  const root = new URL('../../src/assets/', import.meta.url);
  const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
  assert.deepEqual(checkFlashcards(read('vocabulary/flashcards.json')), []);
  assert.deepEqual(checkPhrasalVerbs(read('vocabulary/phrasal-verbs.json')), []);
  const icons = iconNamesFrom(
    readFileSync(new URL('../../src/app/shared/ui/icon.ts', import.meta.url), 'utf8'),
  );
  assert.deepEqual(checkBasicVocabulary(read('vocabulary/basic-vocabulary.json'), icons), []);
  assert.deepEqual(checkSpeakingKit(read('speaking/speaking-kit.json')), []);
  const ids = readdirSync(new URL('reader/stories/', root)).map((n) => n.replace(/\.json$/, ''));
  const stories = ids.map((id) => read(`reader/stories/${id}.json`));
  for (const s of stories) assert.deepEqual(checkStory(s, s.id), [], s.id);
  assert.deepEqual(checkStoryIndex(read('reader/index.json'), stories), []);
});
