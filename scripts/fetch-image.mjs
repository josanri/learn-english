// Fetches a licensed photograph from Wikimedia Commons, verifies its licence against the whitelist,
// converts it to WebP at 1000 px and 480 px wide (sharp) and registers it in an exam JSON.
//
// Source: Wikimedia Commons only (public API, no key). Unsplash and Pexels pages are rejected because
// their licence cannot be verified without an API key.
//
//   node scripts/fetch-image.mjs search "<query>" [--limit 8] [--out <dir>]
//        Lists Commons photos with licence + author and saves small JPEG previews to <out> so you can LOOK at them.
//   node scripts/fetch-image.mjs <commons file page URL | File:Name.jpg> --exam <examId> --visual <visualId>
//        [--title "..."] [--alt "..."] [--hints "a;b;c"] [--dry] [--out <previewDir>]
//        Verifies, downloads, writes src/assets/images/exams/<examId>/<visualId>-1200.webp and -600.webp,
//        saves a JPEG preview to <out> (default: OS temp dir) and writes `image` (+ alt, describeHints) on the
//        visual with that id in the exam JSON. --dry stops after verifying + preview (nothing written).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { classifyLicense, LICENSE_HELP } from './lib/image-license.mjs';
import { listExamFiles } from './lib/exam-files.mjs';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA =
  'LearnEnglishB1Exams/1.0 (educational practice app; https://github.com/josanri; jmsanchezrico@gmail.com)';
const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);
const fail = (msg) => {
  console.error(`x ${msg}`);
  process.exit(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) fail(`Commons API ${res.status}`);
    return res.json();
  }
  fail('Commons API busy, try again later');
}
const api = (params) =>
  getJson(`${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`);
