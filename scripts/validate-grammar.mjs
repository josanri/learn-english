// Validates the grammar data under src/assets/grammar/ (content rules in scripts/lib/grammar-rules.mjs).
// Usage: node scripts/validate-grammar.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { checkGuide, checkGuideIndex, checkIrregularVerbs } from './lib/grammar-rules.mjs';

const root = new URL('../src/assets/grammar/', import.meta.url);
const guidesRoot = new URL('guides/', root);
const guideIds = readdirSync(guidesRoot)
  .filter((name) => name.endsWith('.json') && name !== 'index.json')
  .map((name) => name.replace(/\.json$/, ''))
  .sort();

const files = [
  ['irregular-verbs.json', (data) => checkIrregularVerbs(data)],
  ['guides/index.json', (data) => checkGuideIndex(data, guideIds)],
  ...guideIds.map((id) => [`guides/${id}.json`, (data) => checkGuide(data, id)]),
];

let failed = false;
for (const [name, check] of files) {
  let errors;
  try {
    errors = check(JSON.parse(readFileSync(new URL(name, root), 'utf8')));
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
