// Validates every exam JSON under src/assets/exams/:
//   1. structure against the JSON Schema generated from src/app/models/exam.ts (run `npm run schema:generate`),
//   2. generic content rules (unique ids, valid answer keys, speakers referenced by turns, image credits),
//   3. board rules (cambridge-pet keeps the original paper-shape checks),
//   4. the per-level index.json is up to date.
// Usage: node scripts/validate-exams.mjs
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import {
  buildLevelIndex,
  examsRoot,
  levelDirs,
  listExamFiles,
  readExam,
} from './lib/exam-files.mjs';

const schema = JSON.parse(
  readFileSync(new URL('./schema/exam.schema.json', import.meta.url), 'utf8'),
);
const ajv = new Ajv({ allErrors: false, strict: false });
const validateExamShape = ajv.compile(schema);

// Map part `type` -> definition name so structural errors point at the right part shape.
const partDefinitions = new Map();
for (const [name, def] of Object.entries(schema.definitions)) {
  const typeConst = def.properties?.type?.const;
  if (typeConst && def.properties?.number) partDefinitions.set(typeConst, name);
}
const partValidators = new Map();
function validatePartShape(part) {
  const name = partDefinitions.get(part.type);
  if (!name) return [`unknown part type "${part.type}"`];
  if (!partValidators.has(name))
    partValidators.set(
      name,
      ajv.compile({ $ref: `#/definitions/${name}`, definitions: schema.definitions }),
    );
  const validate = partValidators.get(name);
  return validate(part) ? [] : validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`);
}

const errors = [];
const seenExamIds = new Set();

for (const entry of listExamFiles()) {
  const label = entry.path;
  const error = (message) => errors.push(`${label}: ${message}`);
  let exam;
  try {
    exam = readExam(entry);
  } catch (e) {
    error(`invalid JSON (${e.message})`);
    continue;
  }

  // 1. Structure.
  if (!validateExamShape(exam)) {
    // The union errors are noisy; re-check sections part by part for a precise message.
    let precise = false;
    for (const section of Array.isArray(exam.sections) ? exam.sections : []) {
      for (const part of Array.isArray(section.parts) ? section.parts : []) {
        const problems = validatePartShape(part);
        if (problems.length) {
          precise = true;
          error(`${part.id ?? part.type}: ${problems[0]}`);
        }
      }
    }
    if (!precise) {
      const first = validateExamShape.errors?.[0];
      error(`schema: ${first?.instancePath || '/'} ${first?.message ?? 'does not match'}`);
    }
    continue;
  }

  // 2. Placement and identity.
  if (exam.level.toLowerCase() !== entry.level)
    error(`level ${exam.level} does not match folder ${entry.level}`);
  if (exam.board !== entry.board) error(`board ${exam.board} does not match folder ${entry.board}`);
  if (`${exam.id}.json` !== entry.file) error(`file name should be ${exam.id}.json`);
  if (seenExamIds.has(exam.id)) error(`duplicate exam id ${exam.id}`);
  seenExamIds.add(exam.id);
  if (!exam.title.trim() || !exam.subtitle.trim() || !exam.theme.trim())
    error('title, subtitle and theme must not be empty');

  const skills = exam.sections.map((s) => s.skill);
  if (new Set(skills).size !== skills.length) error('each skill may appear in only one section');

  // 3. Generic content rules.
  const ids = new Set();
  const useId = (id, what) => {
    if (!id) return error(`${what} has no id`);
    if (ids.has(id)) error(`duplicate item id ${id}`);
    ids.add(id);
  };
  for (const section of exam.sections) {
    section.parts.forEach((part, i) => {
      if (part.number !== i + 1)
        error(`${section.skill} part order should be ${i + 1} (found ${part.number})`);
      if (part.id !== `${section.skill}-${part.number}`)
        error(`${part.id} should be named ${section.skill}-${part.number}`);
      if (!part.title.trim() || !part.instructions.trim())
        error(`${part.id} needs a title and instructions`);
      checkPart(part, error, useId);
    });
  }

  // 4. Board rules.
  if (exam.board === 'cambridge-pet') checkCambridgePet(exam, error);
}

// 5. Index freshness.
for (const level of levelDirs()) {
  let current;
  try {
    current = JSON.parse(
      readFileSync(
        new URL(`${level}/index.json`, `file:///${examsRoot.replaceAll('\\', '/')}`),
        'utf8',
      ),
    );
  } catch {
    errors.push(`${level}/index.json: missing (run npm run exams:index)`);
    continue;
  }
  if (JSON.stringify(current) !== JSON.stringify(buildLevelIndex(level)))
    errors.push(`${level}/index.json: out of date (run npm run exams:index)`);
}

