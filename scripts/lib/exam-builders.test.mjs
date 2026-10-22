// The builders must produce exactly the JSON of a published exam, so authors can trust them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as b from './exam-builders.mjs';

const exam = JSON.parse(
  readFileSync(
    new URL('../../src/assets/exams/b1/cambridge-pet/cambridge-pet-25.json', import.meta.url),
    'utf8',
  ),
);
const parts = (skill) => exam.sections.find((s) => s.skill === skill).parts;
const items = (qs) => qs.map((x) => [x.prompt, x.options, x.answer, x.explanation]);
const speakers = (list) => list.map((s) => [s.id, s.name, s.voice.lang, s.voice.gender]);
const turns = (list) => list.map((t) => [t.speaker, t.text]);

test('reading builders reproduce exam 25', () => {
  const [p1, p2, p3, p4, p5, p6] = parts('reading');
  assert.deepEqual(b.notices('r', p1.notices, items(p1.questions)), p1);
  assert.deepEqual(
    b.matching(
      'r',
      p2.title,
      p2.people.map((p, i) => [p2.questions[i].prompt, p.text]),
      p2.texts.map((t) => [t.title, t.text]),
      p2.questions.map((x) => x.answer),
      p2.questions.map((x) => x.explanation),
    ),
    p2,
  );
  assert.deepEqual(b.multipleChoice('r', p3.title, p3.passage, items(p3.questions)), p3);
  assert.deepEqual(
    b.gappedText(
      'r',
      p4.title,
      p4.passage,
      p4.sentences,
      p4.gaps.map((g) => g.answer),
      p4.gaps.map((g) => g.explanation),
    ),
    p4,
  );
  assert.deepEqual(
    b.cloze(
      'r',
      p5.title,
      p5.passage,
      p5.questions.map((x) => [x.options, x.answer, x.explanation]),
    ),
    p5,
  );
  assert.deepEqual(
    b.openCloze(
      'r',
      p6.title,
      p6.passage,
      p6.gaps.map((g) => [g.answer, g.accepted ?? null, g.explanation]),
    ),
    p6,
  );
});

test('listening builders reproduce exam 25', () => {
  const [l1, l2, l3, l4] = parts('listening');
  const clips = (part, prefix) =>
    part.clips.map((c, i) =>
      b.clip(
        prefix,
        i + 1,
        speakers(c.recording.speakers),
        turns(c.recording.turns),
        c.question.prompt,
        c.question.options,
        c.question.answer,
        c.question.explanation,
      ),
    );
  assert.deepEqual(b.shortDialogues(clips(l1, 'l1-')), l1);
  assert.deepEqual(b.gistDialogues(clips(l2, 'l2-')), l2);
  assert.deepEqual(
    b.noteCompletion(
      l3.title,
      speakers(l3.recording.speakers)[0],
      l3.recording.turns[0].text,
      l3.gaps.map((g) => [g.prompt, g.answer, g.accepted ?? null, g.explanation]),
    ),
    l3,
  );
  assert.deepEqual(
    b.interview(
      l4.title,
      speakers(l4.recording.speakers),
      turns(l4.recording.turns),
      items(l4.questions),
    ),
    l4,
  );
});

test('writing builder reproduces exam 25', () => {
  const [w1, w2] = parts('writing');
  const task = w1.task;
  const [article, story] = w2.options;
  const built = b.writing(
    {
      prompt: task.prompt,
      notes: task.notes,
      from: task.sourceEmail.from,
      subject: task.sourceEmail.subject,
      body: task.sourceEmail.body,
      points: task.contentPoints,
    },
    { title: article.title, prompt: article.prompt, points: article.contentPoints },
    {
      title: story.title,
      prompt: story.prompt,
      opening: story.openingSentence,
      points: story.contentPoints,
    },
  );
  assert.deepEqual(built.parts, [w1, w2]);
});
