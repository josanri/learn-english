# Daily practice: flashcards, phrasal verbs, basic vocabulary, speaking kit, graded reader

Short activities for every day, outside the exams. All content is original (definitions, example sentences and stories were written for this app). Progress lives in `PersistedState.practice` (see persistence.md).

| Route                                           | Page                                              | Content file                                                               |
| ----------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| `/vocabulary/flashcards`                        | `features/flashcards/flashcards-page.ts`          | `assets/vocabulary/flashcards.json` (about 520 cards)                      |
| `/vocabulary/phrasal-verbs`                     | `features/phrasal-verbs/phrasal-verbs-page.ts`    | `assets/vocabulary/phrasal-verbs.json` (250 in 10 groups)                  |
| `/reader`, `/reader/:story`                     | `features/reader/reader-page.ts`, `story-page.ts` | `assets/reader/index.json`, `assets/reader/stories/<id>.json` (40 stories) |
| `/vocabulary/basic`, `/vocabulary/basic/:topic` | `features/basic-vocabulary/`                      | `assets/vocabulary/basic-vocabulary.json` (28 topics, 915 words)           |
| `/practice/speaking`                            | `features/speaking-kit/speaking-kit-page.ts`      | `assets/speaking/speaking-kit.json` (56 questions)                         |

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
- Saved per verb: `PhrasalProgress { right, wrong, lastSeen, streak }`. A wrong answer also puts the verb into "My mistakes".

## Graded reader

`index.json` lists `{ id, title, summary, topic, level, words }`; each story file repeats those fields and adds `paragraphs`, `glossary` and `questions`. Levels are `A2+`, `B1` and `B1+` (150–600 words).

- Paragraphs mark glossed words as `{{word}}`, or `{{shown text|key}}` when the text differs from the glossary key (`{{hidden|hide}}`). Keys are lowercase. Tapping a word opens its meaning inline; the full list is at the end of the story.
- "Listen to the story" reads the title and paragraphs with `SpeechService.speakText` and highlights the paragraph being read.
- Questions are multiple choice (three or four options, one `answer`, an `explanation`). When all are answered, `finishStory` saves `{ finishedAt, correct, total }` and the page offers the next unread story.
- `storyOfTheDay` picks the first unread story from a starting point that moves every day.

## Basic vocabulary

`basic-vocabulary.json`: `{ topics: [{ id, name, intro, icon, img, phrases }], words: [{ id, w, t, g, d, e, img, similar? }] }` — word, topic id, group label inside the topic, definition, example. The example marks the word once with `[[ ]]` and the marked text is the word itself (`She wore a red [[dress]].`). `icon` is a key of `shared/ui/icon.ts`. Word ids are progress keys: never rename them. The topics come from everyday speaking themes (clothes, appearance, town, directions, house, food, family, work, bookings, weather, transport, feelings, the body, health, school, shopping, technology, nature, daily actions and others).

- Pictures: every word has one full-colour drawing, `assets/images/basic/<id>.svg` (original drawings, so no credit is needed). The word list shows it as a plain `<img>` on a white paper tile (`--paper-white`, the same in both themes), so the colours are made for a light ground and look the same in light and dark mode. Style: viewBox 48, ink outlines `#2b3445` about 2 units wide with round caps and joins, flat fills from one shared palette of mid-saturation hues, a slightly darker tone of the same hue for shading. Nothing may leave the 48 box (strokes included). There is no separate colour layer any more: the validator rejects a `fill` field.
  - People use one clean minimal flat style everywhere (smooth circular head, rounded shoulders, sleek hair shapes, simple dot eyes and smile, without separate neck or ear outlines). Skin and hair tones vary naturally. Body and personality words are shown respectfully: normal proportions, a friendly or neutral face, the trait shown by build or by a situation (a person keeping a whole jar of biscuits for "selfish", a cross speech bubble for "rude"), never by a caricature. Feelings use classic round emoji faces. Family words draw the person the word names in colour and the people that explain the relation as gender-neutral faded silhouettes.
  - Countries are the flag alone, drawn from the official proportions, colours and emblem layout (coats of arms simplified but complete: Spain, Mexico, Portugal, Egypt, Brazil, Argentina, Wales and others). Nationalities use the same flag on a pole next to the same neutral person for every country, so no nationality is stereotyped. Cities show a well-known landmark.
  - Colour words use one paint-splash shape with a brush, so only the colour changes; pattern words use the same T-shirt with the pattern clipped to it.
- A word with an empty `img` shows a dashed slot with the topic icon. The validator checks that each `img` file exists.
- Pages: the topic list with the learnt count of each topic, and a topic page with **Learn** (`basic-word-list.ts`: words by group, listen buttons, model sentences) and **Practice**.
- Exercises (`basic-engine.ts`): **Choose the word** (definition → word), **Meaning** (word → definition), **Complete the sentence** (the gap shows the definition as a clue, because many words of one topic fit the same sentence), **Listen** (the speech voice says the word; hidden when the browser cannot speak) and **Spell it** (type the word; case, spaces, hyphens, apostrophes and accents do not count). Mixed sessions rotate them.
- Wrong options come from the same group first, then the same topic. They never include the word itself or a `similar` entry, in either direction.
- Sessions have 10 words, picked with the phrasal verb weights. Saved per word in `practice.basic`, with the same counters as the phrasal verbs (three right in a row = learnt).

## Speaking kit

`speaking-kit.json`: `{ steps, example, phraseGroups, topics: [{ id, name, questions: [{ id, q, model }] }], checklist: [{ id, text, link? }] }`. All text is original.

- The page shows the four-step answer (answer, explain, example, finish) and three sections: **Questions** (a random question of a topic, read aloud on request, with a model answer to compare after the learner speaks), **Phrases** (connectors, time to think, opinions, agreeing, asking for help, preferences, describing a photo) and **Checklist**.
- The model answers are examples, not a score. Nothing is recorded or marked here.
- Ticked checklist ids are saved in `practice.checklist`. Checklist ids are progress keys: never rename them.

## My mistakes (`/practice/mistakes`)

`features/mistakes/`: `mistake-queue.ts` (pure: due, counts, grading), `mistake-card.ts` (pure: the card of an exam item), `mistakes-page.ts`.

- In: wrong answers of a submitted Reading or Listening section (empty answers count only in the score), wrong answers in the phrasal verb trainer, and the backfill of results saved before schema version 5.
- Schedule: `srs.schedule`; a right answer counts as Good and a wrong one as Again. An item whose interval reaches 21 days (`MATURE_INTERVAL`) is fixed and leaves the queue. Due items come oldest first; items of one submit are mixed by a stable hash of the id.
- Cards: multiple-choice cloze and open cloze show the sentence of the gap with the other gaps filled in (`gapContext`); notices show the notice. The learner answers and the app marks it. Other items show the question (matching: what the person wants) and "Open this part" (`?part=`); the learner then says if they got it right. Phrasal verbs ask for the meaning.
- A session has up to 15 items. An item whose exam or verb no longer exists is removed.

## Adding content

1. Edit the JSON file (or add `assets/reader/stories/<id>.json` and its line in `index.json`, with `words` equal to the word count of the paragraphs without markers).
2. Run `npm run validate:practice`. It checks ids, topics and groups, that every card example uses its word, the basic vocabulary markers, icons and definitions (a definition must not contain its word), the speaking kit questions and checklist links, that phrasal verb markers match the particles, that every glossed word has a meaning and every glossary entry is used, word counts and questions.
3. Keep the language at B1: short sentences, common words, and gloss anything above the level.
