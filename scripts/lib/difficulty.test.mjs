// Tests for the difficulty measures. Run with `npm run test:scripts`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  candidateLemmas,
  examTexts,
  knownWords,
  measureTexts,
  outliers,
  sentencesOf,
  syllables,
} from './difficulty.mjs';

const known = knownWords(
  {
    words: [
      { w: 'a/an' },
      { w: 'story' },
      { w: 'stop' },
      { w: 'quick' },
      { w: 'happy' },
      { w: 'the' },
      { w: 'dog' },
      { w: 'run' },
      { w: 'be' },
    ],
  },
  { verbs: [{ base: 'run', past: 'ran', participle: 'run' }] },
);

test('candidateLemmas finds the base form of regular inflections', () => {
  assert.ok(candidateLemmas('stories').includes('story'));
  assert.ok(candidateLemmas('stopped').includes('stop'));
  assert.ok(candidateLemmas('quickly').includes('quick'));
  assert.ok(candidateLemmas('happier').includes('happy'));
  assert.ok(candidateLemmas("I'm").includes('i'));
});

test('syllables gives a rough count', () => {
  assert.equal(syllables('dog'), 1);
  assert.equal(syllables('happy'), 2);
  assert.equal(syllables('vocabulary'), 5);
  assert.equal(syllables('make'), 1);
});

test('sentencesOf splits on end marks and line breaks and hides gap markers', () => {
  assert.deepEqual(sentencesOf('One [1] here. Two!\nThree?'), ['One ___ here.', 'Two!', 'Three?']);
});

test('measureTexts counts words, sentences and words outside the list', () => {
  const m = measureTexts(['The dog ran quickly. A happy dog is Max at 7 p.m.'], known);
  assert.equal(m.sentences, 2);
  assert.equal(m.words, 12);
  // Unknown: "at" only. Max is a name, "p" and "m" are single letters, "is" is a base form.
  assert.deepEqual(m.offListWords, ['at']);
});

test('examTexts collects reading texts and listening turns', () => {
  const exam = {
    sections: [
      { skill: 'reading', parts: [{ passage: 'P', notices: ['N'], texts: [{ text: 'T' }] }] },
      { skill: 'listening', parts: [{ recording: { turns: [{ text: 'L' }] } }] },
      { skill: 'writing', parts: [{ passage: 'W' }] },
    ],
  };
  assert.deepEqual(examTexts(exam), { reading: ['P', 'N', 'T'], listening: ['L'] });
});

test('outliers reports values far from the mean', () => {
  const values = [10, 10, 10, 10, 10, 10, 10, 10, 10, 30];
  assert.deepEqual(
    outliers(values).map((o) => o.index),
    [9],
  );
  assert.deepEqual(outliers([5, 5, 5]), []);
});
