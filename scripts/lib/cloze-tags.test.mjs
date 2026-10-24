// Tests for the cloze tag rules. Run with `npm run test:scripts`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GRAMMAR_TAGS, checkClozeTags, suggestChoiceTag, suggestOpenTag } from './cloze-tags.mjs';

test('GRAMMAR_TAGS matches the GrammarTag type in the generated schema', () => {
  const schema = JSON.parse(
    readFileSync(new URL('../schema/exam.schema.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual([...schema.definitions.GrammarTag.enum].sort(), [...GRAMMAR_TAGS].sort());
});

test('open cloze answers get the grammar point they test', () => {
  const tag = (answer, explanation) => suggestOpenTag(answer, explanation).tag;
  assert.equal(tag('who', '"Who" links "a nurse" to what she does.'), 'relative-clauses');
  assert.equal(tag('as', '"As soon as possible" is a fixed expression.'), 'fixed-phrases');
  assert.equal(tag('to', 'The infinitive with "to" after "someone".'), 'verb-patterns');
  assert.equal(tag('to', 'We go to school.'), 'prepositions');
  assert.equal(tag('much', 'The natural negative with an uncountable noun.'), 'quantifiers');
  assert.equal(tag('than', 'A comparative is followed by "than".'), 'comparisons');
  assert.equal(tag('if', 'The run depends on the weather.'), 'conditionals');
  assert.equal(tag('been', 'Present perfect with "since".'), 'verb-forms');
  assert.equal(tag('the', 'A superlative needs the.'), 'articles');
  assert.equal(tag('because', 'It gives a reason.'), 'linking-words');
  assert.equal(tag('that', 'Be sure that it can survive: a clause after sure.'), 'linking-words');
  assert.equal(tag('turn', '"Turn on" a microphone means to start it.'), 'phrasal-verbs');
  assert.equal(tag('at', 'We use at with a clock time.'), 'prepositions');
  assert.equal(tag('not', 'Negative form of the verb.'), 'verb-forms');
});

test('unknown open cloze answers fall back to word-choice and are marked as not sure', () => {
  assert.deepEqual(suggestOpenTag('plant', 'Each plant is meant.'), {
    tag: 'word-choice',
    sure: false,
  });
});

test('multiple-choice cloze questions get a tag from their options and explanation', () => {
  const tag = (options, answer, explanation) => suggestChoiceTag(options, answer, explanation).tag;
  assert.equal(
    tag(['are', 'have been', 'were', 'will be'], 1, '"Since Monday" needs the present perfect.'),
    'verb-forms',
  );
  assert.equal(tag(['so', 'but', 'because', 'or'], 0, '"So" shows the result.'), 'linking-words');
  assert.equal(tag(['at', 'in', 'on', 'to'], 0, 'We use at with a clock time.'), 'prepositions');
  assert.equal(
    tag(
      ['made', 'did', 'took', 'gave'],
      2,
      'We "take photographs"; the other verbs do not go with photographs.',
    ),
    'collocations',
  );
  assert.equal(
    tag(['youngest', 'young', 'younger', 'most young'], 2, 'Comparative with than.'),
    'comparisons',
  );
  assert.equal(
    tag(['asleep', 'sleepy', 'sleeping', 'slept'], 1, 'You feel sleepy before you fall asleep.'),
    'word-choice',
  );
  assert.equal(
    tag(['what', 'who', 'where', 'which'], 2, '"Where" refers to the greenhouse as a place.'),
    'relative-clauses',
  );
  assert.equal(
    tag(['who', 'what', 'where', 'which'], 2, '"Where" asks about a place.'),
    'questions',
  );
  assert.equal(
    tag(['keeping', 'taking', 'caring', 'looking'], 3, '"Looking after" someone.'),
    'phrasal-verbs',
  );
  assert.equal(
    tag(['cost', 'pay', 'spend', 'lend'], 2, 'You spend time doing something.'),
    'word-choice',
  );
});

test('checkClozeTags requires a known tag on every cloze item', () => {
  const exam = {
    sections: [
      {
        skill: 'reading',
        parts: [
          {
            type: 'open-cloze',
            gaps: [
              { id: 'g1', answer: 'at' },
              { id: 'g2', answer: 'in', tags: ['prepositions'] },
            ],
          },
          {
            type: 'multiple-choice-cloze',
            questions: [{ id: 'q1', options: ['a', 'b'], answer: 0, tags: ['nonsense'] }],
          },
          { type: 'multiple-choice', questions: [{ id: 'q2', options: ['a', 'b'], answer: 0 }] },
        ],
      },
    ],
  };
  const { errors } = checkClozeTags(exam);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /g1 \(cloze\) has no grammar tag/);
  assert.match(errors[1], /q1 has an unknown tag "nonsense"/);
});
