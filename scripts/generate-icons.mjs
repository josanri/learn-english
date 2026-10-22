// Renders the brand mark (public/favicon.svg) to favicon.ico and the PWA icons in public/icons/.
// PWA icons are full-bleed (paper blue square, quotation marks inside the maskable safe zone).
// Usage: npm run icons:generate  (needs Playwright and a local Chrome).
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const PUBLIC = new URL('../public/', import.meta.url);
const ICO_SIZES = [16, 32, 48];
const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const QUOTES = `
  <circle cx="10.2" cy="12.6" r="3.6" fill="#0d0d0d"/>
  <path d="M13.3 12.8 C13.3 17.6 11.4 20.6 7.6 22.2" fill="none" stroke="#0d0d0d" stroke-width="2.8" stroke-linecap="round"/>
  <circle cx="19.4" cy="12.6" r="3.6" fill="#0d0d0d"/>
  <path d="M22.5 12.8 C22.5 17.6 20.6 20.6 16.8 22.2" fill="none" stroke="#0d0d0d" stroke-width="2.8" stroke-linecap="round"/>`;

// Centre of the quotation marks is about (14.8, 15.8); scale them up around the icon centre.
const PWA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#5fb0ff"/>
  <g transform="translate(16 16) scale(1.15) translate(-14.8 -16.2)">${QUOTES}</g>
</svg>`;

async function render(page, svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

/** ICO container with PNG payloads (supported by every current browser). */
function toIco(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const favicon = await readFile(new URL('favicon.svg', PUBLIC), 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ colorScheme: 'light' });
  const pngs = [];
  for (const size of ICO_SIZES) pngs.push({ size, data: await render(page, favicon, size) });
  await writeFile(new URL('favicon.ico', PUBLIC), toIco(pngs));
  for (const size of PWA_SIZES) {
    await writeFile(
      new URL(`icons/icon-${size}x${size}.png`, PUBLIC),
      await render(page, PWA_SVG, size),
    );
  }
  console.log(`favicon.ico (${ICO_SIZES.join(', ')}) and ${PWA_SIZES.length} PWA icons written.`);
} finally {
  await browser.close();
}
