import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = new URL('../src/data/', import.meta.url);
const files = readdirSync(dataDir).filter(name => /^exam-\d+\.json$/.test(name)).sort();
const errors = [];
const error = (file, message) => errors.push(`${file}: ${message}`);

for (const file of files) {
  let exam;
  try { exam = JSON.parse(readFileSync(new URL(file, dataDir), 'utf8')); }
  catch (e) { error(file, `invalid JSON (${e.message})`); continue; }
  const allIds = new Set();
  if (!exam.id || !exam.title || !exam.subtitle || !exam.theme) error(file, 'missing id, title, subtitle or theme');
  if (allIds.has(exam.id)) error(file, `duplicate exam id ${exam.id}`);
  allIds.add(exam.id);

  if (exam.reading?.length !== 6) error(file, 'Reading must contain exactly 6 parts');
  const readingCounts = [5, 5, 5, 5, 6, 6];
  exam.reading?.forEach((part, i) => {
    const actual = part.questions?.length ?? part.gaps?.length ?? 0;
    if (part.part !== i + 1) error(file, `Reading part order should be ${i + 1}`);
    if (actual !== readingCounts[i]) error(file, `Reading part ${i + 1} should have ${readingCounts[i]} items, found ${actual}`);
    if (part.type === 'matching' && part.texts?.length !== 8) error(file, 'Reading Part 2 must have 8 matching texts');
    if (part.type === 'gapped-text' && part.sentences?.length !== 6) error(file, 'Reading Part 4 needs 6 sentence options for 5 gaps');
    validateItems(file, part.questions ?? [], allIds, error);
    part.gaps?.forEach(gap => checkId(file, gap.id, allIds, error));
    if (part.type === 'open-cloze') part.gaps?.forEach(gap => { if (!gap.answer || gap.answer.includes(' ')) error(file, `${gap.id} must accept a one-word answer`); });
  });

  if (!exam.writing?.part1 || exam.writing.part1.type !== 'email' || exam.writing.part2?.length !== 2) error(file, 'Writing needs one required email and two Part 2 choices');
  if (exam.writing?.part2?.map(task => task.type).sort().join(',') !== 'article,story') error(file, 'Writing Part 2 choices must be one article and one story');
  if (!exam.writing?.part2?.find(task => task.type === 'story')?.openingSentence) error(file, 'story task needs an opening sentence');

  if (exam.listening?.length !== 4) error(file, 'Listening must contain exactly 4 parts');
  const listeningCounts = [7, 6, 6, 6];
  exam.listening?.forEach((part, i) => {
    const questions = part.clips?.map(clip => clip.question) ?? part.questions ?? [];
    const actual = questions.length || part.gaps?.length || 0;
    if (part.part !== i + 1) error(file, `Listening part order should be ${i + 1}`);
    if (actual !== listeningCounts[i]) error(file, `Listening part ${i + 1} should have ${listeningCounts[i]} items, found ${actual}`);
    if (part.type === 'note-completion' && !part.script) error(file, 'Listening Part 3 needs a script');
    if (part.type === 'interview' && !part.script) error(file, 'Listening Part 4 needs a script');
    part.clips?.forEach(clip => { if (!clip.script || !clip.speaker) error(file, `${clip.id} needs a speaker and script`); });
    validateItems(file, questions, allIds, error);
    part.gaps?.forEach(gap => { checkId(file, gap.id, allIds, error); if (!gap.answer) error(file, `${gap.id} has no answer key`); });
  });

  if (exam.speaking?.length !== 4) error(file, 'Speaking must contain exactly 4 parts');
  const speakingTypes = ['interview', 'photo-description', 'collaborative-task', 'discussion'];
  exam.speaking?.forEach((part, i) => {
    if (part.part !== i + 1) error(file, `Speaking part order should be ${i + 1}`);
    if (part.type !== speakingTypes[i]) error(file, `Speaking part ${i + 1} should use ${speakingTypes[i]}`);
    if (!part.title || !part.instructions) error(file, `Speaking part ${i + 1} needs a title and instructions`);
    if (part.part === 1 || part.part === 4) {
      if (!part.questions?.length) error(file, `Speaking part ${i + 1} needs interview prompts`);
      part.questions?.forEach(question => {
        checkId(file, question.id, allIds, error);
        if (!question.prompt) error(file, `${question.id} needs a prompt`);
      });
    }
    if (part.part === 2 && (!part.prompt || part.images?.length !== 1)) error(file, 'Speaking Part 2 needs one photo prompt and one image');
    if (part.part === 3 && (!part.prompt || (part.images?.length ?? 0) < 4)) error(file, 'Speaking Part 3 needs a collaborative task and at least four visual prompts');
    part.images?.forEach(image => {
      checkId(file, image.id, allIds, error);
      if (!image.scene || !image.title || !image.alt) error(file, `${image.id} needs a scene, title and image description`);
    });
  });
}

function checkId(file, id, ids, report) {
  if (!id) return report(file, 'an item has no id');
  if (ids.has(id)) report(file, `duplicate item id ${id}`);
  ids.add(id);
}
function validateItems(file, questions, ids, report) {
  questions.forEach(q => {
    checkId(file, q.id, ids, report);
    if (!q.prompt || !Array.isArray(q.options) || q.options.length < 2) report(file, `${q.id} needs a prompt and at least two options`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options?.length ?? 0)) report(file, `${q.id} has an invalid answer index`);
  });
}

if (!files.length) errors.push('No exam-*.json files found in src/data');
if (errors.length) { console.error(errors.map(item => `✗ ${item}`).join('\n')); process.exitCode = 1; }
else console.log(`Validated ${files.length} practice papers.`);
