// Verifies WCAG 2.2 AA contrast for the design tokens in src/styles/tokens.css.
// Usage: npm run check:contrast   (exits 1 on any failure; prints the full table)
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function block(start) {
  const i = css.indexOf(start);
  if (i < 0) throw new Error(`Block not found: ${start}`);
  const open = css.indexOf('{', i);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}
function vars(body) {
  const out = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const light = vars(block(':root {'));
const dark = { ...light, ...vars(block(":root[data-theme='dark']")) };
const darkMedia = { ...light, ...vars(block(':root:not([data-theme])')) };
const high = { text: null };

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error('FAIL ' + msg);
};

for (const key of Object.keys(dark)) {
  if (dark[key] !== darkMedia[key])
    fail(`dark theme differs from the prefers-color-scheme copy: --${key}`);
}

function rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function lum(hex) {
  const [r, g, b] = rgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum ratio, description]
const TEXT = 4.5;
const UI = 3;
const pairs = [
  ['text', 'bg', TEXT, 'body text'],
  ['text', 'surface', TEXT, 'text on surface'],
  ['text', 'surface-2', TEXT, 'text on surface-2'],
  ['text-muted', 'bg', TEXT, 'muted text'],
  ['text-muted', 'surface', TEXT, 'muted text on surface'],
  ['text-muted', 'surface-2', TEXT, 'muted text on surface-2'],
  ['accent-text', 'bg', TEXT, 'link text'],
  ['accent-text', 'surface', TEXT, 'link text on surface'],
  ['on-accent', 'accent-strong', TEXT, 'primary button label'],
  ['success', 'bg', TEXT, 'success text'],
  ['success', 'surface', TEXT, 'success text on surface'],
  ['warning', 'bg', TEXT, 'warning text'],
  ['warning', 'surface', TEXT, 'warning text on surface'],
  ['danger', 'bg', TEXT, 'danger text'],
  ['danger', 'surface', TEXT, 'danger text on surface'],
  ['text', 'brush', TEXT, 'headline over the brush stroke'],
  ['border', 'bg', UI, 'strong border'],
  ['border-muted', 'bg', UI, 'muted border'],
  ['border-muted', 'surface', UI, 'muted border on surface'],
  ['focus-ring', 'bg', UI, 'focus ring'],
  ['focus-ring', 'surface', UI, 'focus ring on surface'],
  ['accent-strong', 'bg', UI, 'primary button edge'],
  ['card-border', 'bg', UI, 'card border'],
];
const paperPairs = [
  'paper-blue',
  'paper-cream',
  'paper-green',
  'paper-white',
  'paper-coral',
].flatMap((bg) => [
  ['paper-ink', bg, TEXT, `card text on ${bg}`],
  ['paper-ink-muted', bg, TEXT, `card muted text on ${bg}`],
]);

const rows = [];
for (const [name, theme] of [
  ['light', light],
  ['dark', dark],
]) {
  for (const [fg, bg, min, what] of [...pairs, ...paperPairs]) {
    const r = ratio(theme[fg], theme[bg]);
    const ok = r >= min;
    rows.push(
      `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(5)} ${r.toFixed(2).padStart(5)}:1 (min ${min}) --${fg} on --${bg}  ${what}`,
    );
    if (!ok) failures++;
  }
}
console.log(rows.join('\n'));
console.log(failures ? `\n${failures} failure(s)` : '\nAll pairs meet WCAG 2.2 AA.');
process.exit(failures ? 1 : 0);
