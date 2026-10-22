// Content rules for the grammar data (src/assets/grammar/*.json). Pure functions: they return a list of
// error messages and never read files, so they can be tested (grammar-rules.test.mjs).

const text = (value) => typeof value === 'string' && value.trim().length > 0;
const count = (haystack, needle) => haystack.split(needle).length - 1;

/** A verb whose past simple and past participle both end in -ed is regular and does not belong in the list. */
function isRegular(verb) {
  const regularForm = verb.base.endsWith('e') ? `${verb.base}d` : `${verb.base}ed`;
  const regular = (form) => form === regularForm;
  return regular(verb.past) && regular(verb.participle);
}

export function checkIrregularVerbs(file) {
  const errors = [];
  const verbs = file?.verbs;
  if (!Array.isArray(verbs) || verbs.length === 0) return ['"verbs" must be a non-empty list.'];
  const ids = new Set();
  const bases = new Set();
  for (const verb of verbs) {
    const where = `verb "${verb?.id ?? '?'}"`;
    for (const field of ['id', 'base', 'past', 'participle', 'example', 'exampleParticiple']) {
      if (!text(verb[field])) errors.push(`${where}: "${field}" is missing or empty.`);
    }
    if (ids.has(verb.id)) errors.push(`${where}: duplicate id.`);
    ids.add(verb.id);
    if (bases.has(verb.base)) errors.push(`${where}: duplicate base form.`);
    bases.add(verb.base);
    if (text(verb.example) && count(verb.example, '{{past}}') !== 1) {
      errors.push(`${where}: "example" must contain {{past}} exactly once.`);
    }
    if (text(verb.exampleParticiple) && count(verb.exampleParticiple, '{{participle}}') !== 1) {
      errors.push(`${where}: "exampleParticiple" must contain {{participle}} exactly once.`);
    }
    if (text(verb.base) && text(verb.past) && text(verb.participle) && isRegular(verb)) {
      errors.push(`${where}: the verb is regular (-ed). Only irregular verbs belong in the list.`);
    }
    for (const kind of ['past', 'participle']) {
      for (const alt of verb.alt?.[kind] ?? []) {
        if (!text(alt)) errors.push(`${where}: empty alternative in alt.${kind}.`);
        else if (alt === verb[kind])
          errors.push(`${where}: alt.${kind} repeats the main form "${alt}".`);
      }
    }
  }
  return errors;
}

const LEVELS = ['B1', 'B2'];

/** A guide file: header fields plus the section rules. `expectedId` is the file name without `.json`. */
export function checkGuide(file, expectedId) {
  const errors = [];
  for (const field of ['id', 'title', 'intro']) {
    if (!text(file?.[field])) errors.push(`"${field}" is missing or empty.`);
  }
  if (expectedId && file?.id !== expectedId) errors.push(`"id" must be "${expectedId}".`);
  if (!LEVELS.includes(file?.level)) errors.push('"level" must be B1 or B2.');
  for (const source of file?.sources ?? []) {
    if (!text(source.label) || !/^https:\/\//.test(source.url ?? '')) {
      errors.push('a source needs a "label" and an https "url".');
    }
  }
  for (const section of file?.sections ?? []) {
    if (section.level !== undefined && !LEVELS.includes(section.level)) {
      errors.push(`section "${section.id}": "level" must be B1 or B2.`);
    }
  }
  return [...errors, ...checkSections(file), ...checkTimeline(file)];
}

/** Keep in step with `TimelineShape` in src/app/models/grammar.ts. */
export const TIMELINE_SHAPES = [
  'habit',
  'now-progress',
  'past-point',
  'past-progress',
  'past-to-now',
  'past-to-now-progress',
  'before-past',
  'past-habit',
  'future-point',
  'now-to-future',
  'future-progress',
  'before-future',
];