function checkChoice(questions, error, useId) {
  for (const q of questions) {
    useId(q.id, 'a question');
    if (!q.prompt.trim() || q.options.length < 2)
      error(`${q.id} needs a prompt and at least two options`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)
      error(`${q.id} has an invalid answer index`);
  }
}
function checkGaps(gaps, error, useId, { letters = 0, singleWord = false } = {}) {
  for (const gap of gaps) {
    useId(gap.id, 'a gap');
    if (!gap.answer.trim()) error(`${gap.id} has no answer key`);
    if (letters && !/^[A-Z]$/.test(gap.answer)) error(`${gap.id} answer must be a single letter`);
    if (letters && gap.answer.charCodeAt(0) - 65 >= letters)
      error(`${gap.id} answer letter has no matching option`);
    if (singleWord && /\s/.test(gap.answer.trim()))
      error(`${gap.id} must accept a one-word answer`);
  }
}
function checkRecording(recording, where, error) {
  const speakerIds = new Set(recording.speakers.map((s) => s.id));
  if (speakerIds.size !== recording.speakers.length) error(`${where} has duplicate speaker ids`);
  if (!recording.turns.length) error(`${where} has no turns`);
  for (const turn of recording.turns) {
    if (!speakerIds.has(turn.speaker))
      error(`${where} turn uses unknown speaker "${turn.speaker}"`);
    if (!turn.text.trim()) error(`${where} has an empty turn`);
  }
}
function checkImage(image, error) {
  if (!image.src.trim() || !image.alt.trim()) error(`${image.id} needs src and alt text`);
  const c = image.credit;
  if (![c.author, c.license, c.licenseUrl, c.sourceUrl].every((v) => v.trim()))
    error(`${image.id} needs a complete credit`);
}
function checkVisuals(images, error, useId) {
  for (const image of images) {
    useId(image.id, 'a visual');
    if (!image.title.trim() || !image.alt.trim())
      error(`${image.id} needs a title and image description`);
    if (!image.illustration && !image.image) error(`${image.id} needs an illustration or an image`);
    if (image.image) checkImage(image.image, error);
  }
}

function checkPart(part, error, useId) {
  switch (part.type) {
    case 'notices':
      if (part.notices.length !== part.questions.length)
        error(`${part.id} needs one question per notice`);
      checkChoice(part.questions, error, useId);
      break;
    case 'matching':
      part.people.forEach((p) => useId(`${part.id}:${p.id}`, 'a person'));
      checkChoice(part.questions, error, useId);
      break;
    case 'multiple-choice':
    case 'multiple-choice-cloze':
      checkChoice(part.questions, error, useId);
      break;
    case 'gapped-text':
      checkGaps(part.gaps, error, useId, { letters: part.sentences.length });
      break;
    case 'open-cloze':
      checkGaps(part.gaps, error, useId, { singleWord: true });
      break;
    case 'true-false-notgiven':
    case 'listening-true-false':
      part.statements.forEach((s) => useId(s.id, 'a statement'));
      if (part.type === 'listening-true-false') checkRecording(part.recording, part.id, error);
      break;
    case 'sentence-completion':
      checkGaps(part.gaps, error, useId);
      break;
    case 'gap-fill-word-bank': {
      checkGaps(part.gaps, error, useId);
      const bank = part.wordBank.map((w) => w.toLowerCase());
      for (const gap of part.gaps)
        if (!bank.includes(gap.answer.toLowerCase()))
          error(`${gap.id} answer is not in the word bank`);
      break;
    }
    case 'heading-matching':
      checkGaps(part.gaps, error, useId, { letters: part.headings.length });
      break;
    case 'short-dialogues':
    case 'gist-dialogues':
      for (const clip of part.clips) {
        useId(clip.id, 'a clip');
        checkRecording(clip.recording, clip.id, error);
        checkChoice([clip.question], error, useId);
      }
      break;
    case 'note-completion':
      checkRecording(part.recording, part.id, error);
      checkGaps(part.gaps, error, useId);
      break;
    case 'listening-interview':
      checkRecording(part.recording, part.id, error);
      checkChoice(part.questions, error, useId);
      break;
    case 'listening-multiple-choice':
      checkRecording(part.recording, part.id, error);
      checkChoice(part.questions, error, useId);
      break;
    case 'opinion-matching':
      checkRecording(part.recording, part.id, error);
      checkGaps(part.gaps, error, useId, { letters: part.options.length });
      break;
    case 'interview':
    case 'discussion':
      part.questions.forEach((q) => {
        useId(q.id, 'a prompt');
        if (!q.prompt.trim()) error(`${q.id} needs a prompt`);
      });
      break;
    case 'photo-description':
    case 'collaborative-task':
      checkVisuals(part.images, error, useId);
      break;
    case 'monologue-topic':
      [...part.topics, ...part.followUpQuestions].forEach((q) => useId(q.id, 'a prompt'));
      break;
    case 'email':
    case 'short-message':
    case 'opinion-essay':
      checkWritingTask(part.task, part.id, error);
      break;
    case 'choice-task':
      if (part.options.length < 2) error(`${part.id} needs at least two tasks to choose from`);
      for (const task of part.options) checkWritingTask(task, `${part.id} (${task.kind})`, error);
      break;
    default:
      break; // role-play, mediation-text: schema is enough.
  }
}

