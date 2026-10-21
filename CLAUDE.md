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
  shared/     reusable UI (empty for now)
src/assets/exams/<level>/<board>/<id>.json   exam data; <level>/index.json is generated
scripts/      validate-exams, generate-schema, generate-index, migrate-v1-to-v2, build-pages; legacy-v1/ holds the old JSON
```

Routes: `/`, `/b1`, `/b1/:board/:examId/(reading|writing|listening|speaking|mediation|results)`, `/settings`.

## Commands

`npm start`, `npm run lint`, `npm test`, `npm run validate:exams`, `npm run build`, `npm run build:pages -- /repo/`, `npm run schema:generate`, `npm run exams:index`.

Before committing: lint, test, validate:exams and build must all pass.

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
