# Writing checker (`features/exam/writing`, `core/writing`)

## Editor and panels

Renderer `WritingPartView` serves `email`, `choice-task`, `short-message` and `opinion-essay`.

- `HighlightEditor`: a native `<textarea>` over-laid by an `aria-hidden` backdrop in one grid cell (same font, padding and wrapping in `.layer`; the backdrop sets the height, so the box grows and never scrolls inside). Marks have transparent text and a coloured underline. Never add padding, border or font changes to `mark` or to only one layer, or the alignment breaks.
- `SuggestionsPanel` (Spelling / Grammar / Vocabulary, Apply / Ignore / Show), `TaskChecklist` (Task), `WritingRubric` (the 4 Cambridge criteria, 0 to 5 sliders, self-assessment only).
- Exam mode hides suggestions until the section is submitted.

## Checker

It runs in a Web Worker (`core/writing/checker.worker.ts`, built through `webWorkerTsConfig` in `angular.json`; `tsconfig.worker.json`). The logic is in `checker-core.ts` (`CheckerCore`, testable without a worker): rules answer first (phase `rules`), then spelling with nspell once `assets/dictionaries/<en-GB|en-US>.aff|dic` is fetched lazily (not in the bundle; lazy asset group in `ngsw-config.json`; files copied from `dictionary-en` and `dictionary-en-gb`).

`WritingCheckerService` (per component) debounces, ignores stale answers, and `remapIssues` shifts highlights while typing. Without `Worker` it runs the rules only.

## Rules

`core/writing/rules.json` (generated once, now edited by hand). Fields: `id group(grammar|vocabulary) severity(error|note) category pattern flags message replacement map fixArticle bad good fixed`. Templates: `$1` group, `$m1` group looked up in `map`.

`rules.spec.ts` runs every rule on `bad` (must flag), `good` (must not flag) and `fixed` (first suggestion applied), plus a false-positive text. To add a rule, append an entry with those three examples and keep severity `note` when the phrase can be correct. Capital letters live in `capitals.ts` (code, needs abbreviation handling).

## Task data

`contentPoints` on every writing task (`{ text, keywords[], question? }`; keywords are lower case, matched as word starts or phrases); `validate:exams` requires them. Settings: `spellingLang`, `nativeSpellcheck`, `languageTool` (default OFF; sends the text to api.languagetool.org, with a privacy warning in Settings).

## Answer keys

`writing-<n>` (text), `writing-<n>-type`, `writing-rubric:<partId>:<content|communication|organisation|language>` (0 to 5), `writing-check:<partId>` (JSON counts of the last check). `parts/writing-prompts.ts` has `writingSummary()` for Results and the PDF report.
