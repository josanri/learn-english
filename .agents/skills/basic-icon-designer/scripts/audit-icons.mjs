import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { JSDOM } = require('jsdom');

const BASIC_DIR = path.join(process.cwd(), 'src', 'assets', 'images', 'basic');
const FEELINGS_EMOJI = new Set([
  'happy',
  'sad',
  'angry',
  'sleepy',
  'tired',
  'hungry',
  'thirsty',
  'bored',
  'excited',
  'worried',
  'scared',
  'surprised',
  'embarrassed',
  'proud',
  'jealous',
  'lonely',
  'busy',
  'calm',
  'serious',
  'shy',
  'quiet',
  'nervous',
  'impatient',
  'rude',
  'funny',
  'sensitive',
  'friendly',
]);

const FLAGS_AND_NATIONALITIES = new Set([
  'american',
  'argentina',
  'argentinian',
  'australia',
  'australian',
  'austria',
  'austrian',
  'belgian',
  'belgium',
  'brazil',
  'brazilian',
  'british',
  'canada',
  'canadian',
  'china',
  'chinese',
  'colombia',
  'colombian',
  'danish',
  'denmark',
  'dutch',
  'egypt',
  'egyptian',
  'england',
  'english',
  'france',
  'french',
  'german',
  'germany',
  'greece',
  'greek',
  'india',
  'indian',
  'ireland',
  'irish',
  'italian',
  'italy',
  'japan',
  'japanese',
  'mexican',
  'mexico',
  'moroccan',
  'morocco',
  'netherlands',
  'norway',
  'norwegian',
  'poland',
  'polish',
  'portugal',
  'portuguese',
  'russia',
  'russian',
  'scotland',
  'scottish',
  'south-korea',
  'south-korean',
  'spain',
  'spanish',
  'sweden',
  'swedish',
  'swiss',
  'switzerland',
  'turkey-country',
  'turkish',
  'united-kingdom',
  'united-states',
  'wales',
  'welsh',
]);

const dom = new JSDOM();
const parser = new dom.window.DOMParser();

