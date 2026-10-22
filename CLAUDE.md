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
  features/   home, level (/b1), progress (summary card), exam (shell, section pages, results; see Exam engine), settings
  shared/ui/  design-system components (import from 'shared/ui')
src/assets/exams/<level>/<board>/<id>.json   exam data; <level>/index.json is generated
scripts/      validate-exams, generate-schema, generate-index, migrate-v1-to-v2, build-pages; legacy-v1/ holds the old JSON
```

Routes: `/`, `/b1`, `/b1/:board/:examId/(reading|writing|listening|speaking|mediation|results)`, `/settings`.

## Commands

`npm start`, `npm run lint`, `npm test`, `npm run validate:exams`, `npm run test:scripts`, `npm run build`, `npm run build:pages -- /repo/`, `npm run schema:generate`, `npm run exams:index`, `npm run check:contrast`, `npm run icons:generate`.

Before committing: lint, test, test:scripts, validate:exams and build must all pass.

## Design system

Style: own take on a bold, tactile look (huge tight headlines, flat colour cards with thick borders and solid offset shadows, key-like buttons). Fonts are bundled (Bricolage Grotesque Variable for display and body, JetBrains Mono Variable for chips, timers and counters), imported in `src/styles.css`.

- Tokens live in `src/styles/tokens.css` (CSS custom properties): colour (`--bg --surface --surface-2 --text --text-muted --border --border-muted --accent --accent-strong --on-accent --accent-text --success --warning --danger --focus-ring`), `--paper-*` card colours, `--radius-*`, `--space-1..9`, `--step--1..6` fluid type, `--font-display/body/mono`, `--target` (44px min touch size), `--dur` (motion, 0s when reduced). Never hard-code colours or px sizes; use rem and tokens. Brand blue `--accent` is for graphics only; text uses `--accent-text`, buttons `--accent-strong` + `--on-accent`.
- Themes: light in `:root`, dark in `:root[data-theme='dark']` and (identical copy) `@media (prefers-color-scheme: dark) :root:not([data-theme])`. Other settings set `data-text-size`, `data-motion='reduce'`, `data-contrast='high'` on `<html>`. `ThemeService` applies them; an inline script in `index.html` does it before first paint. If you add or change a token, edit both dark copies and run `npm run check:contrast` (WCAG 2.2 AA table for every pair, fails the build on regressions; add new pairs in `scripts/check-contrast.mjs`).
- Utilities in `src/styles/base.css`: `.container`, `.page`, `.eyebrow`, `.lede`, `.muted`, `.section-title`, `.visually-hidden`, `.field`, `.hint`, `.switch` (checkbox toggle markup is documented there).
- Components (`src/app/shared/ui`, barrel `index.ts`): `appButton` on native `<button>`/`<a>` (variant primary|secondary|ghost|danger, size sm|md|lg, block), `app-chip` (`[command]` for mono chips), `app-card` (`[raised]`), `app-illustrated-card` (heading, tone, rotate, link; project `<app-skill-art art kind="reading">`), `app-badge` (tone), `app-progress-ring` / `app-progress-bar` (value 0..1, label), `app-segmented-control` (native radios, `[(value)]`, options, label), `app-dialog` (`[(open)]`, heading, buttons in `<ng-container actions>`; native `<dialog>`), `ToastService.show()` (host `app-toast-host` is in the shell), `app-skip-link`, `app-icon` (names in `icon.ts`), `app-empty-state`, `app-logo-mark` (brand mark, decorative), `app-skill-art`. Use these instead of ad-hoc markup; every interactive element needs a visible focus ring, a 44px target and a real accessible name.
- Brand: logo = closing quotation marks on a paper-blue key tile (`app-logo-mark`, same drawing in `public/favicon.svg`; after a change run `npm run icons:generate` for `favicon.ico` and the PWA icons). Home hero = "Learn" plus "English" in a tilted speech bubble (paper blue, card border and offset shadow). Keep the bubble for the hero only, not for the logo.
- Shell: sticky header, one `<nav aria-label="Main">` that becomes a fixed bottom bar under 48rem (safe-area aware). Pages wrap content in `<div class="container page">`; the main landmark is `#main`.
- Settings (`Settings` in `models/storage.ts`, defaults and validation in `core/state-migrations.ts`, access through `SettingsService.update()`): theme, textSize, reduceMotion, highContrast, voiceUri, speechRate (0.8-1.2), recognitionLang, onlineRecognition, showTimer, examMode, studentName. Exam pages must honour `showTimer`, `examMode` (no hints or explanations until finished) and `recognitionLang`/`onlineRecognition`.
- `core/progress.ts` `examStatus()` derives not-started / in-progress / completed, section fraction, score percent and `everCompleted` from saved progress. Completed means every skill in `COMPLETABLE_SKILLS` (reading, writing, listening, speaking) that the exam has is `completed`. Only `SCORED_SKILLS` (reading, listening) have `results`; writing and speaking are completed by submitting the section and have no score. `core/stats.ts` `computeStats()` feeds the Home and /b1 summary (completed exams, average per skill, streak, Continue).
- Chip: `app-chip [command]` shows a `$` prompt; pass `[prompt]="false"` for durations, timers and counters.
- Accessibility check: run `ng serve` and axe via `@axe-core/playwright` (installed as dev dependency; system Chrome works with `channel: 'chrome'`). Home, /b1, /settings had no violations in either theme at 360 and 1280 px.

