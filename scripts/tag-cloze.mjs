// Writes grammar tags on cloze items (open cloze gaps, multiple-choice cloze questions).
// The rules are in scripts/lib/cloze-tags.mjs; OVERRIDES below fixes the items the rules get wrong.
// Items that already have tags are kept, so a hand-written tag is never replaced.
// Usage: node scripts/tag-cloze.mjs [--check] [--force]
//   --check  print what would change and the items the rules are not sure about; write nothing
//   --force  replace existing tags too
import { writeFileSync } from 'node:fs';
import { clozeItems, suggestTag } from './lib/cloze-tags.mjs';
import { listExamFiles, readExam } from './lib/exam-files.mjs';

/** `<examId>:<itemId>` -> tags, reviewed by hand. */
const OVERRIDES = {
  'cambridge-pet-30:r6-5': ['verb-forms'], // "is not allowed": passive
  'cambridge-pet-39:r6-2': ['verb-forms'], // "taken by you": passive
  'cambridge-pet-62:r6-6': ['verb-patterns'], // make + object + base form
  'cambridge-pet-63:r6-1': ['fixed-phrases'], // make the most of
  'cambridge-pet-73:r6-3': ['verb-patterns'], // help + object + base form
  'cambridge-pet-81:r6-3': ['fixed-phrases'], // as long as
  'cambridge-pet-98:r6-6': ['collocations'], // a long time
  // Checked: the rule's guess is right.
  'cambridge-pet-01:r6-6': ['phrasal-verbs'],
  'cambridge-pet-33:r6-2': ['word-choice'],
  'cambridge-pet-33:r6-4': ['word-choice'],
  'cambridge-pet-36:r6-4': ['phrasal-verbs'],
  'cambridge-pet-36:r6-5': ['phrasal-verbs'],
  'cambridge-pet-38:r6-2': ['phrasal-verbs'],
  'cambridge-pet-41:r6-4': ['phrasal-verbs'],
  'cambridge-pet-52:r6-2': ['phrasal-verbs'],
  'cambridge-pet-57:r6-6': ['word-choice'],
  'cambridge-pet-60:r6-4': ['word-choice'],
  'cambridge-pet-61:r6-4': ['phrasal-verbs'],
  'cambridge-pet-92:r6-4': ['word-choice'],
  'cambridge-pet-94:r6-6': ['word-choice'],
  'cambridge-pet-97:r6-6': ['phrasal-verbs'],
  'cambridge-pet-98:r6-4': ['word-choice'],
};

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const force = argv.includes('--force');

let changedFiles = 0;
let tagged = 0;
const unsure = [];
const totals = {};

for (const entry of listExamFiles()) {
  const exam = readExam(entry);
  let changed = false;
  for (const { part, item } of clozeItems(exam)) {
    const key = `${exam.id}:${item.id}`;
    const suggestion = suggestTag(part, item);
    const tags = OVERRIDES[key] ?? [suggestion.tag];
    if (!OVERRIDES[key] && !suggestion.sure)
      unsure.push(
        `${key} [${part.type === 'open-cloze' ? item.answer : item.options[item.answer]}] ${suggestion.tag}: ${item.explanation}`,
      );
    const final = item.tags?.length && !force ? item.tags : tags;
    for (const tag of final) totals[tag] = (totals[tag] ?? 0) + 1;
    if (JSON.stringify(item.tags) === JSON.stringify(final)) continue;
    item.tags = final;
    changed = true;
    tagged++;
  }
  if (changed) {
    changedFiles++;
    if (!check) writeFileSync(entry.absolute, JSON.stringify(exam, null, 2) + '\n');
  }
}

console.log(`${check ? 'Would tag' : 'Tagged'} ${tagged} items in ${changedFiles} exams.`);
console.log(
  'Tags:',
  Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t} ${n}`)
    .join(', '),
);
if (unsure.length) {
  console.log(
    `\n${unsure.length} items where the rules are not sure (check them, add to OVERRIDES if wrong):`,
  );
  for (const line of unsure) console.log(`  ${line}`);
}
