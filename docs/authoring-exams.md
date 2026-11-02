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
split <examId>               exam -> work/<examId>/header.json + <skill>.json (cloze tags removed; run exams:tag-cloze after build)
build <examId>               work/<examId>/* -> src/assets/exams/<level>/<board>/<examId>.json
rebalance <examId>           spread the multiple-choice keys over A, B, C (and D) in work/<examId>
longkeys <examId>            list multiple-choice items whose key is the longest option
sheet <examId> [skill]       the exam without answer, accepted and explanation fields
grade <examId> <file.json>   compare {itemId: answer} with the keys; prints only the disagreements
```

`scripts/lib/exam-builders.mjs` has compact builders (`notices`, `matching`, `multipleChoice`, `gappedText`, `cloze`, `openCloze`, `clip`, `shortDialogues`, `gistDialogues`, `noteCompletion`, `interview`, `writing`, `speaking`, `save`). Items are arrays (`[prompt, options, answerIndex, explanation]`) instead of repeated object keys, which saves about 40% of the output tokens. A test (`exam-builders.test.mjs`) proves that they reproduce a published exam exactly.

`work/` is ignored by git. `header.json` holds the exam header and `sectionOrder`.

### Fast path for a whole exam

1. Write one author script in `work/` (not committed) that imports the builders and ends with `save('<examId>', { title, subtitle, theme, category }, reading(...), writing(...), listening(...), speaking(...))`. Run it with `node`.
2. `rebalance <examId>`: you do not have to balance the key letters by hand, write the key in any position. Do not put "all of the above" or a letter in an explanation, because options move.
3. Write distractors as long as the key, and put at least one word of the key in the script (the validator warns about both). `longkeys <examId>` shows which items still need work.
   3b. `npm run audit:answer-order` must stay green: the keys of a part must not rise in order (A A B C C, A B C D E). `rebalance` seeds from the exam id, so it is safe. In matching (Reading part 2) write at least two persons with a similar wrong text: it shares a detail with the person (topic, place, activity) and fails on another detail (day, age, price, level).
4. `build <examId>`, `npm run exams:index`, `npm run validate:exams -- <file>`. Fix warnings with small string patches on the work files, then `build` again.
5. Photos last (they are written into the built JSON). After this step edit the built JSON only, or `split` it again, or `build` will remove the photos.

## Workflow

1. `node scripts/exam-tools.mjs brief cambridge-pet`. Pick a theme, names and photo topics that are not used. Pick the `category` (topic group) of the theme. Check `docs/exam-formats.md` only if the board is not Cambridge.
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
- Header: `schemaVersion: 2`, `id`, `level: "B1"`, `board`, `title`, `subtitle`, `theme`, `category`, `estimatedMinutes`, `sections[]`.
- `category` is one of the topic groups in `ExamCategory` (`src/app/models/exam.ts`): `animals`, `nature`, `environment`, `travel`, `transport`, `sport`, `health`, `food`, `home`, `people`, `study`, `arts`, `entertainment`, `science`, `games`, `shopping`, `history`, `misc`. The level page shows its icon next to the theme. Use `misc` only when no other group fits. A new group needs a row in `src/app/data/exam-categories.ts` and an icon in `icon.ts`.
- A section has `skill`, `timeLimitMinutes` and `parts[]`. A part has `id` (`<skill>-<n>`), `number`, `title`, `instructions` and a discriminating `type`. Item ids are unique in the exam: new exams use `r<part>-<item>` for reading and `l<part>-<recording>-<item>` for listening. `ChoiceQuestion.answer` is a zero-based option index; gapped-text, heading and matching keys are letters.
- New board: add it to `BOARD_INFO` (`scripts/lib/exam-files.mjs`) and `BOARD_SPECS` (`scripts/lib/board-rules.mjs`), document the spec and its source in `exam-formats.md`, add a test in `scripts/lib/exam-rules.test.mjs`, and add a segment to `FORMATS` in `features/level/level-page.ts`.

## Cambridge B1 Preliminary shape

- Reading 6 parts: notices (5), matching (5 people, 8 texts), multiple-choice (5, FOUR options), gapped-text (5 gaps, 8 sentences: three are extra), multiple-choice-cloze (6, FOUR options), open-cloze (6).
- Writing: email (4 content points) + choice of article or story (a story gives the exact opening sentence). About 100 words each.
- Listening 7 + 6 + 6 + 6 items (3 options; note completion takes one or two words, a number, a date or a time). Each recording is heard twice.
- Speaking: interview, one photo, collaborative task with 4 or more photos, discussion.
- Cambridge marks Writing with four criteria (content, communicative achievement, organisation, language; 0 to 5). The app gives coaching, never an official score.

## Quality rules (the validator checks them)

Errors (fail CI): unique ids; valid answer indexes; an `explanation` on every question, gap and statement (one or two sentences that quote or point at the text or script, never "option A"); open cloze answers of one word; a known grammar tag (`tags`, see `GrammarTag` in `models/exam.ts`) on every open cloze gap and multiple-choice cloze question; note completion answers present in the script; distinct matching keys; speakers that are single people with turns for each person; images with file, alt, 3 to 5 `describeHints`, full credit and a whitelisted licence; no text copied between exams.

Warnings (fix them unless there is a reason): one key letter above 45% or four equal keys in a row; the key is the longest option in half of the questions; a keyword of the question appears only in the key; the listening key is not found in the script; voices without gender or without accent variety (en-GB, en-US, en-AU, en-IE); names or themes repeated in other exams; vocabulary above B1 (heuristic).

Rules that the machine cannot check:

- Write fresh notices, messages, articles, stories, interviews and monologues. Never copy or lightly rewrite official tasks or copyrighted texts.
- Target B1 everyday communication: personal, social, travel, study, work, health, leisure, shopping, transport, food, environment. The Cambridge vocabulary list (also in the app at `/vocabulary/b1`) is a guide, not a whitelist.
- One defensible key per item. For each gap and question ask whether a competent B1 candidate could choose another option or word. If yes, change the item or add the equivalent to `accepted`. Typical traps: verbs that also fit the gap (get/make/take a trip), prepositions with several correct options, comparatives that are also correct, extra sentences that fit another gap.
- Distractors are plausible and parallel in length and grammar. No "all/none of the above". The key is not conspicuously longer and does not hold the only keyword of the stem.
- Gapped text: each sentence depends on its neighbours through reference, linking or time. No extra sentence fits a gap, and at least one extra sentence is on the same topic as a gap.
- Every part and passage title describes its own content.
- Listening: each recording lists `speakers` (id, name, `voice.lang`, `voice.gender`) and `turns`. Each person has their own speaker with a different voice. Scripts sound spoken (contractions, short turns). A note-completion prompt must not show its answer.
- Speaking photo prompts describe what the photo really shows.
- Listening difficulty: follow the next section.
- Writing: audience, purpose, `notes`, `contentPoints` (2 or more lower-case keywords each), approximate length; stories need an exact `openingSentence`.

## Listening difficulty

These rules come from a study of the 2022 Cambridge sample paper (its shape and technique, not its content). A candidate must listen to the whole recording: the answer is never the first thing that they hear, and the key words of the options are all in the script. The validator warns about script length (`scriptWords` in `board-rules.mjs`) and about Part 1 options that the script does not mention.

Length (words of each recording):

| Part | Recording                             | Words   | Turns                                   |
| ---- | ------------------------------------- | ------- | --------------------------------------- |
| 1    | dialogue or monologue, one per item   | 70-130  | 6-10 in a dialogue                      |
| 2    | dialogue of two friends, one per item | 70-130  | 6-10                                    |
| 3    | monologue (talk, radio, guide)        | 260-400 | one turn                                |
| 4    | interview, six questions              | 380-560 | short questions, answers of 50-80 words |

All parts:

- About half of the Part 1 clips are monologues: an announcement, a phone message, a radio or shop advert, a talk by a guide. The rest are dialogues. Part 2 is always a dialogue between two people who know each other.
- Start with one or two turns of context that do not answer the question.
- Use natural spoken English: fillers (well, I mean, actually, I guess), short replies (Oh no!, Really?), self-correction (I nearly did... but in the end), questions back to the other speaker.
- Never repeat the words of the key option in the script. Paraphrase the key (an assistant was kind and gave advice → the staff are helpful). The words of the distractors can be heard as they are written.
- Put the key in any position in the script, often after a distractor and before another one. Never put it always last.
- Signal the change with contrast words (but, though, actually, in the end, instead, before that) and not with emphasis.

Part 1 (detail, three options):

- Mention all three options in the script. The two distractors are rejected by one of these techniques; use at least three different techniques in the seven clips:
  - a plan that changed: "we were going to... but it was full";
  - a thing that almost happened: "I nearly bought one";
  - the past or the future instead of the time of the question: "last time", "maybe next week";
  - a suggestion that the other speaker rejects or that the speaker does not take;
  - a correction of a fact: "it says 10:20... no, sorry, that's the old timetable";
  - the order of events: the question asks what is first, the script names it last and says "before that".
- Numbers, prices and times: say all three values in the script, each with a different role (the price of one offer, the price for the gift, the price of another offer).
- At least one key in each part is not named: the speaker refers back to it ("the same as you", "the other one", "that's what I got").

Part 2 (attitude, opinion, feeling, agreement, purpose):

- The question asks what a speaker thinks, feels, wants, or what both speakers agree about. Do not test a plain fact.
- Each distractor is related to something that a speaker says: a topic that the first speaker suggests and the second speaker corrects ("Actually, it's not that, it's..."), a fact that is true but does not answer the question, or an opinion of only one speaker in an "agree" question.
- The key is a summary of two or more turns, not one sentence.

Part 3 (note completion, six gaps):

- One speaker talks for the whole recording. Answers come in the order of the notes, spread through the talk (about one gap in each 50 words).
- For each gap, the script names a second word of the same type near the key (two places, two foods, two days, two prices), and the context rejects it: "I thought it was going to be X, but it was Y", "most people liked X, though Y was my favourite".
- The note paraphrases the sentence of the script. It does not repeat the words around the key, so the candidate must recognise the meaning.
- The key is a word or two words that the speaker says exactly, with common B1 spelling. Numbers and dates are said in a natural way (the twenty-third of May).

Part 4 (interview, six questions):

- An interviewer asks short questions; the guest gives long answers that include all three options of the question. Questions follow the order of the interview.
- Reject distractors with negation and concession: "that wasn't where it started", "I got used to that", "it didn't matter in the end", "that wasn't the main reason".
- At least two questions test the reason or the feeling of the guest, not a fact.

## Grammar tags and difficulty

- Every cloze item has `tags` with the grammar point it tests. The builders (`cloze`, `openCloze`) add the tag that `scripts/lib/cloze-tags.mjs` suggests; pass a fifth array element (`[options, answer, explanation, ['collocations']]`) to choose it yourself. For an exam written by hand, run `npm run exams:tag-cloze -- --check`, read the items where the rules are not sure, add the wrong ones to `OVERRIDES` in `scripts/tag-cloze.mjs`, then run it without `--check`. Existing tags are never replaced (only with `--force`).
- Pick the most specific tag: `relative-clauses` before `linking-words`, `phrasal-verbs` before `prepositions`. Use `word-choice` for a choice between content words with different meanings and `collocations` when only one word goes with its partner (make/take/do).
- `npm run exams:difficulty` rewrites `docs/reports/exam-difficulty.md`. If the new exam is an outlier (more than two standard deviations from the others for sentence length, reading ease or words outside the B1 list), read its texts again and simplify them where they are above B1.

## Photos (Wikimedia Commons only)

Licences: CC0, public domain, CC BY, CC BY-SA. No Google Images, Unsplash or Pexels.

1. Put a visual in the exam JSON (`id`, `title`, `alt`) without an image.
2. Search: `node scripts/fetch-image.mjs search "people cooking outdoors" --limit 8 --out work/img`. Read the text list (licence, size, author, page, description) and look at `work/img/contact-sheet.jpg` once; the numbers match.
3. Check one candidate without writing: `node scripts/fetch-image.mjs <Commons file URL> --exam <examId> --visual <visualId> --dry` (writes a 480 px preview).
4. Run without `--dry` and add `--alt "..." --hints "a;b;c"` (3 to 5 hints). It verifies the licence, saves `src/assets/images/exams/<examId>/<visualId>-1200.webp` (1000 px) and `-600.webp` (480 px) and writes `image`, `credit`, `alt` and `describeHints`.
5. Accept the photo only if people, place and activity can be described with B1 vocabulary, there is no dominant text or logo, no identifiable minors and nothing sensitive. Otherwise delete the files and the JSON image.
6. Update the part `prompt` to match what the photo shows.