## Exam engine (`features/exam`)

- `ExamShell` provides `ExamSessionStore` (one per open exam): loads the exam JSON, exposes `skill` (open section, set by the section page), `parts`, `part`, `answers`, `session`, `itemsByPart`, `score`, `unanswered`, timer (`elapsed`, `remaining`, `timerNotice`), `locked` (section submitted = read-only), `feedback(itemId)` (null until revealed: section submitted, or part checked in practice mode; never before submit when `examMode`), and the writers `setAnswer`, `toggleFlag`, `goToPart`, `checkPart`, `addListen`, `submitSection`, `retry`. All state lives in `LocalStorageService`; the store only computes over it.
- Reading, Listening and Speaking routes use `SectionPage` (navigator only when the section has marked items; free-response prompts counted through `PartDef.prompts`); Writing goes through `SectionPage` too; only Mediation still uses `PlaceholderSectionPage`. `/results` is `ResultsPage`.
- Scoring is pure (`engine/scoring.ts`): every part is reduced to `ScoreItem`s (`choice` stores the option index, `text` stores a string compared with `normalizeAnswer`; `choices` maps letters or true/false to labels). `engine/report.ts` builds per-part reports for any answers (current or archived attempt). Gap markers in passages are parsed by `engine/passage.ts`.
- Part renderer registry, `parts/part-registry.ts`: `PART_REGISTRY` maps every `part.type` to `{ load, items }`. To add a part type: add the interface to `models/exam.ts` (+ `npm run schema:generate`), create a standalone renderer in `parts/` with `part = input.required<YourPart>()` that reads and writes answers through `inject(ExamSessionStore)` and uses the controls in `ui/item-controls.ts` (`ChoiceQuestion`, `AnswerSelect`, `AnswerInput`, `SelectRow`, `FlagStrip`, `ItemFeedback`) plus `SplitLayout`/`Passage`/`AudioScriptPlayer`, then add one registry entry (the mapped type fails to compile if one is missing; `part-registry.spec.ts` checks every type used in `assets/exams`). Heading, instructions, Check button, focus management and lazy loading come from `PartView`; renderers only draw the body. Item ids must stay unique per exam and stable (they are the answer keys). Gap inputs get ids `sel-<itemId>` / `in-<itemId>` and choice fieldsets `q-<itemId>` for the navigator's focus jump.
- Listening: `SpeechService.createPlayback(recording)` returns a `ScriptPlayback` (`core/speech-playback.ts`: sentence chunking for Chrome, pause = cancel and re-speak the chunk so Safari iOS works, watchdog when `onend` never fires, per-speaker voices via `chooseVoices`, pitch shift when a voice is shared). Works for any number of speakers. Exam mode: 2 plays per recording, no transcript or Repeat until submitted; practice mode: unlimited plays and a transcript toggle. No speech synthesis: the player shows the transcript with a notice.
- Cambridge scale: deliberately not estimated (conversion tables are unpublished and these papers are original); results show percentage, a neutral practice band and an explanation.

## Speaking (`features/exam/speaking`, `core`)

