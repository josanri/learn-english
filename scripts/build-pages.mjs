// Production build for GitHub Pages.
//   BASE_HREF=/my-repo/ node scripts/build-pages.mjs      (or: npm run build:pages -- /my-repo/)
// Defaults to /learn-english/. The build output gets a 404.html copy of index.html so that deep links such as
// /my-repo/b1/cambridge-pet/cambridge-pet-01/reading are served the app, which then routes on the clean URL.
import { spawnSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raw = process.argv[2] ?? process.env.BASE_HREF ?? '/learn-english/';
const baseHref = `/${raw.replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const outDir = fileURLToPath(new URL('../dist/learn-english/browser/', import.meta.url));

console.log(`Building with base href ${baseHref}`);
const build = spawnSync('npx', ['ng', 'build', `--base-href=${baseHref}`], {
  stdio: 'inherit',
  shell: true,
});
if (build.status !== 0) process.exit(build.status ?? 1);

copyFileSync(`${outDir}index.html`, `${outDir}404.html`);
writeFileSync(`${outDir}.nojekyll`, '');
console.log('Copied index.html to 404.html and added .nojekyll');