/** The optional tense timeline: every row points to a section of the same guide. */
export function checkTimeline(file) {
  const timeline = file?.timeline;
  if (timeline === undefined) return [];
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return ['"timeline" must be a non-empty list when it is present.'];
  }
  const errors = [];
  const sectionIds = new Set((file.sections ?? []).map((section) => section.id));
  const labels = new Set();
  for (const row of timeline) {
    const where = `timeline row "${row?.label ?? '?'}"`;
    for (const field of ['label', 'example', 'description']) {
      if (!text(row[field])) errors.push(`${where}: "${field}" is missing or empty.`);
    }
    if (!sectionIds.has(row.section))
      errors.push(`${where}: there is no section "${row.section}".`);
    if (!TIMELINE_SHAPES.includes(row.shape))
      errors.push(`${where}: unknown shape "${row.shape}".`);
    if (labels.has(row.label)) errors.push(`${where}: duplicate label.`);
    labels.add(row.label);
  }
  return errors;
}

/** The guide list: every entry has a file, every file has an entry, ids are unique. */
export function checkGuideIndex(index, fileIds) {
  const errors = [];
  const guides = index?.guides;
  if (!Array.isArray(guides) || guides.length === 0) return ['"guides" must be a non-empty list.'];
  const seen = new Set();
  for (const guide of guides) {
    const where = `guide "${guide?.id ?? '?'}"`;
    for (const field of ['id', 'title', 'summary']) {
      if (!text(guide[field])) errors.push(`${where}: "${field}" is missing or empty.`);
    }
    if (!LEVELS.includes(guide.level)) errors.push(`${where}: "level" must be B1 or B2.`);
    if (seen.has(guide.id)) errors.push(`${where}: duplicate id.`);
    seen.add(guide.id);
    if (!fileIds.includes(guide.id)) errors.push(`${where}: there is no file ${guide.id}.json.`);
  }
  for (const id of fileIds) {
    if (!seen.has(id)) errors.push(`guide file "${id}.json" is not listed in index.json.`);
  }
  return errors;
}

export function checkSections(file) {
  const errors = [];
  const sections = file?.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    return ['"sections" must be a non-empty list.'];
  }
  const ids = new Set();
  for (const section of sections) {
    const where = `section "${section?.id ?? '?'}"`;
    for (const field of ['id', 'title', 'summary']) {
      if (!text(section[field])) errors.push(`${where}: "${field}" is missing or empty.`);
    }
    if (ids.has(section.id)) errors.push(`${where}: duplicate id.`);
    ids.add(section.id);
    for (const field of ['tables', 'uses', 'examples', 'mistakes']) {
      if (!Array.isArray(section[field]) || section[field].length === 0) {
        errors.push(`${where}: "${field}" must be a non-empty list.`);
      }
    }
    if (!Array.isArray(section.signals)) errors.push(`${where}: "signals" must be a list.`);
    for (const table of section.tables ?? []) {
      if (!text(table.caption)) errors.push(`${where}: a table has no caption.`);
      const width = table.head?.length ?? 0;
      if (width === 0) errors.push(`${where}: table "${table.caption}" has no head.`);
      for (const row of table.rows ?? []) {
        if (row.length !== width) {
          errors.push(
            `${where}: table "${table.caption}" has a row with ${row.length} cells, expected ${width}.`,
          );
        }
      }
    }
    for (const mistake of section.mistakes ?? []) {
      if (!text(mistake.wrong) || !text(mistake.right) || !text(mistake.why)) {
        errors.push(`${where}: a mistake needs "wrong", "right" and "why".`);
      } else if (mistake.wrong === mistake.right) {
        errors.push(`${where}: a mistake has the same wrong and right sentence.`);
      }
    }
    if (!Array.isArray(section.checks) || section.checks.length < 2) {
      errors.push(`${where}: needs at least two checks.`);
    }
    for (const check of section.checks ?? []) {
      if (!text(check.question) || !text(check.answer) || !text(check.explanation)) {
        errors.push(`${where}: a check needs "question", "answer" and "explanation".`);
      }
    }
  }
  return errors;
}
