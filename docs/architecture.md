# Architecture

## Folder layout

```
src/app/
  core/       storage (one localStorage document + migrations), settings, theme, install, speech (TTS), audio-db (IndexedDB), writing checker
  data/       exam catalogue and grammar catalogue services (lazy JSON loading), exam topic groups (name and icon)
  models/     exam.ts (schema v2, source of truth), grammar.ts, vocabulary.ts, storage.ts (persisted state)
  features/   home, level (/exams/b1), progress, exam, grammar, vocabulary, flashcards, phrasal-verbs, reader, settings, credits
  shared/ui/  design-system components (import from 'shared/ui')
src/assets/
  exams/<level>/<board>/<id>.json   exam data; <level>/index.json is generated
  grammar/                          irregular-verbs.json, guides/*.json, guides/index.json
  vocabulary/                       b1-preliminary.json, flashcards.json, phrasal-verbs.json
  reader/                           index.json, stories/<id>.json (graded reader)
  images/exams/<examId>/            speaking photos (WebP)
  dictionaries/, fonts/pdf/         lazy assets (spelling checker, PDF fonts)
scripts/      validators, generators and authoring tools (see authoring-exams.md)
```

## Routes

`/`, `/exams` (redirects to `/exams/b1`), `/exams/b1`, `/exams/b1/:board/:examId/(reading|writing|listening|speaking|mediation|results)`, `/grammar`, `/grammar/irregular-verbs`, `/grammar/:guide`, `/vocabulary` (redirects to `/vocabulary/b1`), `/vocabulary/b1`, `/vocabulary/flashcards`, `/vocabulary/phrasal-verbs`, `/reader`, `/reader/:story`, `/settings`, `/credits`.

Routes are lazy (`loadComponent`). `withComponentInputBinding()` and `paramsInheritanceStrategy: 'always'` pass route params and route data to child components as `input()`s (for example `guide` in `GuidePage`).

## Shell

Sticky header, one `<nav aria-label="Main">` that becomes a fixed bottom bar under 48 rem (safe-area aware, and kept clear of rounded screen corners with `--corner-inset`, see tokens.css), main landmark `#main`. Pages wrap their content in `<div class="container page">`. The nav has five links: Home, B1 exams, Grammar, Words (vocabulary), Settings.

## Data loading

Static JSON is loaded with `httpResource` through `ExamCatalogueService`, `GrammarCatalogueService` and `PracticeCatalogueService` (flashcards, phrasal verbs, stories). Nothing is bundled: every file is a separate request, cached by the service worker. The vocabulary page loads `assets/vocabulary/b1-preliminary.json` the same way.

## Level page filters

`/exams/b1` lists exams by board. The format filter shows only the boards that exist as content (`FORMATS` in `features/level/level-page.ts`: All formats, Cambridge). Add a segment there when a new board gets real exams.
