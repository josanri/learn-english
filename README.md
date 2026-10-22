# Learn English

Free, original English practice exams that run in the browser. The first section is **B1**, with five Cambridge B1 Preliminary-style papers (Reading, Writing, Listening and Speaking). More boards and levels are planned.

The app is built with Angular 22 (zoneless, standalone components, signals). Exam content lives in static JSON files, and learner progress is stored only in the browser (localStorage and IndexedDB).

## Requirements

- Node.js `^22.22.3`, `^24.15.0` or newer (required by Angular 22).
- npm 10 or newer.

## Commands

```bash
npm install
npm start               # dev server on http://localhost:4200
npm run lint            # angular-eslint + Prettier check
npm test                # unit tests (Vitest through the Angular CLI)
npm run validate:exams  # JSON Schema + content rules for every exam
npm run build           # production build in dist/learn-english/browser
npm run build:pages -- /repo-name/   # build for GitHub Pages (base href + 404.html)
```

Other scripts: `npm run schema:generate` (JSON Schema from `src/app/models/exam.ts`), `npm run exams:index` (regenerate `index.json`), `npm run exams:migrate-v1` (one-off conversion of the original React exams, kept in `scripts/legacy-v1/`).

## Exams

Exams are JSON files in `src/assets/exams/<level>/<board>/<id>.json` (schema version 2, see `src/app/models/exam.ts`). Each level has a generated `index.json` used by the listing page. Supported boards: Cambridge B1 Preliminary today; the model also covers EOI, Trinity ISE I, Aptis, LanguageCert and Oxford Test formats.

To add an exam:

1. Create `src/assets/exams/b1/<board>/<board>-NN.json` following the schema (use an existing exam as a template).
2. Run `npm run exams:index` and `npm run validate:exams`.
3. Run `npm run build`.

Use the project skill in `.claude/skills/b1-exam-author/` for authoring rules. All materials are original practice items, not official exam papers.

## Saved data

Everything is saved in the browser: answers, writing drafts, speaking transcripts and scores in one localStorage key (`learn-english:v1`), and speaking recordings in IndexedDB (`learn-english-audio`). Data saved by the earlier React version (`northstar-practice-v3` and the `northstar-speech-recordings` database) is copied automatically on first load and left untouched as a backup.

## Deployment

`.github/workflows/deploy.yml` lints, tests, validates and builds, then publishes to GitHub Pages. The build uses `--base-href /<repository>/` and copies `index.html` to `404.html`, so deep links such as `/b1/cambridge-pet/cambridge-pet-01/reading` work with clean URLs. The app is also an installable PWA that works offline after the first visit.

## Reference sources

- [Cambridge B1 Preliminary exam format](https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/)
- [B1 Preliminary Handbook for Teachers](https://www.cambridgeenglish.org/Images/168150-b1-preliminary-teachers-handbook.pdf)
- [B1 Preliminary Vocabulary List (August 2025)](https://www.cambridgeenglish.org/Images/506887-b1-preliminary-vocabulary-list.pdf)