- `SpeechRecognitionService` (provided per component; signals `status idle|listening|stopped|error|unsupported`, `interimTranscript`, `finalTranscript`, `error`, `capability`, `needsOnlinePermission`): feature-detects `SpeechRecognition.available/install` (on-device first), uses online only if the `onlineRecognition` setting is on, restarts when Chrome ends the session while the learner is recording, de-duplicates Android's repeated results. Token `SPEECH_RECOGNITION_CTOR` lets tests inject a mock. `MicRecorderService` (per component): one getUserMedia for MediaRecorder (webm/opus, mp4 on Safari) and an AnalyserNode level meter; releases the mic on stop and destroy, `salvage` saves a recording in progress if the page is left. `SpeechService.speakText()` is the examiner voice.
- `SpeakingResponse` is the card every speaking renderer uses (record, live transcript, playback, re-record, delete, editable transcript, practice feedback). Renderers: `questions-part` (interview, discussion; one at a time), `photo-part`, `collaborative-part`, `monologue-part`, `role-play-part`. Prompt ids and answer keys: `parts/speaking-prompts.ts` (`speakingPrompts`, `isResponded`).
- Feedback metrics (`core/speech-metrics.ts` `analyzeSpeech(text, seconds)`: words, wpm, sentence length, type/token, B1 connectors, fillers) are guidance only, never a score. Transcripts: `answers['speaking:<id>']`; durations: `answers['speaking-dur:<id>']` (both archived per attempt).

## Writing checker (`features/exam/writing`, `core/writing`)

- Renderer `WritingPartView` serves `email`, `choice-task`, `short-message`, `opinion-essay`. `HighlightEditor` = native `<textarea>` over-laid by an `aria-hidden` backdrop in one grid cell (same font/padding/wrapping in `.layer`; the backdrop sets the height, so the box grows and never scrolls inside). Marks have transparent text and a coloured underline. Never add padding, border or font changes to `mark` or only to one layer, or the alignment breaks. `SuggestionsPanel` (Spelling / Grammar / Vocabulary, Apply / Ignore / Show), `TaskChecklist` (Task), `WritingRubric` (4 Cambridge criteria, 0-5 sliders, self-assessment only). Exam mode hides suggestions until submitted.
- The checker runs in a Web Worker (`core/writing/checker.worker.ts`, built through `webWorkerTsConfig` in `angular.json`; `tsconfig.worker.json`). The logic is in `checker-core.ts` (`CheckerCore`, testable without a worker): rules answer first (phase `rules`), then spelling with nspell once `assets/dictionaries/<en-GB|en-US>.aff|dic` is fetched lazily (not in the bundle; lazy asset group in `ngsw-config.json`; files copied from `dictionary-en` / `dictionary-en-gb`). `WritingCheckerService` (per component) debounces, ignores stale answers, and `remapIssues` shifts highlights while typing. Without Worker it runs rules only.
- Rules: `core/writing/rules.json` (generated once, now edited by hand). Fields: `id group(grammar|vocabulary) severity(error|note) category pattern flags message replacement map fixArticle bad good fixed`. Templates: `$1` group, `$m1` group looked up in `map`. `rules.spec.ts` runs every rule on `bad` (must flag), `good` (must not flag) and `fixed` (first suggestion applied), plus a false-positive text. To add a rule: append an entry with those three examples; keep severity `note` when the phrase can be correct. Capital letters live in `capitals.ts` (code, needs abbreviation handling).
- Task data: `contentPoints` on every writing task (`{ text, keywords[], question? }`, keywords are lower case, matched as word starts or phrases); `validate:exams` requires them. Settings: `spellingLang`, `nativeSpellcheck`, `languageTool` (default OFF; sends the text to api.languagetool.org, with a privacy warning in Settings).
- Answer keys: `writing-<n>` (text), `writing-<n>-type`, `writing-rubric:<partId>:<content|communication|organisation|language>` (0-5), `writing-check:<partId>` (JSON counts of the last check). `parts/writing-prompts.ts` has `writingSummary()` for Results and the PDF report.

## Export (`features/exam/export`)

- Results page card "Export": PDF "Full report" or "Answer sheet only" (+ optional annex with reading texts and listening scripts) and ZIP, for the attempt being viewed (current or archived). `ResultExportService` (root) gathers recordings (`AudioDbService`, key `<examId>:<attemptId>:<itemId>`), speaking pictures (`export-images.ts` downsizes to JPEG) and `studentName`, then dynamically imports `pdf-render` (pdfmake) and `zip-export` (fflate). Neither library is in the initial bundle (lazy chunks); keep it that way (no static import of `pdfmake`, `fflate`, `pdf-render` or `zip-export` outside `export/`).
- Layers: `report-model.ts` (pure data: `buildReportModel(input, options)` marks with `buildSectionReport`, `writingSummary`, `analyzeSpeech`, task checklist; `wrapLines` gives exact line numbers because the answer is laid out in monospace) -> `pdf-document.ts` (pure: `buildDocument(model)` returns a pdfmake definition; everything is vector: rings, bars, tick and cross icons, brush stroke; text always accompanies colour) -> `pdf-render.ts` (loads pdfmake, fonts and `rules.json`, runs `runRules` for the writing notes; spelling is not included).
- Fonts: pdfmake needs static fonts, so `assets/fonts/pdf/` has Bricolage Grotesque 400/700/800 and JetBrains Mono 400/700 (latin subset, `.woff` from @fontsource, OFL licences next to them), fetched only on export (lazy asset group in `ngsw-config.json`). `clean()` replaces glyphs outside that subset; draw symbols as vectors, never as text.
- ZIP: `exam.json`, `answers.json` (learner data, scores, writing, transcripts, recording paths, `allAnswers`), `results.pdf` (full report), `recordings/<partId>-<promptId>.<ext>`, `README.txt`. Time used and flagged items exist only for the current attempt (`session`).
- Page breaks: tables use `headerRows` + `keepWithHeaderRows` + `dontBreakRows`; cards are `unbreakable`; a heading is grouped with the block that follows it.

