// Low-token helpers for writing and checking exams. Each command prints a short result, so an author
// (person or AI agent) never has to read a whole 60 KB exam to do one step.
//
//   node scripts/exam-tools.mjs brief <board> [--names]             what the board needs and what is already used
//   node scripts/exam-tools.mjs split <examId>              exam -> work/<examId>/header.json + one file per skill (no cloze tags)
//   node scripts/exam-tools.mjs build <examId>              work/<examId>/* -> the exam JSON (then validate it)
//   node scripts/exam-tools.mjs sheet <examId> [skill]      the exam without keys, minified (for a blind solve)
//   node scripts/exam-tools.mjs rebalance <examId>           spread the multiple-choice keys over A, B, C (D) in work/<examId>
//   node scripts/exam-tools.mjs longkeys <examId>            multiple-choice items whose key is the longest option
//   node scripts/exam-tools.mjs grade <examId> <file.json>  compare your answers {itemId: answer} with the keys
//
// The work folder is ignored by git. See docs/authoring-exams.md for the whole workflow.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOARD_SPECS } from './lib/board-rules.mjs';
import { listExamFiles, readExam } from './lib/exam-files.mjs';

const WORK = fileURLToPath(new URL('../work/', import.meta.url));
const SECRET_KEYS = new Set(['answer', 'accepted', 'explanation']);

const [command, ...rest] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function findEntry(examId) {
  const entry = listExamFiles().find((e) => e.file === `${examId}.json`);
  return entry ?? null;
}

/** Every `{ id, answer }` object inside a part, in document order. */
function collectKeys(node, out = {}) {
  if (Array.isArray(node)) node.forEach((child) => collectKeys(child, out));
  else if (node && typeof node === 'object') {
    if (typeof node.id === 'string' && 'answer' in node) out[node.id] = node.answer;
    Object.values(node).forEach((child) => collectKeys(child, out));
  }
  return out;
}

function stripSecrets(node) {
  if (Array.isArray(node)) return node.map(stripSecrets);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !SECRET_KEYS.has(key))
        .map(([key, value]) => [key, stripSecrets(value)]),
    );
  }
  return node;
}

/** Depth-first list of all strings that belong to an item (to show a mismatch in one line). */
function promptOf(node, id) {
  let found = '';
  (function walk(n) {
    if (found) return;
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      if (n.id === id)
        found = String(n.question ?? n.statement ?? n.prompt ?? n.text ?? '').slice(0, 90);
      else Object.values(n).forEach(walk);
    }
  })(node);
  return found;
}

function brief(board) {
  if (!board) fail('Usage: brief <board>');
  const spec = BOARD_SPECS[board];
  if (!spec) fail(`Unknown board "${board}". Known: ${Object.keys(BOARD_SPECS).join(', ')}`);
  console.log(`Board ${board}: shape of the paper (enforced by validate:exams)`);
  for (const [skill, parts] of Object.entries(spec.parts)) {
    const text = parts
      .map((p) => {
        const types = [...(p.types ?? [])].join('|');
        const size = p.items ?? (p.itemsMin ? `${p.itemsMin}+` : '');
        return `${types}${size === '' ? '' : ` x${size}`}${p.options ? ` (${p.options} options)` : ''}`;
      })
      .join('; ');
    console.log(`  ${skill}: ${text}`);
  }
  const exams = listExamFiles().filter((e) => e.board === board);
  const names = new Set();
  const photos = new Set();
  const letters = {};
  console.log(`
Already published (${exams.length}): do not repeat these themes`);
  for (const entry of exams) {
    const exam = readExam(entry);
    console.log(`  ${exam.id} | ${exam.category} | ${exam.theme}`);
    (function walk(n) {
      if (Array.isArray(n)) n.forEach(walk);
      else if (n && typeof n === 'object') {
        if (Array.isArray(n.speakers)) n.speakers.forEach((sp) => names.add(sp.name ?? sp.id));
        if (typeof n.alt === 'string' && n.title) photos.add(n.title);
        if (Number.isInteger(n.answer) && n.answer >= 0 && n.answer < 4) {
          const letter = 'ABCD'[n.answer];
          letters[letter] = (letters[letter] ?? 0) + 1;
        }
        Object.values(n).forEach(walk);
      }
    })(exam.sections);
  }
  if (process.argv.includes('--names')) {
    console.log(`Names of speakers: ${[...names].sort().join(', ')}`);
    console.log(`Photo topics: ${[...photos].sort().join('; ')}`);
  } else {
    console.log(
      '(add --names for the speaker names and photo topics; the validator also flags repeats)',
    );
  }
  console.log(
    `Multiple-choice keys so far: ${JSON.stringify(letters)} (keep every letter under 45%)`,
  );
}

