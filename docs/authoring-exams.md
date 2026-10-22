# Writing and reviewing exams

The data contract is `src/app/models/exam.ts` (schema v2). `src/assets/exams/b1/cambridge-pet/cambridge-pet-01.json` is a complete audited example. The paper shape of each board, with sources, is in [exam-formats.md](exam-formats.md) and is enforced by `npm run validate:exams` (`scripts/lib/board-rules.mjs`).

Only Cambridge B1 Preliminary (`cambridge-pet`) is offered in the UI. The other boards stay in the schema and validators for later.

## Why this workflow exists (token cost)

A full exam is about 70 KB of JSON (about 18,000 tokens). The old way (write the whole file, validate, reread it all to solve it blind, view eight preview images per photo) cost about 300,000 tokens to write and 300,000 to test, with almost no prompt-cache reuse because every step read different big files. The workflow below keeps each step small:

| Old habit                                   | Now                                                                                          | Saving    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | --------- |
| Read `content-plan` (69 KB) and other exams | `exam-tools brief <board>` prints the paper shape and used themes in about 1 KB              | about 20k |
| Edit one 65 KB file again and again         | `split` / `build`: one file per skill (6 to 25 KB), edit only the skill you work on          | about 50% |
| Reread the whole exam to solve it blind     | `sheet` prints the exam without keys (minified), `grade` prints only the items that disagree | about 60% |
| 8 preview JPEGs per photo search            | one contact sheet (`contact-sheet.jpg`, 4 x 2 thumbnails), final preview 480 px              | about 80% |
| Long skill text loaded in every agent       | short skill + this document; read only the sections that you need                            | steady    |

Rules for agents that keep the cache useful:

1. Keep the stable text first and identical between calls: the same short brief, then the part that changes. Do not paste the exam into prompts; give the file path.
2. One agent per skill file (`reading`, `listening`, `writing`, `speaking`). They share only `header.json` and the brief.
3. Never read a whole exam to check one item. Use `validate:exams -- <file>` output, which names the part and the item.
4. Fix in place with small edits instead of rewriting a section.
5. Look at images once: the contact sheet to choose, the 480 px preview to confirm.

## Tools

`node scripts/exam-tools.mjs <command>`:

```
brief <board> [--names]      paper shape, themes already used, key-letter totals
split <examId>               exam -> work/<examId>/header.json + <skill>.json
build <examId>               work/<examId>/* -> src/assets/exams/<level>/<board>/<examId>.json
rebalance <examId>           spread the multiple-choice keys over A, B, C (and D) in work/<examId>
longkeys <examId>            list multiple-choice items whose key is the longest option
sheet <examId> [skill]       the exam without answer, accepted and explanation fields
grade <examId> <file.json>   compare {itemId: answer} with the keys; prints only the disagreements
```

`scripts/lib/exam-builders.mjs` has compact builders (`notices`, `matching`, `multipleChoice`, `gappedText`, `cloze`, `openCloze`, `clip`, `shortDialogues`, `gistDialogues`, `noteCompletion`, `interview`, `writing`, `speaking`, `save`). Items are arrays (`[prompt, options, answerIndex, explanation]`) instead of repeated object keys, which saves about 40% of the output tokens. A test (`exam-builders.test.mjs`) proves that they reproduce a published exam exactly.

`work/` is ignored by git. `header.json` holds the exam header and `sectionOrder`.

### Fast path for a whole exam

1. Write one author script in `work/` (not committed) that imports the builders and ends with `save('<examId>', { title, subtitle, theme }, reading(...), writing(...), listening(...), speaking(...))`. Run it with `node`.
2. `rebalance <examId>`: you do not have to balance the key letters by hand, write the key in any position. Do not put "all of the above" or a letter in an explanation, because options move.
3. Write distractors as long as the key, and put at least one word of the key in the script (the validator warns about both). `longkeys <examId>` shows which items still need work.
4. `build <examId>`, `npm run exams:index`, `npm run validate:exams -- <file>`. Fix warnings with small string patches on the work files, then `build` again.
5. Photos last (they are written into the built JSON). After this step edit the built JSON only, or `split` it again, or `build` will remove the photos.

## Workflow

1. `node scripts/exam-tools.mjs brief cambridge-pet`. Pick a theme, names and photo topics that are not used. Check `docs/exam-formats.md` only if the board is not Cambridge.
2. Write the exam with the builders (see the fast path) or copy `split cambridge-pet-01` into `work/<newId>/` and rewrite the skills one by one. Start with reading, then listening.
3. `build <newId>`, then `npm run exams:index` and `npm run validate:exams -- <file>`. Fix errors first, then warnings.
4. Photos (see below).
5. Blind solve (one skill at a time, only reading and listening):
   1. `sheet <newId> reading` and read it as a candidate. Write your answers to `work/answers.json` as `{"r1-1": 1, ...}` (choice = zero-based option index, gaps = text or letter, true/false as `"true"`/`"false"`).
   2. `grade <newId> work/answers.json`. Each item that disagrees has two defensible answers or a wrong key: change the item, do not argue with the key.
6. Final checks: `npm run validate:exams`, `npm run lint`, `npm test`, `npm run build`.
7. Report the theme, vocabulary covered, photos with licences and any doubts.

