// Re-encodes the exam photos so the project stays small: the "-1200" files become 1000 px wide
// and the "-600" files 480 px wide (the file names stay, they are published paths).
// Safe to run again: files that already have the target width are left alone.
// Usage: npm run images:optimize
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../src/assets/images/exams/', import.meta.url);
const TARGETS = [
  { suffix: '-1200.webp', width: 1000, quality: 62 },
  { suffix: '-600.webp', width: 480, quality: 58 },
];

let before = 0;
let after = 0;
for (const exam of await readdir(ROOT)) {
  const dir = new URL(`${exam}/`, ROOT);
  for (const name of await readdir(dir)) {
    const target = TARGETS.find((t) => name.endsWith(t.suffix));
    if (!target) continue;
    const file = join(dir.pathname.replace(/^\/([A-Za-z]:)/, '$1'), name);
    const input = await readFile(file);
    const meta = await sharp(input).metadata();
    before += input.length;
    if ((meta.width ?? 0) <= target.width) {
      after += input.length;
      continue;
    }
    const output = await sharp(input)
      .resize({ width: target.width, withoutEnlargement: true })
      .webp({ quality: target.quality, effort: 6, smartSubsample: true })
      .toBuffer();
    if (output.length < input.length) {
      await writeFile(file, output);
      after += output.length;
    } else {
      after += input.length;
    }
  }
}
// Keep `image.width` / `image.height` in the exam JSON equal to the real file size.
const examsDir = new URL('../src/assets/exams/b1/cambridge-pet/', import.meta.url);
const siteRoot = new URL('../src/', import.meta.url);
for (const name of await readdir(examsDir)) {
  if (!/^cambridge-pet-\d+\.json$/.test(name)) continue;
  const path = new URL(name, examsDir);
  const exam = JSON.parse(await readFile(path, 'utf8'));
  let changed = false;
  for (const section of exam.sections)
    for (const part of section.parts)
      for (const visual of part.images ?? []) {
        if (!visual.image) continue;
        const meta = await sharp(await readFile(new URL(visual.image.src, siteRoot))).metadata();
        if (visual.image.width !== meta.width || visual.image.height !== meta.height) {
          visual.image.width = meta.width;
          visual.image.height = meta.height;
          changed = true;
        }
      }
  if (changed) await writeFile(path, JSON.stringify(exam, null, 2) + '\n');
}
const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`Exam photos: ${mb(before)} MB -> ${mb(after)} MB`);