/** Every writing task lists the points the checker looks for (`contentPoints`, each with keywords). */
function checkWritingTask(task, where, error) {
  if (!task.prompt.trim()) error(`${where} needs a prompt`);
  const points = task.contentPoints;
  if (!Array.isArray(points) || points.length === 0) {
    error(`${where} needs contentPoints (what the answer must cover, with keywords)`);
    return;
  }
  points.forEach((point, i) => {
    if (!point.text.trim()) error(`${where} content point ${i + 1} has no text`);
    if (point.keywords.length < 2)
      error(`${where} content point ${i + 1} needs at least two keywords`);
    for (const k of point.keywords)
      if (k !== k.toLowerCase() || !k.trim()) error(`${where} keyword "${k}" must be lower case`);
  });
  if (task.notes && task.notes.length > 0 && points.length < task.notes.length)
    error(`${where} has ${task.notes.length} notes but only ${points.length} content points`);
}

/** Original paper-shape rules for Cambridge B1 Preliminary, ported from the v1 validator. */
function checkCambridgePet(exam, error) {
  const expectedSkills = ['reading', 'writing', 'listening', 'speaking'];
  if (exam.sections.map((s) => s.skill).join() !== expectedSkills.join()) {
    error('sections must be reading, writing, listening, speaking');
    return;
  }
  const [reading, writing, listening, speaking] = exam.sections;

  const readingTypes = [
    'notices',
    'matching',
    'multiple-choice',
    'gapped-text',
    'multiple-choice-cloze',
    'open-cloze',
  ];
  const readingCounts = [5, 5, 5, 5, 6, 6];
  if (reading.parts.length !== 6) error('Reading must contain exactly 6 parts');
  reading.parts.forEach((part, i) => {
    if (part.type !== readingTypes[i]) error(`Reading part ${i + 1} should use ${readingTypes[i]}`);
    const actual =
      'questions' in part ? part.questions.length : 'gaps' in part ? part.gaps.length : 0;
    if (actual !== readingCounts[i])
      error(`Reading part ${i + 1} should have ${readingCounts[i]} items, found ${actual}`);
    if (part.type === 'matching' && part.texts.length !== 8)
      error('Reading Part 2 must have 8 matching texts');
    if (part.type === 'gapped-text' && part.sentences.length !== 6)
      error('Reading Part 4 needs 6 sentence options for 5 gaps');
  });

  const email = writing.parts.find((p) => p.type === 'email');
  const choice = writing.parts.find((p) => p.type === 'choice-task');
  if (
    writing.parts.length !== 2 ||
    !email ||
    email.task.kind !== 'email' ||
    !choice ||
    choice.options.length !== 2
  )
    error('Writing needs one required email and two Part 2 choices');
  if (choice) {
    if (
      choice.options
        .map((t) => t.kind)
        .sort()
        .join(',') !== 'article,story'
    )
      error('Writing Part 2 choices must be one article and one story');
    if (!choice.options.find((t) => t.kind === 'story')?.openingSentence)
      error('story task needs an opening sentence');
  }

  const listeningTypes = [
    'short-dialogues',
    'gist-dialogues',
    'note-completion',
    'listening-interview',
  ];
  const listeningCounts = [7, 6, 6, 6];
  if (listening.parts.length !== 4) error('Listening must contain exactly 4 parts');
  listening.parts.forEach((part, i) => {
    if (part.type !== listeningTypes[i])
      error(`Listening part ${i + 1} should use ${listeningTypes[i]}`);
    const actual =
      'clips' in part
        ? part.clips.length
        : 'gaps' in part
          ? part.gaps.length
          : part.questions.length;
    if (actual !== listeningCounts[i])
      error(`Listening part ${i + 1} should have ${listeningCounts[i]} items, found ${actual}`);
    if (part.type === 'note-completion')
      part.gaps.forEach((g) => {
        if (!g.answer) error(`${g.id} has no answer key`);
      });
  });

  const speakingTypes = ['interview', 'photo-description', 'collaborative-task', 'discussion'];
  if (speaking.parts.length !== 4) error('Speaking must contain exactly 4 parts');
  speaking.parts.forEach((part, i) => {
    if (part.type !== speakingTypes[i])
      error(`Speaking part ${i + 1} should use ${speakingTypes[i]}`);
    if ((part.type === 'interview' || part.type === 'discussion') && !part.questions.length)
      error(`Speaking part ${i + 1} needs interview prompts`);
    if (part.type === 'photo-description' && (!part.prompt.trim() || part.images.length !== 1))
      error('Speaking Part 2 needs one photo prompt and one image');
    if (part.type === 'collaborative-task' && (!part.prompt.trim() || part.images.length < 4))
      error('Speaking Part 3 needs a collaborative task and at least four visual prompts');
  });
}

if (!seenExamIds.size && !errors.length) errors.push('No exam files found in src/assets/exams');
if (errors.length) {
  console.error(errors.map((item) => `x ${item}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${seenExamIds.size} practice papers against schema v2.`);
}
