# Learn English

Browser app with original English practice exams (first section: B1). Migrated from React/Vite ("Northstar B1") to Angular; see `prompts/` for the phase plan.

## Stack

- Angular 22, TypeScript strict, `strictTemplates`. Zoneless (`provideZonelessChangeDetection()`, no zone.js).
- Standalone components only, no NgModules. `ChangeDetectionStrategy.OnPush` on every component (set explicitly).
- Signals: `signal`, `computed`, `effect`, `linkedSignal`, `input()`, `output()`, `model()`. `httpResource`/`resource` for loading JSON. RxJS only where unavoidable.
- `inject()` instead of constructor parameters. Native control flow (`@if`, `@for`, `@switch`). No `@Input`/`@Output`/`@HostBinding` decorators.
- Router with lazy `loadComponent` and `withComponentInputBinding()` (`paramsInheritanceStrategy: 'always'`, so route params and data reach child components as inputs).
- Tests: Vitest through `ng test`. Lint: angular-eslint + Prettier.
- Node must be `^22.22.3` or newer (Angular 22 CLI requirement).

## Structure

```
src/app/
  core/       storage (single localStorage doc + migrations), settings, theme, speech (TTS), audio-db (IndexedDB)
  data/       exam catalogue service (lazy JSON loading)
  models/     exam.ts (schema v2 types, source of truth), storage.ts (persisted state)
  features/   home, level (/b1), exam (shell + section pages + results), settings
  shared/ui/  design-system components (import from 'shared/ui')
src/assets/exams/<level>/<board>/<id>.json   exam data; <level>/index.json is generated
scripts/      validate-exams, generate-schema, generate-index, migrate-v1-to-v2, build-pages; legacy-v1/ holds the old JSON
```

Routes: `/`, `/b1`, `/b1/:board/:examId/(reading|writing|listening|speaking|mediation|results)`, `/settings`.

## Commands

`npm start`, `npm run lint`, `npm test`, `npm run validate:exams`, `npm run build`, `npm run build:pages -- /repo/`, `npm run schema:generate`, `npm run exams:index`, `npm run check:contrast`.

Before committing: lint, test, validate:exams and build must all pass.

## Design system

Style: own take on a bold, tactile look (huge tight headlines, flat colour cards with thick borders and solid offset shadows, key-like buttons). Fonts are bundled (Bricolage Grotesque Variable for display and body, JetBrains Mono Variable for chips, timers and counters), imported in `src/styles.css`.

- Tokens live in `src/styles/tokens.css` (CSS custom properties): colour (`--bg --surface --surface-2 --text --text-muted --border --border-muted --accent --accent-strong --on-accent --accent-text --success --warning --danger --focus-ring`), `--paper-*` card colours, `--radius-*`, `--space-1..9`, `--step--1..6` fluid type, `--font-display/body/mono`, `--target` (44px min touch size), `--dur` (motion, 0s when reduced). Never hard-code colours or px sizes; use rem and tokens. Brand blue `--accent` is for graphics only; text uses `--accent-text`, buttons `--accent-strong` + `--on-accent`.
- Themes: light in `:root`, dark in `:root[data-theme='dark']` and (identical copy) `@media (prefers-color-scheme: dark) :root:not([data-theme])`. Other settings set `data-text-size`, `data-motion='reduce'`, `data-contrast='high'` on `<html>`. `ThemeService` applies them; an inline script in `index.html` does it before first paint. If you add or change a token, edit both dark copies and run `npm run check:contrast` (WCAG 2.2 AA table for every pair, fails the build on regressions; add new pairs in `scripts/check-contrast.mjs`).
- Utilities in `src/styles/base.css`: `.container`, `.page`, `.eyebrow`, `.lede`, `.muted`, `.section-title`, `.visually-hidden`, `.field`, `.hint`, `.switch` (checkbox toggle markup is documented there).
- Components (`src/app/shared/ui`, barrel `index.ts`): `appButton` on native `<button>`/`<a>` (variant primary|secondary|ghost|danger, size sm|md|lg, block), `app-chip` (`[command]` for mono chips), `app-card` (`[raised]`), `app-illustrated-card` (heading, tone, rotate, link; project `<app-skill-art art kind="reading">`), `app-badge` (tone), `app-progress-ring` / `app-progress-bar` (value 0..1, label), `app-segmented-control` (native radios, `[(value)]`, options, label), `app-dialog` (`[(open)]`, heading, buttons in `<ng-container actions>`; native `<dialog>`), `ToastService.show()` (host `app-toast-host` is in the shell), `app-skip-link`, `app-icon` (names in `icon.ts`), `app-empty-state`, `app-brush-stroke`, `app-skill-art`. Use these instead of ad-hoc markup; every interactive element needs a visible focus ring, a 44px target and a real accessible name.
- Shell: sticky header, one `<nav aria-label="Main">` that becomes a fixed bottom bar under 48rem (safe-area aware). Pages wrap content in `<div class="container page">`; the main landmark is `#main`.
- Settings (`Settings` in `models/storage.ts`, defaults and validation in `core/state-migrations.ts`, access through `SettingsService.update()`): theme, textSize, reduceMotion, highContrast, voiceUri, speechRate (0.8-1.2), recognitionLang, onlineRecognition, showTimer, examMode, studentName. Exam pages must honour `showTimer`, `examMode` (no hints or explanations until finished) and `recognitionLang`/`onlineRecognition`.
- `core/progress.ts` `examStatus()` derives not-started / in-progress / completed, section fraction and score percent from saved progress; completed means every section of the exam has `sectionStatus` completed.
- Accessibility check: run `ng serve` and axe via `@axe-core/playwright` (installed as dev dependency; system Chrome works with `channel: 'chrome'`). Home, /b1, /settings had no violations in either theme at 360 and 1280 px.

## Persistence

One localStorage key `learn-english:v1` = `{ schemaVersion, settings, progress: { [examId]: { answers, results, startedAt, updatedAt, sectionStatus } }, migrations }`. `LocalStorageService` is signal-based, debounces writes with an effect and reads with try/catch. To change the shape, bump `CURRENT_SCHEMA_VERSION` and add a step in `core/state-migrations.ts`. Answer keys inside `answers` keep the original format: item id (`r1-1`), `writing-1`, `writing-2`, `writing-2-type`, `speaking:<promptId>`. Recordings live in IndexedDB `learn-english-audio` keyed `<examId>:<promptId>`. Never rename exam or item ids that are already published.

## Adding an exam

Create the JSON under `src/assets/exams/<level>/<board>/`, run `npm run exams:index` and `npm run validate:exams`. If you change `src/app/models/exam.ts`, run `npm run schema:generate` first. New boards need an entry in `BOARD_INFO` (`scripts/lib/exam-files.mjs`) and, for fixed paper shapes, a rule function in `scripts/validate-exams.mjs`. The skill `.claude/skills/b1-preliminary-exam-author/` has the authoring rules.

## Content rules

- All learner-facing content (UI and exams) is in English.
- Materials are original. Never copy or lightly rewrite official exam papers or copyrighted texts.
- Images need a local file plus a full credit (author, licence, licence URL, source URL).
- Speech recognition and automated writing feedback are practice aids, never presented as an official score.

## Deployment

GitHub Pages through `.github/workflows/deploy.yml`. Clean URLs: the build copies `index.html` to `404.html` (instead of hash routing); the base href is `/<repository-name>/`.
