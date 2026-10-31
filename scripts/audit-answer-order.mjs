// Reports parts of the Cambridge B1 Preliminary exams whose answer keys are in ascending order.
// A paper whose keys always rise (A A B C C, or A B C D E) lets a learner guess the answer from the position.
// It also reports the matching parts (Reading part 2) that have few similar wrong texts.
// Usage: node scripts/audit-answer-order.mjs [--fix-list]
// Exit code 1 if the share of ascending parts is higher than the limit of a random order.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyseMatching } from './lib/matching-decoys.mjs';

const dir = fileURLToPath(new URL('../src/assets/exams/b1/cambridge-pet/', import.meta.url));
const LETTERS = 'ABCDEFGH';

/** One entry per part: { id, kind, keys: number[] } with the key as an index (letter or option). */
export function keyLists(exam) {
  const out = [];
  for (const section of exam.sections) {
    for (const part of section.parts) {
      let keys = null;
      if (part.type === 'gapped-text') keys = part.gaps.map((g) => LETTERS.indexOf(g.answer));
      else if (
        Array.isArray(part.questions) &&
        part.questions.every((q) => Number.isInteger(q.answer))
      )
        keys = part.questions.map((q) => q.answer);
      else if (Array.isArray(part.clips)) keys = part.clips.map((c) => c.question?.answer);
      if (keys && keys.length >= 4 && keys.every((k) => Number.isInteger(k) && k >= 0))
        out.push({ id: `${exam.id}/${part.id}`, type: part.type, keys });
    }
  }
  return out;
}

const nonDecreasing = (k) => k.every((v, i) => i === 0 || v >= k[i - 1]);
const strictlyAscending = (k) => k.every((v, i) => i === 0 || v > k[i - 1]);

// Chance that a random key list is sorted (non-decreasing) for n items over m options.
function chanceSorted(n, m) {
  let c = 1; // C(n+m-1, n) / m^n
  for (let i = 1; i <= n; i += 1) c = (c * (m - 1 + i)) / i;
  return c / m ** n;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stats = new Map();
  const flagged = [];
  const noDecoy = [];
  for (const f of readdirSync(dir)
    .filter((x) => x.endsWith('.json'))
    .sort()) {
    const exam = JSON.parse(readFileSync(dir + f, 'utf8'));
    const matching = exam.sections[0].parts.find((p) => p.type === 'matching');
    if (matching && analyseMatching(matching).filter((x) => x.decoy).length < 2)
      noDecoy.push(exam.id.replace('cambridge-pet-', ''));
    for (const p of keyLists(exam)) {
      const m = p.type === 'matching' ? 8 : p.type === 'gapped-text' ? 6 : 3;
      const s = stats.get(p.type) ?? { parts: 0, sorted: 0, expected: 0 };
      s.parts += 1;
      s.expected += chanceSorted(p.keys.length, m);
      if (nonDecreasing(p.keys)) {
        s.sorted += 1;
        flagged.push(`${p.id}  ${p.keys.map((k) => LETTERS[k]).join('')}`);
      }
      stats.set(p.type, s);
    }
  }
  let bad = false;
  for (const [type, s] of stats) {
    const share = s.sorted / s.parts;
    const limit = Math.max(0.1, (s.expected / s.parts) * 3);
    if (share > limit) bad = true;
    console.log(
      `${type.padEnd(24)} parts ${String(s.parts).padStart(4)}  sorted ${String(s.sorted).padStart(4)} (${Math.round(share * 100)}%)  random expectation ${((100 * s.expected) / s.parts).toFixed(1)}%`,
    );
  }
  // Reading part 2: a wrong text should share a detail with a person (a topic, a place) and fail on another.
  // The count is by shared words, so it is a hint for review, not an error.
  console.log(`
matching part with fewer than 2 people that have a similar wrong text (by shared words): ${noDecoy.length} exams${noDecoy.length ? ` (${noDecoy.join(' ')})` : ''}`);
  if (process.argv.includes('--fix-list')) console.log(flagged.join('\n'));
  if (bad) process.exitCode = 1;
}
