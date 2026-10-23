# Learn English

Browser app with original English practice exams (first section: B1), grammar guides, an irregular verbs trainer, a B1 vocabulary list and daily practice (flashcards, phrasal verbs, graded reader). Installable PWA. Angular 22, zoneless, no backend: all data is static JSON and learner progress stays in the browser.

Read this file first. It is short on purpose. Open only the document in `docs/` that matches your task (table below) instead of reading the whole repository.

## Stack and rules

- Angular 22, TypeScript strict, `strictTemplates`. Zoneless (`provideZonelessChangeDetection()`, no zone.js). Node `^22.22.3` or newer.
- Standalone components only. `ChangeDetectionStrategy.OnPush` on every component (set explicitly).
- Signals (`signal`, `computed`, `effect`, `linkedSignal`, `input()`, `output()`, `model()`), `httpResource` for JSON. RxJS only where unavoidable.
- `inject()` instead of constructor parameters. Native control flow (`@if`, `@for`, `@switch`). No `@Input`/`@Output`/`@HostBinding` decorators.
- Lazy routes with `loadComponent` and `withComponentInputBinding()`; route params reach components as inputs.
- Tests: Vitest through `ng test`. Lint: angular-eslint + Prettier.
- Never hard-code colours or px sizes: use the tokens and rem (see the design system document).
- Every interactive element needs a visible focus ring, a 44 px target and a real accessible name.

## Content rules

- All learner-facing content (UI and exams) is in English.
- Materials are original. Never copy or lightly rewrite official exam papers or copyrighted texts.
- Photos need a local file and a full credit (author, licence, licence URL, source URL). Only Wikimedia Commons.
- Speech recognition and automated writing feedback are practice aids. Never present them as an official score.
- Only the Cambridge B1 Preliminary board is offered today. The other boards (EOI, Trinity, Aptis, LanguageCert, Oxford) are kept in the schema and the validators but hidden in the UI.

## Commands

```
npm start                  dev server
npm run lint               angular-eslint + Prettier check
npm test                   unit tests
npm run test:scripts       tests of the node scripts
npm run validate:exams     exams (schema, board shape, quality rules)
npm run validate:grammar   grammar guides and irregular verbs
npm run validate:practice  flashcards, phrasal verbs and graded reader stories
npm run build              production build (npm run build:pages -- /repo/ for GitHub Pages)
npm run schema:generate    JSON Schema from src/app/models/exam.ts
npm run exams:index        regenerate src/assets/exams/<level>/index.json
npm run images:optimize    re-encode exam photos (1000 px and 480 px WebP)
npm run icons:generate     favicon.ico and PWA icons from public/favicon.svg
npm run check:contrast     WCAG contrast table for every colour pair
```

Before committing: lint, test, test:scripts, validate:exams, validate:grammar, validate:practice and build must all pass.

## Where to look

| Task                                                          | Document                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| Folder layout, routes, how a feature is built                 | [docs/architecture.md](docs/architecture.md)             |
| Colours, tokens, UI components, themes, settings              | [docs/design-system.md](docs/design-system.md)           |
| Exam session store, scoring, part renderers, listening, timer | [docs/exam-engine.md](docs/exam-engine.md)               |
| Speaking recording and recognition                            | [docs/speaking.md](docs/speaking.md)                     |
| Writing checker, rules, rubric                                | [docs/writing-checker.md](docs/writing-checker.md)       |
| PDF and ZIP export of results                                 | [docs/export.md](docs/export.md)                         |
| Grammar guides, irregular verbs, vocabulary list              | [docs/grammar-vocabulary.md](docs/grammar-vocabulary.md) |
| Flashcards (spaced repetition), phrasal verbs, graded reader  | [docs/practice.md](docs/practice.md)                     |
| localStorage document, IndexedDB, migrations                  | [docs/persistence.md](docs/persistence.md)               |
| PWA install, service worker, GitHub Pages, project size       | [docs/pwa-and-deployment.md](docs/pwa-and-deployment.md) |
| Writing or reviewing an exam, photos, validators, token costs | [docs/authoring-exams.md](docs/authoring-exams.md)       |
| Paper shape of each board, with sources                       | [docs/exam-formats.md](docs/exam-formats.md)             |

The skill `.claude/skills/b1-exam-author/` is a short entry point to `docs/authoring-exams.md`.
