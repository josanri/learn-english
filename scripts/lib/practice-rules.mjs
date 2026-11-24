// Content rules for the daily practice data: flashcards and phrasal verbs (src/assets/vocabulary/) and the
// graded reader (src/assets/reader/). Pure functions: they return a list of error messages and never read
// files, so they can be tested (practice-rules.test.mjs).

const text = (value) => typeof value === 'string' && value.trim().length > 0;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LEVELS = ['A2+', 'B1', 'B1+'];

/** True when the sentence contains the first word of `word`, allowing endings (borrow -> borrowed). */
export function exampleUsesWord(sentence, word) {
  const first = word.split(/[\s/(]/)[0].toLowerCase();
  if (!first) return false;
  const stem = first.length > 4 ? first.slice(0, -2) : first;
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}`, 'i').test(sentence);
}

function checkIds(items, label, errors) {
  const seen = new Set();
  for (const item of items) {
    if (!text(item?.id) || !ID.test(item.id))
      errors.push(`${label} "${item?.id ?? '?'}": id must be lowercase-with-dashes.`);
    else if (seen.has(item.id)) errors.push(`${label} "${item.id}": duplicate id.`);
    seen.add(item?.id);
  }
  return seen;
}

export function checkFlashcards(file) {
  const errors = [];
  const topics = file?.topics;
  const cards = file?.cards;
  if (!Array.isArray(topics) || topics.length === 0)
    errors.push('"topics" must be a non-empty list.');
  if (!Array.isArray(cards) || cards.length === 0)
    return [...errors, '"cards" must be a non-empty list.'];
  const topicIds = checkIds(topics ?? [], 'topic', errors);
  for (const topic of topics ?? [])
    if (!text(topic.name)) errors.push(`topic "${topic.id}": "name" is empty.`);
  checkIds(cards, 'card', errors);
  const words = new Set();
  for (const card of cards) {
    const where = `card "${card?.id ?? '?'}"`;
    for (const field of ['w', 'p', 't', 'd', 'e']) {
      if (!text(card?.[field])) errors.push(`${where}: "${field}" is missing or empty.`);
    }
    if (text(card?.t) && !topicIds.has(card.t)) errors.push(`${where}: unknown topic "${card.t}".`);
    if (text(card?.w) && text(card?.e) && !exampleUsesWord(card.e, card.w)) {
      errors.push(`${where}: the example does not use "${card.w}".`);
    }
    if (text(card?.e) && !/[.!?]$/.test(card.e.trim()))
      errors.push(`${where}: the example must end with . ! or ?`);
    const key = `${card?.w}|${card?.p}`;
    if (words.has(key)) errors.push(`${where}: "${card.w}" (${card.p}) appears twice.`);
    words.add(key);
  }
  for (const topic of topics ?? []) {
    if (!cards.some((c) => c.t === topic.id)) errors.push(`topic "${topic.id}": no cards use it.`);
  }
  return errors;
}

/** Words inside [[...]] markers, in order. */
function markedWords(example) {
  return [...example.matchAll(/\[\[([^\]]+)\]\]/g)].flatMap((m) => m[1].trim().split(/\s+/));
}

export function checkPhrasalVerbs(file) {
  const errors = [];
  const groups = file?.groups;
  const verbs = file?.verbs;
  if (!Array.isArray(groups) || groups.length === 0)
    errors.push('"groups" must be a non-empty list.');
  if (!Array.isArray(verbs) || verbs.length === 0)
    return [...errors, '"verbs" must be a non-empty list.'];
  const groupIds = checkIds(groups ?? [], 'group', errors);
  const ids = checkIds(verbs, 'verb', errors);
  const senses = new Set();
  for (const verb of verbs) {
    const where = `verb "${verb?.id ?? '?'}"`;
    for (const field of ['verb', 'meaning', 'example', 'group']) {
      if (!text(verb?.[field])) errors.push(`${where}: "${field}" is missing or empty.`);
    }
    if (!text(verb?.verb) || !text(verb?.example)) continue;
    const parts = verb.verb.trim().split(/\s+/);
    if (parts.length < 2)
      errors.push(`${where}: "${verb.verb}" needs a verb and at least one particle.`);
    if (!groupIds.has(verb.group)) errors.push(`${where}: unknown group "${verb.group}".`);
    const marked = markedWords(verb.example);
    if (marked.length === 0) {
      errors.push(`${where}: mark the phrasal verb in the example with [[ ]].`);
    } else if (marked.slice(1).join(' ').toLowerCase() !== parts.slice(1).join(' ')) {
      errors.push(
        `${where}: the marked words "${marked.join(' ')}" must be the verb followed by "${parts.slice(1).join(' ')}".`,
      );
    }
    const sense = `${verb.verb}|${verb.meaning}`;
    if (senses.has(sense)) errors.push(`${where}: same verb and meaning as another entry.`);
    senses.add(sense);
    for (const other of verb.similar ?? []) {
      if (other === verb.id) errors.push(`${where}: "similar" lists the verb itself.`);
      else if (!ids.has(other)) errors.push(`${where}: "similar" lists unknown id "${other}".`);
    }
  }
  return errors;
}

/** Glossary keys used in a paragraph: `{{word}}` uses "word", `{{shown|key}}` uses "key". */
export function glossKeys(paragraph) {
  return [...paragraph.matchAll(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g)].map((m) =>
    (m[2] ?? m[1]).trim().toLowerCase(),
  );
}

export function countStoryWords(paragraphs) {
  return paragraphs
    .map((p) => p.replace(/\{\{([^}|]+)(?:\|[^}]+)?\}\}/g, '$1'))
    .join(' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export function checkStory(story, expectedId) {
  const errors = [];
  for (const field of ['id', 'title', 'summary', 'topic']) {
    if (!text(story?.[field])) errors.push(`"${field}" is missing or empty.`);
  }
  if (expectedId && story?.id !== expectedId) errors.push(`"id" must be "${expectedId}".`);
  if (!LEVELS.includes(story?.level)) errors.push(`"level" must be one of ${LEVELS.join(', ')}.`);
  const paragraphs = story?.paragraphs;
  if (!Array.isArray(paragraphs) || paragraphs.length < 2) {
    return [...errors, '"paragraphs" must have at least two paragraphs.'];
  }
  if (paragraphs.some((p) => !text(p))) errors.push('Empty paragraph.');
  const glossary = story.glossary ?? {};
  const used = new Set(paragraphs.flatMap(glossKeys));
  for (const key of used) {
    if (!text(glossary[key]?.meaning))
      errors.push(`"${key}" is glossed in the text but has no meaning.`);
  }
  for (const key of Object.keys(glossary)) {
    if (key !== key.toLowerCase()) errors.push(`glossary key "${key}" must be lowercase.`);
    if (!used.has(key)) errors.push(`glossary "${key}" is never marked in the text.`);
  }
  if (used.size < 3) errors.push('Gloss at least three words.');
  const words = countStoryWords(paragraphs);
  if (story.words !== words) errors.push(`"words" is ${story.words} but the text has ${words}.`);
  if (words < 150 || words > 600)
    errors.push(`The story has ${words} words; keep it between 150 and 600.`);
  const questions = story.questions;
  if (!Array.isArray(questions) || questions.length < 3) {
    errors.push('Add at least three questions.');
  } else {
    questions.forEach((q, i) => {
      const where = `question ${i + 1}`;
      if (!text(q.question) || !text(q.explanation))
        errors.push(`${where}: question or explanation is empty.`);
      if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) {
        errors.push(`${where}: give three or four options.`);
        return;
      }
      if (new Set(q.options).size !== q.options.length) errors.push(`${where}: options repeat.`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
        errors.push(`${where}: "answer" must point to an option.`);
      }
    });
  }
  return errors;
}

/** The index and the story files must list the same stories with the same summary fields. */
export function checkStoryIndex(index, stories) {
  const errors = [];
  const list = index?.stories;
  if (!Array.isArray(list) || list.length === 0) return ['"stories" must be a non-empty list.'];
  checkIds(list, 'story', errors);
  const byId = new Map(stories.map((s) => [s.id, s]));
  for (const entry of list) {
    const story = byId.get(entry.id);
    if (!story) {
      errors.push(`"${entry.id}" is in index.json but has no file.`);
      continue;
    }
    for (const field of ['title', 'summary', 'topic', 'level', 'words']) {
      if (entry[field] !== story[field])
        errors.push(`"${entry.id}": "${field}" differs from the story file.`);
    }
  }
  for (const story of stories) {
    if (!list.some((e) => e.id === story.id))
      errors.push(`"${story.id}" has a file but is not in index.json.`);
  }
  return errors;
}

/** Same fields as `checkStoryIndex` copies, for regenerating index.json from the story files. */
export function indexEntry(story) {
  const { id, title, summary, topic, level } = story;
  return { id, title, summary, topic, level, words: countStoryWords(story.paragraphs) };
}

/** Icon names declared in `src/app/shared/ui/icon.ts` (keys of the ICONS object). */
export function iconNamesFrom(source) {
  const block = source.slice(source.indexOf('ICONS'), source.indexOf('export type IconName'));
  return new Set([...block.matchAll(/^ {2}'?([a-z][a-z0-9-]*)'?:/gm)].map((m) => m[1]));
}

/** Text inside [[...]] markers, in order. */
function markedTexts(example) {
  return [...example.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
}

/**
 * Basic vocabulary (`assets/vocabulary/basic-vocabulary.json`): topics with an icon and model
 * phrases, and words whose example marks the word itself once with [[ ]]. `exists(path)`, when
 * given, checks that a non-empty `img` (relative to src/) is a real file.
 */
export function checkBasicVocabulary(file, iconNames, exists) {
  const errors = [];
  const topics = file?.topics;
  const words = file?.words;
  if (!Array.isArray(topics) || topics.length === 0)
    errors.push('"topics" must be a non-empty list.');
  if (!Array.isArray(words) || words.length === 0)
    return [...errors, '"words" must be a non-empty list.'];
  const topicIds = checkIds(topics ?? [], 'topic', errors);
  for (const topic of topics ?? []) {
    const where = `topic "${topic?.id ?? '?'}"`;
    for (const field of ['name', 'intro', 'icon'])
      if (!text(topic?.[field])) errors.push(`${where}: "${field}" is missing or empty.`);
    if (typeof topic?.img !== 'string')
      errors.push(`${where}: "img" must be a string (empty for now).`);
    if (text(topic?.icon) && iconNames && !iconNames.has(topic.icon))
      errors.push(`${where}: unknown icon "${topic.icon}".`);
    if (!Array.isArray(topic?.phrases) || topic.phrases.length < 3)
      errors.push(`${where}: needs at least three phrases.`);
    for (const phrase of topic?.phrases ?? [])
      if (!text(phrase) || !/[.!?]$/.test(phrase.trim()))
        errors.push(`${where}: phrase "${phrase}" must be a sentence that ends with . ! or ?`);
  }
  const ids = checkIds(words, 'word', errors);
  const seen = new Set();
  for (const word of words) {
    const where = `word "${word?.id ?? '?'}"`;
    for (const field of ['w', 't', 'g', 'd', 'e'])
      if (!text(word?.[field])) errors.push(`${where}: "${field}" is missing or empty.`);
    if (typeof word?.img !== 'string')
      errors.push(`${where}: "img" must be a string (empty for now).`);
    else if (word.img && !/^assets\/images\/basic\/[a-z0-9-]+\.svg$/.test(word.img))
      errors.push(`${where}: "img" must be assets/images/basic/<name>.svg.`);
    else if (word.img && exists && !exists(word.img))
      errors.push(`${where}: "${word.img}" does not exist.`);
    if (word?.fill !== undefined) {
      if (!word.img) errors.push(`${where}: "fill" needs an "img" line drawing.`);
      else if (!/^assets\/images\/basic\/[a-z0-9-]+-fill\.svg$/.test(word.fill ?? ''))
        errors.push(`${where}: "fill" must be assets/images/basic/<name>-fill.svg.`);
      else if (exists && !exists(word.fill))
        errors.push(`${where}: "${word.fill}" does not exist.`);
    }
    if (!text(word?.w) || !text(word?.e) || !text(word?.d)) continue;
    if (!topicIds.has(word.t)) errors.push(`${where}: unknown topic "${word.t}".`);
    if (word.w.includes('/')) errors.push(`${where}: write one form only (no "/").`);
    const marked = markedTexts(word.e);
    if (marked.length !== 1) errors.push(`${where}: mark the word once in the example with [[ ]].`);
    else if (marked[0].toLowerCase() !== word.w.toLowerCase())
      errors.push(`${where}: the marked text "${marked[0]}" must be "${word.w}".`);
    if (!/[.!?]$/.test(word.e.trim())) errors.push(`${where}: the example must end with . ! or ?`);
    const escaped = word.w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(word.d))
      errors.push(`${where}: the definition gives the word away.`);
    const key = `${word.t}|${word.w.toLowerCase()}`;
    if (seen.has(key)) errors.push(`${where}: "${word.w}" appears twice in "${word.t}".`);
    seen.add(key);
    for (const other of word.similar ?? []) {
      if (other === word.id) errors.push(`${where}: "similar" lists the word itself.`);
      else if (!ids.has(other)) errors.push(`${where}: "similar" lists unknown id "${other}".`);
    }
  }
  for (const topic of topics ?? []) {
    const count = words.filter((w) => w.t === topic.id).length;
    if (count < 4) errors.push(`topic "${topic.id}": needs at least four words (has ${count}).`);
  }
  return errors;
}

/** Speaking kit (`assets/speaking/speaking-kit.json`): answer steps, phrases, questions, checklist. */
export function checkSpeakingKit(file) {
  const errors = [];
  if (!Array.isArray(file?.steps) || file.steps.length === 0)
    errors.push('"steps" must be a non-empty list.');
  for (const [i, step] of (file?.steps ?? []).entries()) {
    if (!text(step?.title) || !text(step?.hint))
      errors.push(`step ${i + 1}: needs a title and a hint.`);
    if (!Array.isArray(step?.starters) || !step.starters.every(text))
      errors.push(`step ${i + 1}: "starters" must be a list of texts.`);
  }
  if (!text(file?.example?.question) || !text(file?.example?.answer))
    errors.push('"example" needs a question and an answer.');
  const groups = Array.isArray(file?.phraseGroups) ? file.phraseGroups : [];
  if (groups.length === 0) errors.push('"phraseGroups" must be a non-empty list.');
  checkIds(groups, 'phrase group', errors);
  for (const group of groups) {
    const where = `phrase group "${group?.id ?? '?'}"`;
    if (!text(group?.name) || !text(group?.intro))
      errors.push(`${where}: needs a name and an intro.`);
    if (!Array.isArray(group?.phrases) || group.phrases.length === 0)
      errors.push(`${where}: needs phrases.`);
    for (const phrase of group?.phrases ?? [])
      if (!text(phrase?.text) || !text(phrase?.use))
        errors.push(`${where}: every phrase needs "text" and "use".`);
  }
  const topics = Array.isArray(file?.topics) ? file.topics : [];
  if (topics.length === 0) errors.push('"topics" must be a non-empty list.');
  checkIds(topics, 'question topic', errors);
  checkIds(
    topics.flatMap((t) => t?.questions ?? []),
    'question',
    errors,
  );
  for (const topic of topics) {
    const where = `question topic "${topic?.id ?? '?'}"`;
    if (!text(topic?.name)) errors.push(`${where}: "name" is empty.`);
    if (!Array.isArray(topic?.questions) || topic.questions.length < 3)
      errors.push(`${where}: needs at least three questions.`);
    for (const question of topic?.questions ?? []) {
      if (!text(question?.q) || !question.q.trim().endsWith('?'))
        errors.push(`question "${question?.id}": "q" must end with a question mark.`);
      if (!text(question?.model)) errors.push(`question "${question?.id}": "model" is empty.`);
    }
  }
  const checklist = Array.isArray(file?.checklist) ? file.checklist : [];
  if (checklist.length === 0) errors.push('"checklist" must be a non-empty list.');
  checkIds(checklist, 'checklist item', errors);
  for (const item of checklist) {
    if (!text(item?.text)) errors.push(`checklist item "${item?.id}": "text" is empty.`);
    if (item?.link !== undefined && !/^\/[a-z0-9/-]*$/.test(item.link))
      errors.push(`checklist item "${item?.id}": "link" must be an app path such as /grammar.`);
  }
  return errors;
}
