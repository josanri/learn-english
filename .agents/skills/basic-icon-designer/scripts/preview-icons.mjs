import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const sharp = require('sharp');

const BASIC_DIR = path.join(process.cwd(), 'src', 'assets', 'images', 'basic');

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function main() {
  const [outPath, ...names] = process.argv.slice(2);
  if (!outPath || names.length === 0) {
    console.error('Usage: node preview-icons.mjs <output.png> <icon1> [icon2 ...]');
    process.exit(1);
  }

  // Dual-size cell: left = real 56px app art inside 64px white tile, right = 112px 2x detail check
  const APP_TILE = 64;
  const APP_ART = 56;
  const ZOOM_TILE = 112;
  const ZOOM_ART = 100;
  const GAP = 10;
  const PAD = 12;
  const LABEL_H = 22;
  const COLS = Math.min(4, names.length);
  const CELL_W = APP_TILE + GAP + ZOOM_TILE + PAD * 2;
  const CELL_H = ZOOM_TILE + LABEL_H + PAD * 2;
  const ROWS = Math.ceil(names.length / COLS);
  const WIDTH = COLS * CELL_W;
  const HEIGHT = ROWS * CELL_H;

  const bg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">`,
    `<rect width="100%" height="100%" fill="#eef1f5"/>`,
  ];

  const composites = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL_W;
    const y = row * CELL_H;
    const appY = y + PAD + Math.floor((ZOOM_TILE - APP_TILE) / 2);

    // 64px real app tile (.pic)
    bg.push(
      `<rect x="${x + PAD}" y="${appY}" width="${APP_TILE}" height="${APP_TILE}" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>`,
    );
    bg.push(
      `<text x="${x + PAD + APP_TILE / 2}" y="${appY - 5}" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">56px</text>`,
    );

    // 112px zoomed tile
    const zoomX = x + PAD + APP_TILE + GAP;
    bg.push(
      `<rect x="${zoomX}" y="${y + PAD}" width="${ZOOM_TILE}" height="${ZOOM_TILE}" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>`,
    );
    bg.push(
      `<text x="${x + CELL_W / 2}" y="${y + PAD + ZOOM_TILE + 16}" font-family="sans-serif" font-size="13" font-weight="600" fill="#1e293b" text-anchor="middle">${escapeXml(name)}</text>`,
    );

    const svgPath = path.join(BASIC_DIR, `${name}.svg`);
    if (!fs.existsSync(svgPath)) continue;
    const buf = Buffer.from(fs.readFileSync(svgPath, 'utf8'), 'utf8');
    const png56 = await sharp(buf, { density: 240 })
      .resize(APP_ART, APP_ART, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();
    const png112 = await sharp(buf, { density: 300 })
      .resize(ZOOM_ART, ZOOM_ART, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    composites.push({
      input: png56,
      left: x + PAD + (APP_TILE - APP_ART) / 2,
      top: appY + (APP_TILE - APP_ART) / 2,
    });
    composites.push({
      input: png112,
      left: zoomX + (ZOOM_TILE - ZOOM_ART) / 2,
      top: y + PAD + (ZOOM_TILE - ZOOM_ART) / 2,
    });
  }

  bg.push('</svg>');
  const basePng = await sharp(Buffer.from(bg.join('')))
    .png()
    .toBuffer();
  await sharp(basePng).composite(composites).png().toFile(outPath);
  console.log(`Wrote dual-size preview (${names.length} icons) to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
