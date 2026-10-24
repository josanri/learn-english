# Daily practice: flashcards, phrasal verbs, graded reader

Three short activities for every day, outside the exams. All content is original (definitions, example sentences and stories were written for this app). Progress lives in `PersistedState.practice` (see persistence.md).

| Route                       | Page                                              | Content file                                                               |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| `/vocabulary/flashcards`    | `features/flashcards/flashcards-page.ts`          | `assets/vocabulary/flashcards.json` (about 520 cards)                      |
| `/vocabulary/phrasal-verbs` | `features/phrasal-verbs/phrasal-verbs-page.ts`    | `assets/vocabulary/phrasal-verbs.json` (about 180)                         |
| `/reader`, `/reader/:story` | `features/reader/reader-page.ts`, `story-page.ts` | `assets/reader/index.json`, `assets/reader/stories/<id>.json` (40 stories) |

Files are loaded with `httpResource` through `PracticeCatalogueService`. Home, `/vocabulary/b1` and `/grammar` link to the three pages.

## Flashcards (spaced repetition)

`flashcards.json`: `{ topics: [{ id, name }], cards: [{ id, w, p, t, d, e }] }` — word, part of speech, topic id, definition, example. Topic ids are the B1 list topics plus `general`. Card ids are progress keys: never rename them.

The schedule is in `features/flashcards/srs.ts` (pure functions, tested in `srs.spec.ts`). It is a simplified SM-2 with learning steps, close to Anki's defaults:

| Card state            | Again                      | Hard                  | Good                      | Easy                         |
| --------------------- | -------------------------- | --------------------- | ------------------------- | ---------------------------- |
| New / learning step 1 | 1 min                      | 6 min                 | 10 min (step 2)           | 4 days (graduates)           |
| Learning step 2       | 1 min                      | 15 min                | 1 day (graduates)         | 4 days                       |
| Review (interval _i_) | 10 min, relearn, _i_ × 0.3 | _i_ × 1.2, ease −0.15 | _i_ × ease (2.5 at start) | _i_ × ease × 1.3, ease +0.15 |

- A typical card answered "Good" every time comes back after 1, 3, 8, 20, 50 and 125 days. Late answers get credit for the extra days (`(i + overdue / 2) × ease`).
- Intervals of three days or more get about ±5 % random spread (`fuzz`) so cards learnt together do not all return on the same day. Ease never goes below 1.3; intervals are capped at ten years.
- `buildQueue` shows learning cards that are due, review cards due before the end of the local day and new cards up to the daily limit (`newPerDay`, default 10; the "Learn 5 more" button adds to it for the visit). `nextCard` mixes one new card after every three reviews and shows a learning card up to 20 minutes early when nothing else is left.
- New cards are ordered by a stable hash of their id, so the topics are mixed. The "New words from" filter only changes which new cards are introduced.
- Keys: Space or Enter shows the answer, 1–4 grade it.
- Saved per card: `CardState { status, step, ease, interval, due, reps, lapses, last, added }`. A card without a record is new. `added` (local day) counts towards the daily limit.

## Phrasal verbs

`phrasal-verbs.json`: `{ groups: [{ id, name }], verbs: [{ id, verb, meaning, example, group, similar? }] }`. The example marks the words of the phrasal verb with `[[ ]]`, also when they are separated: `Please [[turn]] the music [[down]].` A verb with two meanings has two entries (`take-off`, `take-off-2`). `similar` lists ids that mean nearly the same (`look-out` / `watch-out`); they are never offered as wrong answers.

Engine: `features/phrasal-verbs/phrasal-engine.ts`.

- Exercises: **Meaning** (verb → meaning), **Complete the sentence** (gap → base form) and **Missing particle** (the verb stays, the particles are blanked). Mixed sessions rotate the three.
- `choicesFor` builds four options. Wrong options never include another sense of the same verb or a `similar` entry. In the particle exercise, a particle that would make another real phrasal verb with the same head (`turn on` → not `off`) is never offered.
- Sessions have 12 verbs picked by weight (`phrasalWeight`): new and missed verbs more often, learnt verbs (three right in a row) less.
- Saved per verb: `PhrasalProgress { right, wrong, lastSeen, streak }`.

## Graded reader

`index.json` lists `{ id, title, summary, topic, level, words }`; each story file repeats those fields and adds `paragraphs`, `glossary` and `questions`. Levels are `A2+`, `B1` and `B1+` (150–600 words).

- Paragraphs mark glossed words as `{{word}}`, or `{{shown text|key}}` when the text differs from the glossary key (`{{hidden|hide}}`). Keys are lowercase. Tapping a word opens its meaning inline; the full list is at the end of the story.
- "Listen to the story" reads the title and paragraphs with `SpeechService.speakText` and highlights the paragraph being read.
- Questions are multiple choice (three or four options, one `answer`, an `explanation`). When all are answered, `finishStory` saves `{ finishedAt, correct, total }` and the page offers the next unread story.
- `storyOfTheDay` picks the first unread story from a starting point that moves every day.

## Adding content

1. Edit the JSON file (or add `assets/reader/stories/<id>.json` and its line in `index.json`, with `words` equal to the word count of the paragraphs without markers).
2. Run `npm run validate:practice`. It checks ids, topics and groups, that every card example uses its word, that phrasal verb markers match the particles, that every glossed word has a meaning and every glossary entry is used, word counts and questions.
3. Keep the language at B1: short sentences, common words, and gloss anything above the level.
