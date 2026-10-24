import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { readdirSync } from 'node:fs';
import {
  checkGuide,
  checkGuideIndex,
  checkIrregularVerbs,
  checkSections,
} from './grammar-rules.mjs';

const verb = (patch = {}) => ({
  id: 'sing',
  base: 'sing',
  past: 'sang',
  participle: 'sung',
  meaning: 'to make music with your voice',
  example: 'She {{past}} well.',
  exampleParticiple: 'She has {{participle}} well.',
  ...patch,
});

const section = (patch = {}) => ({
  id: 'x',
  title: 'X',
  summary: 'S',
  tables: [{ caption: 'C', head: ['a', 'b'], rows: [['1', '2']] }],
  uses: ['u'],
  signals: [],
  examples: [{ text: 'e' }],
  mistakes: [{ wrong: 'a', right: 'b', why: 'w' }],
  checks: [
    { question: 'q', answer: 'a', explanation: 'e' },
    { question: 'q2', answer: 'a', explanation: 'e' },
  ],
  ...patch,
});

test('a good verb passes', () => {
  assert.deepEqual(checkIrregularVerbs({ verbs: [verb()] }), []);
});

test('a verb without a meaning fails', () => {
  const errors = checkIrregularVerbs({ verbs: [verb({ meaning: ' ' })] });
  assert.ok(errors.some((e) => e.includes('"meaning" is missing')));
});

test('duplicate ids and base forms fail', () => {
  const errors = checkIrregularVerbs({ verbs: [verb(), verb()] });
  assert.ok(errors.some((e) => e.includes('duplicate id')));
  assert.ok(errors.some((e) => e.includes('duplicate base')));
});

test('missing or doubled markers fail', () => {
  const errors = checkIrregularVerbs({
    verbs: [verb({ example: 'She sang.', exampleParticiple: '{{participle}} {{participle}}' })],
  });
  assert.equal(errors.filter((e) => e.includes('exactly once')).length, 2);
});

test('a regular verb fails', () => {
  const errors = checkIrregularVerbs({
    verbs: [verb({ id: 'walk', base: 'walk', past: 'walked', participle: 'walked' })],
  });
  assert.ok(errors.some((e) => e.includes('regular')));
});

test('hear-heard-heard is irregular, but love-loved-loved is regular', () => {
  const hear = verb({ id: 'hear', base: 'hear', past: 'heard', participle: 'heard' });
  assert.deepEqual(checkIrregularVerbs({ verbs: [hear] }), []);
  const love = verb({ id: 'love', base: 'love', past: 'loved', participle: 'loved' });
  assert.ok(checkIrregularVerbs({ verbs: [love] }).some((e) => e.includes('regular')));
});

test('a verb with a regular past but an irregular participle is allowed', () => {
  const show = verb({ id: 'show', base: 'show', past: 'showed', participle: 'shown' });
  assert.deepEqual(checkIrregularVerbs({ verbs: [show] }), []);
});

test('an alternative that repeats the main form fails', () => {
  const errors = checkIrregularVerbs({ verbs: [verb({ alt: { past: ['sang'] } })] });
  assert.ok(errors.some((e) => e.includes('repeats')));
});

test('a table row with the wrong width fails', () => {
  const bad = section({ tables: [{ caption: 'C', head: ['a', 'b'], rows: [['1']] }] });
  assert.ok(checkSections({ sections: [bad] }).some((e) => e.includes('expected 2')));
});

test('a section needs two checks and different wrong and right sentences', () => {
  const bad = section({
    checks: [{ question: 'q', answer: 'a', explanation: 'e' }],
    mistakes: [{ wrong: 'same', right: 'same', why: 'w' }],
  });
  const errors = checkSections({ sections: [bad] });
  assert.ok(errors.some((e) => e.includes('two checks')));
  assert.ok(errors.some((e) => e.includes('same wrong and right')));
});

test('a guide needs a valid level and a matching id', () => {
  const guide = { id: 'x', title: 'T', level: 'C1', intro: 'I', sections: [section()] };
  const errors = checkGuide(guide, 'y');
  assert.ok(errors.some((e) => e.includes('"id" must be "y"')));
  assert.ok(errors.some((e) => e.includes('B1 or B2')));
});

const row = (patch = {}) => ({
  section: 'x',
  label: 'Past simple',
  shape: 'past-point',
  example: 'I saw it.',
  description: 'One finished action in the past.',
  ...patch,
});
const guideWith = (timeline) => ({
  id: 'g',
  title: 'T',
  level: 'B1',
  intro: 'I',
  sections: [section()],
  timeline,
});

test('a guide with a good timeline passes', () => {
  assert.deepEqual(checkGuide(guideWith([row()]), 'g'), []);
});

test('a timeline row must point to a section of the guide and use a known shape', () => {
  const errors = checkGuide(guideWith([row({ section: 'nope', shape: 'zigzag' })]), 'g');
  assert.ok(errors.some((e) => e.includes('no section "nope"')));
  assert.ok(errors.some((e) => e.includes('unknown shape "zigzag"')));
});

test('a timeline row needs a label, an example and a description', () => {
  const errors = checkGuide(guideWith([row({ label: '', example: ' ', description: '' })]), 'g');
  assert.equal(errors.filter((e) => e.includes('timeline row')).length, 3);
});

test('a timeline must be a non-empty list with unique labels', () => {
  assert.ok(checkGuide(guideWith([]), 'g').some((e) => e.includes('"timeline"')));
  const errors = checkGuide(guideWith([row(), row()]), 'g');
  assert.ok(errors.some((e) => e.includes('duplicate label')));
});

test('the guide list must match the guide files', () => {
  const index = { guides: [{ id: 'a', title: 'A', level: 'B1', summary: 's' }] };
  assert.deepEqual(checkGuideIndex(index, ['a']), []);
  assert.ok(checkGuideIndex(index, []).some((e) => e.includes('no file a.json')));
  assert.ok(checkGuideIndex(index, ['a', 'b']).some((e) => e.includes('"b.json" is not listed')));
});

test('the shipped grammar files are valid', () => {
  const read = (name) =>
    JSON.parse(readFileSync(new URL(`../../src/assets/grammar/${name}`, import.meta.url), 'utf8'));
  assert.deepEqual(checkIrregularVerbs(read('irregular-verbs.json')), []);
  const ids = readdirSync(new URL('../../src/assets/grammar/guides/', import.meta.url))
    .filter((name) => name.endsWith('.json') && name !== 'index.json')
    .map((name) => name.replace(/\.json$/, ''));
  assert.deepEqual(checkGuideIndex(read('guides/index.json'), ids), []);
  for (const id of ids) assert.deepEqual(checkGuide(read(`guides/${id}.json`), id), [], id);
});