## Files and ids

- One file per exam: `src/assets/exams/b1/<board>/<board>-NN.json`, `id` equal to the file name (for example `cambridge-pet-16`). Never change a published id: learner progress is stored by exam, part and item id.
- Header: `schemaVersion: 2`, `id`, `level: "B1"`, `board`, `title`, `subtitle`, `theme`, `estimatedMinutes`, `sections[]`.
- A section has `skill`, `timeLimitMinutes` and `parts[]`. A part has `id` (`<skill>-<n>`), `number`, `title`, `instructions` and a discriminating `type`. Item ids are unique in the exam: new exams use `r<part>-<item>` for reading and `l<part>-<recording>-<item>` for listening. `ChoiceQuestion.answer` is a zero-based option index; gapped-text, heading and matching keys are letters.
- New board: add it to `BOARD_INFO` (`scripts/lib/exam-files.mjs`) and `BOARD_SPECS` (`scripts/lib/board-rules.mjs`), document the spec and its source in `exam-formats.md`, add a test in `scripts/lib/exam-rules.test.mjs`, and add a segment to `FORMATS` in `features/level/level-page.ts`.

## Cambridge B1 Preliminary shape

- Reading 6 parts: notices (5), matching (5 people, 8 texts), multiple-choice (5), gapped-text (5 gaps, 6 sentences), multiple-choice-cloze (6, FOUR options), open-cloze (6).
- Writing: email (4 content points) + choice of article or story (a story gives the exact opening sentence). About 100 words each.
- Listening 7 + 6 + 6 + 6 items (3 options; note completion is one word). Each recording is heard twice.
- Speaking: interview, one photo, collaborative task with 4 or more photos, discussion.
- Cambridge marks Writing with four criteria (content, communicative achievement, organisation, language; 0 to 5). The app gives coaching, never an official score.

## Quality rules (the validator checks them)

Errors (fail CI): unique ids; valid answer indexes; an `explanation` on every question, gap and statement (one or two sentences that quote or point at the text or script, never "option A"); open cloze answers of one word; note completion answers present in the script; distinct matching keys; speakers that are single people with turns for each person; images with file, alt, 3 to 5 `describeHints`, full credit and a whitelisted licence; no text copied between exams.

Warnings (fix them unless there is a reason): one key letter above 45% or four equal keys in a row; the key is the longest option in half of the questions; a keyword of the question appears only in the key; the listening key is not found in the script; voices without gender or without accent variety (en-GB, en-US, en-AU, en-IE); names or themes repeated in other exams; vocabulary above B1 (heuristic).

Rules that the machine cannot check:

- Write fresh notices, messages, articles, stories, interviews and monologues. Never copy or lightly rewrite official tasks or copyrighted texts.
- Target B1 everyday communication: personal, social, travel, study, work, health, leisure, shopping, transport, food, environment. The Cambridge vocabulary list (also in the app at `/vocabulary`) is a guide, not a whitelist.
- One defensible key per item. For each gap and question ask whether a competent B1 candidate could choose another option or word. If yes, change the item or add the equivalent to `accepted`. Typical traps: verbs that also fit the gap (get/make/take a trip), prepositions with several correct options, comparatives that are also correct, extra sentences that fit another gap.
- Distractors are plausible and parallel in length and grammar. No "all/none of the above". The key is not conspicuously longer and does not hold the only keyword of the stem.
- Gapped text: each sentence depends on its neighbours through reference, linking or time. The extra sentence fits no gap.
- Every part and passage title describes its own content.
- Listening: each recording lists `speakers` (id, name, `voice.lang`, `voice.gender`) and `turns`. Each person has their own speaker with a different voice. Scripts sound spoken (contractions, short turns). A note-completion prompt must not show its answer.
- Speaking photo prompts describe what the photo really shows.
- Writing: audience, purpose, `notes`, `contentPoints` (2 or more lower-case keywords each), approximate length; stories need an exact `openingSentence`.

## Photos (Wikimedia Commons only)

Licences: CC0, public domain, CC BY, CC BY-SA. No Google Images, Unsplash or Pexels.

1. Put a visual in the exam JSON (`id`, `title`, `alt`) without an image.
2. Search: `node scripts/fetch-image.mjs search "people cooking outdoors" --limit 8 --out work/img`. Read the text list (licence, size, author, page, description) and look at `work/img/contact-sheet.jpg` once; the numbers match.
3. Check one candidate without writing: `node scripts/fetch-image.mjs <Commons file URL> --exam <examId> --visual <visualId> --dry` (writes a 480 px preview).
4. Run without `--dry` and add `--alt "..." --hints "a;b;c"` (3 to 5 hints). It verifies the licence, saves `src/assets/images/exams/<examId>/<visualId>-1200.webp` (1000 px) and `-600.webp` (480 px) and writes `image`, `credit`, `alt` and `describeHints`.
5. Accept the photo only if people, place and activity can be described with B1 vocabulary, there is no dominant text or logo, no identifiable minors and nothing sensitive. Otherwise delete the files and the JSON image.
6. Update the part `prompt` to match what the photo shows.
