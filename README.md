# Learn English

Free, original English practice that runs in the browser. The first section is **B1**: one hundred Cambridge B1 Preliminary-style practice papers (Reading, Writing, Listening and Speaking), grammar guides for B1 and B2, an irregular verbs trainer and the Cambridge B1 vocabulary list. It is an installable app (PWA) that works offline. More boards and levels are planned.

The app is built with Angular 22 (zoneless, standalone components, signals). All content is static JSON, and learner progress is stored only in the browser (localStorage and IndexedDB). There is no server and no account.

## What is in the app

| Area          | What the learner gets                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exams         | 100 original B1 Preliminary-style papers. Reading and Listening are marked automatically with an explanation for every answer. Writing has a practice checker (spelling, grammar rules, word count, rubric). Speaking records the answers and can transcribe them. Exam mode (no answers or explanations before you submit, two plays per recording) and practice mode (check a part, read the transcript). |
| Weak areas    | After each section the result is split by kind of task (for example "Write the missing word") and, for the gap-fill texts, by grammar point (for example "Relative clauses"). Home and the results page show the weakest areas, with links to the grammar guides.                                                                                                                                           |
| My mistakes   | Wrong exam answers and missed phrasal verbs come back on a spaced-repetition schedule until the learner gets them right over some weeks. Gap-fill and notice questions are answered on the card; other questions link to their part.                                                                                                                                                                        |
| Grammar       | 13 guides (B1 and B2) and an irregular verbs trainer.                                                                                                                                                                                                                                                                                                                                                       |
| Vocabulary    | The Cambridge B1 Preliminary vocabulary list, about 520 flashcards with spaced repetition, and 250 phrasal verbs in 10 groups with three kinds of exercise.                                                                                                                                                                                                                                                 |
| Graded reader | 40 original short stories (A2+ to B1+) with a tap-to-see glossary, read-aloud and questions.                                                                                                                                                                                                                                                                                                                |
| Results       | A PDF report and a ZIP with the speaking recordings, for every attempt.                                                                                                                                                                                                                                                                                                                                     |

Scores, speech recognition and writing feedback are practice aids. They are not an official result. All exams and texts are original; they are not official Cambridge papers.

## Requirements

- Node.js `^22.22.3`, `^24.15.0` or newer (required by Angular 22).
- npm 10 or newer.

## Commands

```bash
npm install
npm start                  # dev server on http://localhost:4200
npm run lint               # angular-eslint + Prettier check
npm test                   # unit tests (Vitest through the Angular CLI)
npm run test:scripts       # tests of the node scripts
npm run validate:exams     # JSON Schema + content rules for every exam
npm run validate:grammar   # grammar guides and irregular verbs
npm run validate:practice  # flashcards, phrasal verbs and graded reader stories
npm run build              # production build in dist/learn-english/browser
npm run build:pages -- /repo-name/   # build for GitHub Pages (base href + 404.html)
```

Other scripts:

- `npm run schema:generate`: JSON Schema from `src/app/models/exam.ts`.
- `npm run exams:index`: regenerate `src/assets/exams/<level>/index.json`.
- `npm run exams:tag-cloze`: add grammar tags to new gap-fill items (`-- --check` only reports).
- `npm run exams:difficulty`: write the difficulty report, `docs/reports/exam-difficulty.md`.
- `npm run images:optimize`, `npm run icons:generate`, `npm run check:contrast`.

## Exams

Exams are JSON files in `src/assets/exams/<level>/<board>/<id>.json` (schema version 2, see `src/app/models/exam.ts`). Each level has a generated `index.json` used by the listing page. Only Cambridge B1 Preliminary is offered today. The model and validators also cover EOI, Trinity ISE I, Aptis, LanguageCert and Oxford Test formats, but those boards are hidden until they have exams.

To add an exam:

1. Write it with the builders in `scripts/lib/exam-builders.mjs`, or copy an existing exam as a template. The builders add the grammar tags of the gap-fill items for you.
2. Run `npm run exams:index` and `npm run validate:exams`.
3. Run `npm run build`.

Read `docs/authoring-exams.md` (or use the project skill in `.claude/skills/b1-exam-author/`) for the authoring rules and the low-token workflow (`node scripts/exam-tools.mjs`).

`docs/reports/exam-difficulty.md` compares the exams by sentence length, reading ease and words outside the B1 list. Read the outliers again when you add or change an exam.

## Saved data

Everything is saved in the browser: answers, writing drafts, speaking transcripts, scores, the mistakes queue and the practice progress in one localStorage key (`learn-english:v1`), and speaking recordings in IndexedDB (`learn-english-audio`). The app asks the browser to keep this data (persistent storage). Settings > Your data exports and imports a copy as JSON.

## Deployment

`.github/workflows/deploy.yml` lints, tests, validates and builds, then publishes to GitHub Pages. The build uses `--base-href /<repository>/` and copies `index.html` to `404.html`, so deep links such as `/exams/b1/cambridge-pet/cambridge-pet-01/reading` work with clean URLs.

The app is an installable PWA (Settings > Install the app, or the install button of the browser). The service worker downloads the app shell on install and keeps the exams, photos and other content when they are first opened, so an exam works offline after one visit. The build is about 55 MB, mostly the speaking photos (about 45 MB for 100 exams); learners download only the photos of the exams that they open.

## Report a problem or suggest an idea

Use the [issue forms](https://github.com/josanri/learn-english/issues/new/choose): a mistake in an exam or exercise, something that does not work, or an idea. The app links to them from the footer and from Settings > Help and feedback.

## Reference sources

- [Cambridge B1 Preliminary exam format](https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/)
- [B1 Preliminary Handbook for Teachers](https://www.cambridgeenglish.org/Images/168150-b1-preliminary-teachers-handbook.pdf)
- [B1 Preliminary Vocabulary List (August 2025)](https://www.cambridgeenglish.org/Images/506887-b1-preliminary-vocabulary-list.pdf)

## For contributors and AI agents

Start with `AGENTS.md`. It links to one short document per topic in `docs/`.
