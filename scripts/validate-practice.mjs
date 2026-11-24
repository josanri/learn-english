// Validates the daily practice data: flashcards, phrasal verbs and basic vocabulary (src/assets/vocabulary/),
// the speaking kit (src/assets/speaking/) and the graded reader (src/assets/reader/). Rules are in scripts/lib/practice-rules.mjs.
// Usage: node scripts/validate-practice.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  checkBasicVocabulary,
  checkFlashcards,
  checkPhrasalVerbs,
  checkSpeakingKit,
  checkStory,
  checkStoryIndex,
  iconNamesFrom,
} from './lib/practice-rules.mjs';

const assets = new URL('../src/assets/', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, assets), 'utf8'));
const storyIds = readdirSync(new URL('reader/stories/', assets))
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.replace(/\.json$/, ''))
  .sort();

const icons = iconNamesFrom(
  readFileSync(new URL('../src/app/shared/ui/icon.ts', import.meta.url), 'utf8'),
);
const stories = [];
const files = [
  ['vocabulary/flashcards.json', checkFlashcards],
  ['vocabulary/phrasal-verbs.json', checkPhrasalVerbs],
  [
    'vocabulary/basic-vocabulary.json',
    (data) =>
      checkBasicVocabulary(data, icons, (path) => existsSync(new URL(`../${path}`, assets))),
  ],
  ['speaking/speaking-kit.json', checkSpeakingKit],
  ...storyIds.map((id) => [
    `reader/stories/${id}.json`,
    (data) => {
      stories.push(data);
      return checkStory(data, id);
    },
  ]),
  ['reader/index.json', (data) => checkStoryIndex(data, stories)],
];

let failed = false;
for (const [name, check] of files) {
  let errors;
  try {
    errors = check(read(name));
  } catch (error) {
    errors = [`Cannot read the file: ${error.message}`];
  }
  if (errors.length === 0) {
    console.log(`ok   ${name}`);
  } else {
    failed = true;
    console.error(`FAIL ${name}`);
    for (const message of errors) console.error(`  - ${message}`);
  }
}
process.exit(failed ? 1 : 0);
