// Generates src/assets/exams/<level>/index.json (lightweight metadata for listings) from the exam files.
// Usage: node scripts/generate-index.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLevelIndex, examsRoot, levelDirs } from './lib/exam-files.mjs';

for (const level of levelDirs()) {
  const index = buildLevelIndex(level);
  writeFileSync(join(examsRoot, level, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`${level}/index.json: ${index.exams.length} exams, ${index.boards.length} boards`);
}