function split(examId) {
  const entry = findEntry(examId);
  if (!entry) fail(`No exam ${examId}`);
  const exam = readExam(entry);
  const dir = join(WORK, examId);
  mkdirSync(dir, { recursive: true });
  const { sections, ...header } = exam;
  writeFileSync(
    join(dir, 'header.json'),
    JSON.stringify({ ...header, sectionOrder: sections.map((s) => s.skill) }, null, 2) + '\n',
  );
  for (const section of sections) {
    // Cloze tags belong to the items as they are now; after a rewrite they would be wrong, so they
    // are dropped here and written again by `npm run exams:tag-cloze` after `build`.
    for (const part of section.parts)
      for (const item of [...(part.questions ?? []), ...(part.gaps ?? [])]) delete item.tags;
    writeFileSync(join(dir, `${section.skill}.json`), JSON.stringify(section, null, 2) + '\n');
  }
  console.log(`Wrote ${sections.length + 1} files to work/${examId}/`);
  console.log('After build, run npm run exams:tag-cloze to add the grammar tags again.');
}

function build(examId) {
  const dir = join(WORK, examId);
  let header;
  try {
    header = JSON.parse(readFileSync(join(dir, 'header.json'), 'utf8'));
  } catch {
    fail(`work/${examId}/header.json not found. Run split first or create it.`);
  }
  const { sectionOrder, ...rest } = header;
  const sections = (sectionOrder ?? []).map((skill) =>
    JSON.parse(readFileSync(join(dir, `${skill}.json`), 'utf8')),
  );
  const exam = { ...rest, sections };
  const entry = findEntry(examId);
  const target = entry
    ? entry.absolute
    : fileURLToPath(
        new URL(
          `../src/assets/exams/${rest.level.toLowerCase()}/${rest.board}/${examId}.json`,
          import.meta.url,
        ),
      );
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, JSON.stringify(exam, null, 2) + '\n');
  console.log(
    `Wrote ${target.replace(/\\/g, '/').split('/src/')[1]} (${readdirSync(dir).length - 1} sections)`,
  );
  console.log(`Next: npm run exams:index && npm run validate:exams -- <that file>`);
}

function sheet(examId, skill) {
  const entry = findEntry(examId);
  if (!entry) fail(`No exam ${examId}`);
  const exam = readExam(entry);
  for (const section of exam.sections) {
    if (skill && section.skill !== skill) continue;
    console.log(`## ${section.skill}`);
    for (const part of section.parts) console.log(JSON.stringify(stripSecrets(part)));
  }
  console.error(
    'Answer with a JSON file {"<itemId>": <option index | text | letter>}, then run grade.',
  );
}

