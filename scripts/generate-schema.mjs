// Generates the JSON Schema for exam files from the TypeScript types in src/app/models/exam.ts.
// Usage: node scripts/generate-schema.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGenerator } from 'ts-json-schema-generator';

const root = new URL('../', import.meta.url);
const schema = createGenerator({
  path: fileURLToPath(new URL('src/app/models/exam.ts', root)),
  tsconfig: fileURLToPath(new URL('tsconfig.json', root)),
  type: 'Exam',
  skipTypeCheck: true,
  expose: 'all',
  topRef: true,
}).createSchema('Exam');

mkdirSync(new URL('scripts/schema/', root), { recursive: true });
writeFileSync(
  new URL('scripts/schema/exam.schema.json', root),
  `${JSON.stringify(schema, null, 2)}\n`,
);
console.log('Wrote scripts/schema/exam.schema.json');