## Persistence

One localStorage key `learn-english:v1` (schemaVersion 2) = `{ schemaVersion, settings, progress: { [examId]: ExamProgress }, activity: string[], migrations }`. `ExamProgress` is the CURRENT attempt as flat fields `{ answers, results, startedAt, updatedAt, sectionStatus }` plus `session?: { skill, parts: {skill: partId}, flagged, checked, listens: {recordingKey: n}, elapsed: {skill: seconds} }` and `attempts: Attempt[]` (archived earlier tries `{ id, startedAt, finishedAt, answers, results, sectionStatus }`; `Retry` = `LocalStorageService.startNewAttempt()` moves the current attempt there and empties the current one). `results` is keyed by skill (`reading`, `listening`: `{ correct, total, completedAt }`); legacy migrated data may only have `objective`. `activity` lists local days (`YYYY-MM-DD`) with practice and feeds the streak. Answer keys added by speaking: `speaking-dur:<id>` (seconds recorded) and `speaking-topic:<partId>` (chosen topic). `LocalStorageService` is signal-based, debounces writes with an effect and reads with try/catch. To change the shape, bump `CURRENT_SCHEMA_VERSION` and add a step in `core/state-migrations.ts`. Answer keys inside `answers` keep the original format: item id (`r1-1`), `writing-1`, `writing-2`, `writing-2-type`, `speaking:<promptId>`. Recordings live in IndexedDB `learn-english-audio` keyed `<examId>:<attemptId>:<itemId>`; the current attempt id is `<examId>-<archivedAttempts+1>` (`currentAttemptId()`), so Retry keeps old recordings under the archived attempt id. Old two-part keys are renamed once to the current attempt (`AudioDbService.migrateKeysToAttempts`, flag `migrations.audioKeys`). Never rename exam or item ids that are already published.

## Adding an exam

Create the JSON under `src/assets/exams/<level>/<board>/`, run `npm run exams:index` and `npm run validate:exams`. If you change `src/app/models/exam.ts`, run `npm run schema:generate` first. New boards need an entry in `BOARD_INFO` (`scripts/lib/exam-files.mjs`) and a spec in `BOARD_SPECS` (`scripts/lib/board-rules.mjs`, documented with sources in `docs/exam-formats.md`). The skill `.claude/skills/b1-exam-author/` has the authoring rules.

## Validator v2 and images

- `npm run validate:exams [-- file.json]` runs schema, board shape (`scripts/lib/board-rules.mjs`, sources in `docs/exam-formats.md`), quality rules (`scripts/lib/quality-rules.mjs`: explanations everywhere, key distribution, listening scripts and speakers, images, vocabulary heuristic) and cross-exam checks. Errors fail, warnings print (`--strict` fails on them). Logic is tested by `npm run test:scripts` (node:test, `scripts/lib/exam-rules.test.mjs`).
- Speaking photos are real Wikimedia Commons images stored locally under `src/assets/images/exams/<examId>/` (1200 and 600 px WebP) with `image.credit`, `alt` and `describeHints`; add them with `node scripts/fetch-image.mjs` (licence whitelist in `scripts/lib/image-license.mjs`). `/credits` lists every photo. `docs/audit-2026.md` records the audit of the first five exams.

## Content rules

- All learner-facing content (UI and exams) is in English.
- Materials are original. Never copy or lightly rewrite official exam papers or copyrighted texts.
- Images need a local file plus a full credit (author, licence, licence URL, source URL).
- Speech recognition and automated writing feedback are practice aids, never presented as an official score.

## Deployment

GitHub Pages through `.github/workflows/deploy.yml`. Clean URLs: the build copies `index.html` to `404.html` (instead of hash routing); the base href is `/<repository-name>/`.