function auditIcon(name) {
  const filePath = path.join(BASIC_DIR, `${name}.svg`);
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(filePath)) {
    return { errors: [`File not found: ${filePath}`], warnings };
  }
  if (name.endsWith('-fill')) {
    errors.push('Forbidden split -fill.svg file.');
  }

  const svg = fs.readFileSync(filePath, 'utf8');
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    errors.push('Invalid XML / SVG parse error.');
    return { errors, warnings };
  }

  const root = doc.documentElement;
  if (root.getAttribute('viewBox') !== '0 0 48 48') {
    errors.push(`viewBox must be "0 0 48 48" (got "${root.getAttribute('viewBox')}").`);
  }

  // Banned legacy bust slop primitives
  if (svg.includes('M6.6 46V40.6')) {
    errors.push('Uses legacy wide blocky shoulders (M6.6 46V40.6); convert to Clean Minimal Flat.');
  }
  if (svg.includes('M20.6 25.6V31.2')) {
    errors.push('Uses legacy chunky neck tube (M20.6 25.6V31.2); remove outlined neck.');
  }
  if (/cx="14\.6" cy="19\.8" rx="2\.[12]"/.test(svg)) {
    errors.push('Uses legacy thick-outlined sticking-out ears; remove ears on minimal flat bust.');
  }
  if (svg.includes('M24.2 21.2Q25.1 22.4 23.8 23') && name !== 'nose') {
    errors.push('Uses legacy hook-nose curve.');
  }
  if (svg.includes('fill="#f19a9a"') && name !== 'shy' && name !== 'embarrassed') {
    errors.push('Uses legacy default pink cheek blush oval.');
  }
  if (svg.includes('rx="1.15" ry="1.55"')) {
    errors.push('Uses legacy tall oval eyes with sparkle dots.');
  }

  // The 12-unit face rule: flag tiny scaled heads (effective diameter < 10.2 units) that still carry facial features
  const groups = [...doc.querySelectorAll('g[transform]')];
  for (const g of groups) {
    const t = g.getAttribute('transform') || '';
    const m = t.match(/scale\(\s*([0-9.]+)/);
    if (m) {
      const sc = Number(m[1]);
      if (sc > 0 && sc <= 0.52) {
        const inner = g.innerHTML;
        const hasDetailedFace =
          inner.includes('r="1.25"') || inner.includes('r="1.35"') || inner.includes('rx="1.15"');
        const isSmallHead = inner.includes('r="9.5"') || inner.includes('rx="9.6"');
        if (hasDetailedFace && isSmallHead && sc * 19 < 10) {
          errors.push(
            `Embedded detailed face at scale(${sc}) (diameter ${(sc * 19).toFixed(1)}u < 10u); use a clean faceless silhouette.`,
          );
        }
      }
    }
  }
  const circles = [...doc.querySelectorAll('circle')];
  const darkMicroDots = circles.filter((c) => {
    const r = Number(c.getAttribute('r') || '99');
    const fill = c.getAttribute('fill') || '';
    return r > 0 && r < 0.95 && fill === '#2b3445';
  });
  const hasSmallHeadCircle = circles.some((c) => {
    const r = Number(c.getAttribute('r') || '0');
    const fill = c.getAttribute('fill') || '';
    return (
      r >= 3.5 &&
      r < 6 &&
      [
        '#fcefe6',
        '#f9dec9',
        '#f5cca8',
        '#eebd98',
        '#d9a173',
        '#d39a6c',
        '#a8714a',
        '#7a4e33',
      ].includes(fill)
    );
  });
  if (darkMicroDots.length >= 2 && hasSmallHeadCircle && !FLAGS_AND_NATIONALITIES.has(name)) {
    errors.push(
      'Contains sub-1.0 unit eye dots inside a small head (< 12u); use a clean faceless silhouette.',
    );
  }

  // Feelings group must be Classic Emoji (large circle r >= 12)
  if (FEELINGS_EMOJI.has(name)) {
    const hasEmojiCircle = circles.some((c) => Number(c.getAttribute('r') || '0') >= 12);
    if (!hasEmojiCircle) {
      errors.push('Feelings icon must use the Classic Emoji circle (r >= 12).');
    }
  }

  // Framed vignette discipline: flag unclipped full-bleed background rects (half-bordered naked-sky scenes)
  const bgRects = [...doc.querySelectorAll('rect')].filter((r) => {
    const w = Number(r.getAttribute('width') || '0');
    const h = Number(r.getAttribute('height') || '0');
    const fill = r.getAttribute('fill') || '';
    const sw = r.getAttribute('stroke-width');
    const st = r.getAttribute('stroke');
    return w >= 40 && h >= 28 && fill !== 'none' && fill !== '' && (sw === '0' || st === 'none');
  });
  const hasSceneClip = [...doc.querySelectorAll('clipPath')].some((c) =>
    (c.getAttribute('id') || '').startsWith('scene-'),
  );
  const hasOuterFrame = [...doc.querySelectorAll('rect')].some((r) => {
    const w = Number(r.getAttribute('width') || '0');
    const h = Number(r.getAttribute('height') || '0');
    const fill = r.getAttribute('fill') || '';
    return w >= 40 && h >= 40 && fill === 'none';
  });
  if (bgRects.length > 0 && (!hasSceneClip || !hasOuterFrame)) {
    errors.push(
      'Unclipped full-bleed background rect without framed vignette (clipPath id="scene-<name>" + outer rounded frame stroke).',
    );
  }

  // Unique clipPath IDs
  const clips = [...doc.querySelectorAll('clipPath')];
  for (const clip of clips) {
    const id = clip.getAttribute('id') || '';
    if (!id.includes(name) && id !== 'uk' && id !== 'au') {
      warnings.push(`clipPath id "${id}" should include icon slug "${name}" to avoid collisions.`);
    }
  }

  // Element complexity budget (non-flag icons)
  const primitives = doc.querySelectorAll(
    'path, circle, ellipse, rect, polygon, polyline, line',
  ).length;
  if (!FLAGS_AND_NATIONALITIES.has(name) && primitives > 32) {
    warnings.push(`High primitive count (${primitives} > 32); simplify for 56 px clarity.`);
  }

  return { errors, warnings };
}

const args = process.argv.slice(2);
let names = args.filter((a) => !a.startsWith('--'));
const runAll = args.includes('--all');
if (runAll || names.length === 0) {
  names = fs
    .readdirSync(BASIC_DIR)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4))
    .sort();
}

let totalErrors = 0;
let totalWarnings = 0;
for (const name of names) {
  const { errors, warnings } = auditIcon(name);
  if (errors.length > 0 || warnings.length > 0) {
    for (const e of errors) console.error(`ERROR ${name}.svg: ${e}`);
    for (const w of warnings) console.warn(`WARN  ${name}.svg: ${w}`);
  }
  totalErrors += errors.length;
  totalWarnings += warnings.length;
}

console.log(
  `Audited ${names.length} icon(s): ${totalErrors} error(s), ${totalWarnings} warning(s).`,
);
if (totalErrors > 0) process.exit(1);
