// Validates the grammar data under src/assets/grammar/ (content rules in scripts/lib/grammar-rules.mjs).
// Usage: node scripts/validate-grammar.mjs
import { readFileSync } from 'node:fs';
import { checkIrregularVerbs, checkVerbForms } from './lib/grammar-rules.mjs';

const root = new URL('../src/assets/grammar/', import.meta.url);
const files = [
  ['irregular-verbs.json', checkIrregularVerbs],
  ['verb-forms.json', checkVerbForms],
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
