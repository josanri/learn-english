// Tests for the validator logic. Run with `npm run test:scripts` (node:test, no extra dependencies).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  BOARD_SPECS,
  checkBoardRules,
  countItems,
  parseWordRange,
  wordCount,
} from './board-rules.mjs';
import { classifyLicense } from './image-license.mjs';
import {
  checkAcrossExams,
  checkExplanations,
  checkGaps,
  checkImages,
  checkKeyDistribution,
  checkListening,
  checkMatching,
  checkOptionLength,
} from './quality-rules.mjs';

const load = (n) =>
  JSON.parse(
    readFileSync(
      new URL(`../../src/assets/exams/b1/cambridge-pet/cambridge-pet-0${n}.json`, import.meta.url),
      'utf8',
    ),
  );
const clone = (x) => structuredClone(x);
const partOf = (exam, id) => exam.sections.flatMap((s) => s.parts).find((p) => p.id === id);

test('word helpers', () => {
  assert.equal(wordCount('One [1] two  three.'), 3);
  assert.deepEqual(parseWordRange('about 100 words'), { min: 100, max: 100 });
  assert.deepEqual(parseWordRange('70-100 words'), { min: 70, max: 100 });
  assert.deepEqual(parseWordRange('80–130 words'), { min: 80, max: 130 });
  assert.equal(parseWordRange('as long as you like'), null);
});

test('licence whitelist', () => {
  for (const ok of ['CC0', 'Public domain', 'CC BY 2.0', 'CC BY-SA 4.0', 'CC BY-SA 3.0'])
    assert.ok(classifyLicense(ok), ok);
  for (const bad of [
    'CC BY-NC 4.0',
    'CC BY-ND 2.0',
    'GFDL',
    'All rights reserved',
    '',
    'Unsplash License',
  ])
    assert.equal(classifyLicense(bad), null, bad);
});

test('cambridge-pet: a reviewed exam has no board errors', () => {
  const { errors } = checkBoardRules(load(1));
  assert.deepEqual(errors, []);
});

test('cambridge-pet: wrong part counts and option counts are errors', () => {
  const exam = clone(load(1));
  partOf(exam, 'reading-1').questions.pop();
  partOf(exam, 'reading-5').questions[0].options.pop();
  const { errors } = checkBoardRules(exam);
  assert.ok(errors.some((e) => e.includes('Reading part 1 should have 5 items')));
  assert.ok(errors.some((e) => e.includes('should have 4 options')));
});

test('cambridge-pet: gapped text keys must be distinct', () => {
  const exam = clone(load(1));
  const part = partOf(exam, 'reading-4');
  part.gaps[1].answer = part.gaps[0].answer;
  assert.ok(checkBoardRules(exam).errors.some((e) => e.includes('same key twice')));
});

test('unknown board gets a warning, wrong sections an error', () => {
  const exam = clone(load(1));
  exam.board = 'made-up';
  assert.equal(checkBoardRules(exam).errors.length, 0);
  assert.equal(checkBoardRules(exam).warnings.length, 1);
  exam.board = 'eoi';
  assert.ok(checkBoardRules(exam).errors[0].startsWith('sections must be'));
});

test('every board has a spec with skills', () => {
  for (const board of [
    'cambridge-pet',
    'eoi',
    'trinity-ise1',
    'aptis-b1',
    'languagecert-b1',
    'oxford-test-b1',
  ])
    assert.ok(BOARD_SPECS[board]?.skills.length >= 4, board);
});

test('countItems follows each part shape', () => {
  assert.equal(countItems({ type: 'open-cloze', gaps: [1, 2, 3] }), 3);
  assert.equal(countItems({ type: 'short-dialogues', clips: [1, 2] }), 2);
  assert.equal(countItems({ type: 'monologue-topic', topics: [1, 2, 3] }), 3);
});

