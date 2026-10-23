// Validates every exam JSON under src/assets/exams/ (validator v2):
//   1. structure against the JSON Schema generated from src/app/models/exam.ts (run `npm run schema:generate`),
//   2. generic content rules (unique ids, valid answer keys, speakers referenced by turns),
//   3. board rules, one paper shape per board (scripts/lib/board-rules.mjs, documented in docs/exam-formats.md),
//   4. quality rules (scripts/lib/quality-rules.mjs): explanations, key distribution, listening scripts, images, vocabulary,
//   5. rules across exams of a board (repeated names, themes, copied texts),
//   6. the per-level index.json is up to date.
// Errors fail the run; warnings are printed and never fail it (use --strict to fail on warnings too).
// Usage: node scripts/validate-exams.mjs [--strict] [path/to/exam.json ...]
//   With file arguments only those exams are checked (the index check is skipped); cross-exam rules still compare
//   them with every other exam of the board.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { checkBoardRules } from './lib/board-rules.mjs';
import { allQualityChecks, checkAcrossExams, knownVocabulary } from './lib/quality-rules.mjs';
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

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const only = argv.filter((a) => !a.startsWith('--')).map((a) => resolve(a));
const siteRoot = fileURLToPath(new URL('../src/', import.meta.url));
const fileExists = (p) => existsSync(resolve(siteRoot, p));

const errors = [];
const warnings = [];
const seenExamIds = new Set();
const parsed = [];
const allEntries = listExamFiles();

for (const entry of allEntries) {
  if (only.length && !only.includes(resolve(entry.absolute))) {
    try {
      parsed.push({ exam: readExam(entry), checked: false });
    } catch {
      /* reported when the whole set is validated */
    }
    continue;
  }
  const label = entry.path;
  const error = (message) => errors.push(`${label}: ${message}`);
  const warn = (message) => warnings.push(`${label}: ${message}`);
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
  if (/^practice exam\b/i.test(exam.title.trim()))
    error(`title "${exam.title}" is a placeholder: name the topic, like the theme`);
  if (exam.subtitle.trim().toLowerCase() === exam.theme.trim().toLowerCase())
    error('subtitle repeats the theme: name the main texts and the interview');

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

  parsed.push({ exam, checked: true, error, warn });
}

// 4. Board rules and 5. quality rules (exams that passed the structure check).
for (const item of parsed) {
  if (!item.checked) continue;
  const { exam, error, warn } = item;
  const board = checkBoardRules(exam);
  board.errors.forEach(error);
  board.warnings.forEach(warn);
  const known = knownVocabulary(parsed.filter((p) => p.exam !== exam).map((p) => p.exam));
  const quality = allQualityChecks(exam, { fileExists, known });
  quality.errors.forEach(error);
  quality.warnings.forEach(warn);
}
const across = checkAcrossExams(parsed.map((p) => p.exam));
for (const item of parsed) {
  if (!item.checked) continue;
  across[item.exam.id].errors.forEach(item.error);
  across[item.exam.id].warnings.forEach(item.warn);
}

// 6. Index freshness.
for (const level of only.length ? [] : levelDirs()) {
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
function checkVisuals(images, error, useId) {
  for (const image of images) {
    useId(image.id, 'a visual');
    if (!image.title.trim() || !image.alt.trim())
      error(`${image.id} needs a title and image description`);
    if (!image.illustration && !image.image) error(`${image.id} needs an illustration or an image`);
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

if (!seenExamIds.size && !errors.length) errors.push('No exam files found in src/assets/exams');
if (warnings.length)
  console.warn(warnings.map((item) => `! ${item}`).join(String.fromCharCode(10)));
if (errors.length || (strict && warnings.length)) {
  console.error(errors.map((item) => `x ${item}`).join(String.fromCharCode(10)));
  console.error(`${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${seenExamIds.size} practice papers against schema v2 (${warnings.length} warning(s)).`,
  );
}
