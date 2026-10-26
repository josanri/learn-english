# PWA, deployment and project size

## Installable app

The app is a real PWA: browsers can install it as an app with its own window and home-screen or desktop icon.

- `public/manifest.webmanifest`: `id`, `name`, `short_name`, `start_url` and `scope` (relative, so the GitHub Pages base path works), `display: standalone`, theme and background colour, `categories`, two shortcuts (B1 exams, Grammar) and icons. The `any` icons are 72 to 512 px; `maskable` icons are 192 and 512 px (the artwork already sits inside the safe zone).
- `src/index.html`: manifest link, `theme-color` for light and dark, `apple-touch-icon` and the iOS web-app meta tags.
- Service worker: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`, configured by `ngsw-config.json`. It only runs in production builds, so test installation with `npm run build` and a static server (or the deployed site).
- `core/app-update.service.ts` (`AppUpdateService`, started in the app initializer): the service worker downloads a new deploy in the background but keeps serving the old version until the page reloads, which an installed app rarely does. The service calls `SwUpdate.checkForUpdate()` on start, when the app returns to the foreground and every hour. On `VERSION_READY` it reloads the page at once when the learner is on Home; on any other page it waits for the next navigation to finish, so an exam or a recording is never cut off.
- `core/install.service.ts` (`InstallService`, started in the app initializer): keeps the `beforeinstallprompt` event, exposes `canInstall`, `installed` and `needsManualSteps` (iPhone and iPad) and `install()` which opens the browser's own install dialog. The Home hero shows an "Install app" button when the browser offers the install. Settings > Install the app shows the button, the iOS steps, or a hint.
- Chrome and Edge show the install offer only over HTTPS (or localhost) after the manifest, icons and service worker are valid. Firefox desktop has no install; Safari uses Share > Add to Home Screen.
- After changing the logo run `npm run icons:generate`.

## Service worker asset groups (`ngsw-config.json`)

- `app` (prefetch): index, manifest, CSS and JS.
- `assets` (lazy): images and fonts.
- `exams` (lazy): `assets/exams/**/*.json`. They are lazy so that adding many exams does not make the first install heavy; an exam works offline after it was opened once.
- `grammar`, `vocabulary` (lazy, prefetch on update), `dictionaries` (lazy; spelling files).

## GitHub Pages

`.github/workflows/deploy.yml` lints, tests, validates and builds, then publishes to GitHub Pages. Clean URLs: the build copies `index.html` to `404.html` (instead of hash routing) and the base href is `/<repository-name>/` (`npm run build:pages -- /repo/`, script `scripts/build-pages.mjs`).

## Keeping the project small

Photos are the largest part of the repository, so the rules are:

- Photos are WebP: `-1200.webp` files are 1000 px wide (quality 62) and `-600.webp` files are 480 px wide (quality 58). The file names did not change because they are published paths; `srcset` uses `480w` and `1000w`.
- `npm run images:optimize` re-encodes any photo that is wider than the target and updates `image.width` and `image.height` in the exam JSON. It is safe to run again. `scripts/fetch-image.mjs` already writes the new sizes for new photos.
- Do not commit originals, previews or scratch files (use the `work/` folder, which git ignores).
- Large data (exams, vocabulary, dictionaries, fonts) is loaded lazily and cached by the service worker; none of it is in the JS bundle. Keep it that way.
- Budgets: initial bundle warning at 500 kB and error at 1 MB (`angular.json`).
- Current sizes: 100 exams, photos about 45 MB (about 0.45 MB per exam, five photos each), exam JSON about 64 KB each; the build is about 55 MB. Photos and exams are `lazy` in `ngsw-config.json`, so a learner downloads only what they open. If the size becomes a problem, the next steps are 800 px photos, AVIF, or fewer photos per exam.