test('explanations are required', () => {
  const exam = clone(load(1));
  assert.deepEqual(checkExplanations(exam).errors, []);
  partOf(exam, 'reading-1').questions[0].explanation = '';
  partOf(exam, 'reading-6').gaps[0].explanation = 'ok';
  const { errors } = checkExplanations(exam);
  assert.deepEqual(
    errors.sort(),
    ['r1-1 has no explanation', 'r6-1 explanation is too short to help a learner'].sort(),
  );
});

test('key distribution warns above 45% and on long streaks', () => {
  const exam = clone(load(1));
  for (const p of exam.sections.flatMap((s) => s.parts))
    for (const q of p.questions ?? []) if (q.options && p.type !== 'matching') q.answer = 0;
  const { warnings } = checkKeyDistribution(exam);
  assert.ok(warnings.some((w) => w.includes('limit 45%')));
  assert.ok(warnings.some((w) => w.includes('consecutive')));
  assert.deepEqual(checkKeyDistribution(load(1)).warnings, []);
});

test('option length: key always longest is reported', () => {
  const questions = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i}`,
    prompt: 'Which one?',
    options: ['short', 'a much longer correct option', 'tiny'],
    answer: 1,
  }));
  const exam = {
    sections: [
      { skill: 'reading', parts: [{ id: 'reading-3', type: 'multiple-choice', questions }] },
    ],
  };
  assert.ok(checkOptionLength(exam).warnings[0].includes('longest'));
});

test('open cloze answers must be one word', () => {
  const exam = clone(load(1));
  partOf(exam, 'reading-6').gaps[0].accepted = ['at the'];
  assert.ok(checkGaps(exam).errors[0].includes('one word'));
});

test('listening: a dialogue in one turn and group speakers are errors, gap answers must be in the script', () => {
  const exam = clone(load(1));
  assert.deepEqual(checkListening(exam).errors, []);
  const clip = partOf(exam, 'listening-1').clips[0];
  clip.recording = {
    speakers: [{ id: 'a', name: 'Two friends', voice: { lang: 'en-GB' } }],
    turns: [{ speaker: 'a', text: 'Are we meeting? Yes, at six.' }],
  };
  partOf(exam, 'listening-3').gaps[1].answer = 'zebra';
  const { errors } = checkListening(exam);
  assert.ok(errors.some((e) => e.includes('is a group')));
  assert.ok(errors.some((e) => e.includes('one turn')));
  assert.ok(errors.some((e) => e.includes('"zebra" does not appear')));
});

test('matching: two people cannot share a text', () => {
  const exam = clone(load(1));
  const part = partOf(exam, 'reading-2');
  part.questions[1].answer = part.questions[0].answer;
  assert.ok(checkMatching(exam).errors[0].includes('share the same text'));
});

test('images: file, credit, licence, alt and hints are enforced', () => {
  const exam = clone(load(1));
  const exists = () => true;
  assert.deepEqual(checkImages(exam, exists).errors, []);
  assert.ok(checkImages(exam, () => false).errors.some((e) => e.includes('file not found')));

  const broken = clone(exam);
  const visual = partOf(broken, 'speaking-2').images[0];
  visual.image.credit.author = '';
  visual.image.credit.license = 'CC BY-NC 4.0';
  visual.image.alt = 'photo';
  visual.describeHints = ['one', 'two'];
  const { errors } = checkImages(broken, exists);
  assert.ok(errors.some((e) => e.includes('credit.author is missing')));
  assert.ok(errors.some((e) => e.includes('not on the whitelist')));
  assert.ok(errors.some((e) => e.includes('alt text')));
  assert.ok(errors.some((e) => e.includes('describeHints')));
});

test('across exams: identical texts are errors, repeated themes are warnings', () => {
  const a = clone(load(1));
  const b = clone(load(2));
  const result = checkAcrossExams([a, b]);
  assert.deepEqual(result[b.id].errors, []);
  b.theme = a.theme;
  partOf(b, 'reading-3').passage = partOf(a, 'reading-3').passage;
  const again = checkAcrossExams([a, b]);
  assert.ok(again[b.id].errors[0].includes('word for word'));
  assert.ok(again[b.id].warnings.some((w) => w.includes('same theme')));
});