function grade(examId, file) {
  const entry = findEntry(examId);
  if (!entry || !file) fail('Usage: grade <examId> <answers.json>');
  const exam = readExam(entry);
  const given = JSON.parse(readFileSync(file, 'utf8'));
  let total = 0;
  let same = 0;
  const lines = [];
  for (const section of exam.sections) {
    const keys = collectKeys(section.parts);
    for (const [id, key] of Object.entries(keys)) {
      if (!(id in given)) continue;
      total += 1;
      const mine = given[id];
      const ok = String(mine).trim().toLowerCase() === String(key).trim().toLowerCase();
      if (ok) same += 1;
      else
        lines.push(
          `  ${id}: you ${JSON.stringify(mine)}, key ${JSON.stringify(key)} | ${promptOf(section.parts, id)}`,
        );
    }
  }
  console.log(`${same}/${total} answers agree with the key.`);
  if (lines.length) {
    console.log('Check these items (two defensible answers, or a wrong key?):');
    console.log(lines.join('\n'));
  }
}

/** Lists multiple-choice items whose key is the longest option (the validator warns above half). */
function longkeys(examId) {
  const entry = findEntry(examId);
  if (!entry) fail(`No exam ${examId}`);
  const exam = readExam(entry);
  let total = 0;
  const lines = [];
  (function walk(n) {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      if (
        typeof n.id === 'string' &&
        Array.isArray(n.options) &&
        Number.isInteger(n.answer) &&
        n.options.length >= 3 &&
        n.options[0] !== 'A'
      ) {
        total += 1;
        const lengths = n.options.map((o) => o.length);
        const key = lengths[n.answer];
        if (lengths.every((len, i) => i === n.answer || len < key)) {
          lines.push(`  ${n.id}: key ${'ABCD'[n.answer]} (${key}) vs ${lengths.join('/')}`);
        }
      }
      Object.values(n).forEach(walk);
    }
  })(exam.sections);
  console.log(`${lines.length} of ${total} keys are the longest option (aim for fewer than half).`);
  console.log(lines.join('\n'));
}

/**
 * Moves the key of every text multiple-choice item to a balanced, pseudo-random letter by swapping two
 * options (the explanations never name letters). Items keep their order; the result has no letter above
 * about a third of the 3-option items and never four equal keys in a row. Writes work/<examId>/ files.
 */
function rebalance(examId) {
  const dir = join(WORK, examId);
  const skills = ['reading', 'listening'];
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const queue = (size) => {
    const out = [];
    while (out.length < 200) {
      const block = [...Array(size).keys()];
      for (let i = block.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [block[i], block[j]] = [block[j], block[i]];
      }
      out.push(...block);
    }
    return out;
  };
  const queues = { 3: queue(3), 4: queue(4) };
  let changed = 0;
  for (const skill of skills) {
    const file = join(dir, `${skill}.json`);
    const section = JSON.parse(readFileSync(file, 'utf8'));
    (function walk(node) {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === 'object') {
        const { options, answer } = node;
        if (
          typeof node.id === 'string' &&
          Array.isArray(options) &&
          Number.isInteger(answer) &&
          (options.length === 3 || options.length === 4) &&
          options[0] !== 'A'
        ) {
          const target = queues[options.length].shift();
          if (target !== answer) {
            [options[answer], options[target]] = [options[target], options[answer]];
            node.answer = target;
            changed += 1;
          }
        }
        Object.values(node).forEach(walk);
      }
    })(section);
    writeFileSync(file, JSON.stringify(section, null, 2) + '\n');
  }
  console.log(`Moved the key of ${changed} items. Run build, then validate.`);
}

switch (command) {
  case 'rebalance':
    rebalance(rest[0]);
    break;
  case 'longkeys':
    longkeys(rest[0]);
    break;
  case 'brief':
    brief(rest[0]);
    break;
  case 'split':
    split(rest[0]);
    break;
  case 'build':
    build(rest[0]);
    break;
  case 'sheet':
    sheet(rest[0], rest[1]);
    break;
  case 'grade':
    grade(rest[0], rest[1]);
    break;
  default:
    fail(
      'Commands: brief <board> | split <examId> | build <examId> | sheet <examId> [skill] | grade <examId> <file>',
    );
}