async function download(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status >= 500) {
      await sleep(2500 * (attempt + 1));
      continue;
    }
    if (!res.ok) fail(`Download failed (${res.status}) ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  fail('Download rate-limited, try again later');
}
const strip = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Credits read better without bare URLs or very long institution strings. */
function cleanAuthor(a) {
  if (!a) return 'Unknown';
  const flickr = a.match(/^https?:\/\/(?:www\.)?flickr\.com\/photos\/([^/]+)/);
  if (flickr) return `Flickr user ${flickr[1]}`;
  return a.length > 90 ? `${a.slice(0, 87)}...` : a;
}

const INFO_PROPS = 'url|size|mime|extmetadata';
function describe(page) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const m = info.extmetadata ?? {};
  const licenseName = strip(m.LicenseShortName?.value) || strip(m.License?.value);
  return {
    title: page.title,
    pageUrl: info.descriptionurl,
    url: info.url,
    thumb: info.thumburl,
    width: info.width,
    height: info.height,
    mime: info.mime,
    author: cleanAuthor(strip(m.Artist?.value)),
    licenseName,
    licenseUrl: strip(m.LicenseUrl?.value),
    licenseClass: classifyLicense(licenseName),
    restrictions: strip(m.Restrictions?.value),
    nonFree: strip(m.NonFree?.value),
    description: strip(m.ImageDescription?.value).slice(0, 160),
  };
}

async function search(query) {
  const limit = Number(flag('limit', 8));
  const out = flag('out', join(tmpdir(), 'fetch-image-search'));
  mkdirSync(out, { recursive: true });
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: String(limit * 3),
    prop: 'imageinfo',
    iiprop: INFO_PROPS,
    iiurlwidth: '480',
  });
  const pages = (data.query?.pages ?? []).sort((a, b) => a.index - b.index);
  let shown = 0;
  for (const page of pages) {
    const d = describe(page);
    if (!d || !d.licenseClass || !/jpeg|png/.test(d.mime) || d.width < 1200) continue;
    const file = join(out, `${String(++shown).padStart(2, '0')}.jpg`);
    await sharp(await download(d.thumb))
      .jpeg({ quality: 70 })
      .toFile(file);
    console.log(
      `${String(shown).padStart(2, '0')}  ${d.licenseName}  ${d.width}x${d.height}  by ${d.author.slice(0, 40)}\n    ${d.pageUrl}\n    ${d.description}\n    preview: ${file}`,
    );
    if (shown >= limit) break;
  }
  if (!shown)
    console.log(
      'No accepted results (whitelisted licence, at least 1200 px wide). Try other words.',
    );
}

function parseTitle(input) {
  if (/unsplash\.com|pexels\.com/i.test(input))
    fail(
      'Unsplash and Pexels are not supported: their licences cannot be verified without an API key. Use Wikimedia Commons.',
    );
  const m = input.match(/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/i);
  if (m) return decodeURIComponent(m[1]).replace(/_/g, ' ');
  if (/^File:/i.test(input)) {
    let name = input;
    try {
      name = decodeURIComponent(input);
    } catch {
      /* keep the raw text */
    }
    return name.replace(/_/g, ' ');
  }
  fail('Source must be a commons.wikimedia.org/wiki/File:... URL or a "File:Name.jpg" title.');
}

async function fetchOne(input) {
  const title = parseTitle(input);
  const examId = flag('exam');
  const visualId = flag('visual');
  if (!examId || !visualId) fail('--exam <examId> and --visual <visualId> are required');
  const data = await api({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: INFO_PROPS,
    iiurlwidth: '1600',
  });
  const page = data.query?.pages?.[0];
  const d = page && !page.missing ? describe(page) : null;
  if (!d) fail(`File not found on Commons: ${title}`);
  console.log(`File    ${d.title}\nAuthor  ${d.author}\nLicence ${d.licenseName} ${d.licenseUrl}`);
  if (!d.licenseClass) fail(`Licence "${d.licenseName}" is not accepted. ${LICENSE_HELP}`);
  if (d.nonFree === 'true' || /fair use/i.test(d.restrictions)) fail('Marked non-free / fair use.');
  if (!/jpeg|png/.test(d.mime)) fail(`Unsupported file type ${d.mime}`);
  if (d.width < 1200) fail(`Too small (${d.width}px wide); need at least 1200.`);

  // Apply EXIF rotation, then crop tall pictures to 4:3 landscape (the speaking pages use wide frames).
  const rotated = await sharp(await download(d.thumb ?? d.url))
    .rotate()
    .toBuffer({ resolveWithObject: true });
  let base = sharp(rotated.data);
  if (rotated.info.height / rotated.info.width > 0.75)
    base = sharp(
      await base
        .resize({
          width: rotated.info.width,
          height: Math.round(rotated.info.width * 0.75),
          fit: 'cover',
          position: 'attention',
        })
        .toBuffer(),
    );
  const preview = join(flag('out', join(tmpdir(), 'fetch-image-preview')), `${visualId}.jpg`);
  mkdirSync(join(preview, '..'), { recursive: true });
  await base.clone().resize({ width: 900 }).jpeg({ quality: 78 }).toFile(preview);
  console.log(`Preview ${preview}`);
  if (has('dry')) return console.log('(dry run: nothing written)');

  const dir = join(repoRoot, 'src/assets/images/exams', examId);
  mkdirSync(dir, { recursive: true });
  const big = await base
    .clone()
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 62, effort: 6, smartSubsample: true })
    .toFile(join(dir, `${visualId}-1200.webp`));
  await base
    .clone()
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 58, effort: 6, smartSubsample: true })
    .toFile(join(dir, `${visualId}-600.webp`));

  const entry = listExamFiles().find((e) => e.file === `${examId}.json`);
  if (!entry) fail(`Exam ${examId} not found`);
  const exam = JSON.parse(readFileSync(entry.absolute, 'utf8'));
  let visual;
  for (const s of exam.sections)
    for (const p of s.parts) visual ??= (p.images ?? []).find((v) => v.id === visualId);
  if (!visual) fail(`Visual ${visualId} not found in ${examId}`);
  visual.image = {
    id: visualId,
    src: `assets/images/exams/${examId}/${visualId}-1200.webp`,
    srcSmall: `assets/images/exams/${examId}/${visualId}-600.webp`,
    width: big.width,
    height: big.height,
    alt: flag('alt', visual.alt),
    credit: {
      author: d.author,
      license: d.licenseName,
      licenseUrl: (d.licenseUrl || d.pageUrl).replace(/^http:/, 'https:'),
      sourceUrl: d.pageUrl,
    },
  };
  if (flag('title')) visual.title = flag('title');
  if (flag('alt')) visual.alt = flag('alt');
  if (flag('hints'))
    visual.describeHints = flag('hints')
      .split(';')
      .map((h) => h.trim())
      .filter(Boolean);
  delete visual.illustration;
  writeFileSync(entry.absolute, `${JSON.stringify(exam, null, 2)}\n`);
  console.log(`Wrote ${big.width}x${big.height} WebP (1000 + 480) and updated ${entry.path}`);
}

const [cmd, ...rest] = args;
if (!cmd || cmd === '--help')
  fail('usage: fetch-image.mjs search "<query>" | <commons file URL> --exam <id> --visual <id>');
if (cmd === 'search') {
  const words = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) i++;
    else words.push(rest[i]);
  }
  await search(words.join(' '));
} else await fetchOne(cmd);
