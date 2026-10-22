# Grammar and vocabulary (`features/grammar`, `features/vocabulary`)

## Hub

`GrammarPage` (`/grammar`) shows the irregular verbs card, the vocabulary card and the grammar guides listed in `assets/grammar/guides/index.json`, grouped by level (B1 guides, then B1 to B2 guides) in teaching order.

## Guides (`assets/grammar/guides/<id>.json`)

One generic page, `GuidePage` (`/grammar/:guide`), renders every guide. Types are in `models/grammar.ts` (`GuideFile`, `GuideSection`, `GuideSummary`).

```
GuideFile    { id, title, level: 'B1'|'B2', intro, sources?: [{ label, url }], timeline?, sections }
GuideTimelineRow { section, label, shape, example, description }
GuideSection { id, level?, title, summary, tables, uses, signals, examples, mistakes, checks }
```

- `level` of a guide is the hardest level it reaches. A section marks itself `level: 'B2'` when it is harder than the rest of a B1 guide; the page shows a badge.
- `sources` are "Read more" links (mostly the British Council B1-B2 grammar pages). The text of the guides is original; only link a source, do not copy from it.
- To add a guide: create `guides/<id>.json`, add a line to `guides/index.json` (the order is the teaching order) and run `npm run validate:grammar`. No code changes are needed.
- Every section needs tables with equal row widths, at least one use, one example, one mistake (wrong and right must differ) and two checks.
- `timeline` (optional) shows the tenses of the guide on one past-now-future line above the sections (`TenseTimeline` in `guide/tense-timeline.ts`). Each row points to a section id (two rows may share one, for example will and going to), has a `label`, a short original `example` and a `description` (the text version of the drawing). `shape` is one of the named drawings in `guide/timeline-shapes.ts` (`habit`, `now-progress`, `past-point`, `past-progress`, `past-to-now`, `past-to-now-progress`, `before-past`, `past-habit`, `future-point`, `now-to-future`, `future-progress`, `before-future`). To add a shape, add it to `TimelineShape` in `models/grammar.ts`, to the marks in `timeline-shapes.ts` and to `TIMELINE_SHAPES` in `scripts/lib/grammar-rules.mjs`.

Current guides: verb forms, possessives and reflexives, questions and tags (B1); conditionals, adjectives, adverbs, phrasal verbs, linking words, verb patterns, relative clauses, modals, reported speech, more tenses (B2).

## Validation

`npm run validate:grammar` (rules in `scripts/lib/grammar-rules.mjs`, tests in `grammar-rules.test.mjs`) checks irregular verbs (unique ids and bases, one `{{past}}` / `{{participle}}` marker per sentence, regular verbs not in the list), every guide file, and that `index.json` and the guide files match.

## Irregular verbs

`irregular-verbs.json`: `{ id, base, past, participle, alt?: { past?, participle? }, example, exampleParticiple, note? }`. The pattern (AAA, ABA, ABB, ABC) is derived by `patternOf()`, not stored. Verb ids are progress keys: never rename them. `alt` holds extra accepted spellings (British and American forms).

Pages: `IrregularVerbsPage` (Glossary / Practice switch). Glossary: `VerbGlossary` (search, pattern filter, starred filter, spoken forms, table that stacks under 48 rem). Practice: `VerbPractice` (setup, 10-verb session, summary) with `TypeCard`, `GapCard`, `FlashCard` in `practice-cards.ts`.

Pure logic in `irregular-verbs/verb-engine.ts`: `isCorrectForm` (uses `normalizeAnswer`, accepts `alt`), gap helpers, `selectVerbs` (weighted: wrong answers raise the chance, known verbs lower it, no repeats, injectable `random`), `verbsToReview`.

Progress: `PersistedState.grammar.verbs[verbId] = { right, wrong, lastSeen, known, starred }`, written through `LocalStorageService.recordVerbResult / setVerbKnown / toggleVerbStar / resetGrammar`. Practice also adds the day to `activity` (streak). Feedback is a practice aid, never a score.

## Vocabulary list (`/vocabulary`)

`assets/vocabulary/b1-preliminary.json` holds the whole Cambridge B1 Preliminary and Preliminary for Schools Vocabulary List (August 2025): about 2,775 headwords.

```
{ source: { title, publisher, url }, topics: [{ id, name }], words: [{ w, p?, r?, t?, e? }] }
```

`w` headword, `p` part of speech as printed (`n`, `adj & adv`, `phr v`), `r` `Br`/`Am` when the list marks a regional form, `t` topic ids, `e` the first example phrase of the list (only where the list gives one).

- Topics come from Appendix 2 of the list. A word is in a topic when its headword (without brackets, split at `/`) appears in the topic list. About half of the words belong to no topic.
- `VocabularyPage` filters by text, topic, first letter and word type, shows 100 words at a time and links every word to `https://dictionary.cambridge.org/dictionary/english/<word>` (`dictionaryUrl()` in `vocabulary-engine.ts`: first alternative before `/`, brackets removed, spaces become hyphens).
- How the file was made: text and positions were extracted from the PDF page by page with the footer ("Page n of 53 ...") removed, the two columns read separately, example bullets attached to their headword, wrapped lines joined and duplicates removed. If Cambridge publishes a new edition, repeat that process and replace the file. Do not hand-edit single words unless the list itself is wrong.
