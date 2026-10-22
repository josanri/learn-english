---
name: b1-exam-author
description: Create and review original B1 practice exams as schema-v2 JSON for any supported board (Cambridge B1 Preliminary, EOI B1, Trinity ISE I, Aptis B1, LanguageCert B1, Oxford Test of English B1). Use when adding Reading, Writing, Listening, Speaking or Mediation papers, speaking photos (fetch-image), answer keys, explanations or vocabulary coverage to this project.
---

# B1 exam author (schema v2)

Create original, level-appropriate practice materials. The data contract is `src/app/models/exam.ts`; `src/assets/exams/b1/cambridge-pet/cambridge-pet-01.json` is a complete, audited example. The paper shape of every board, with its sources, is in `docs/exam-formats.md` and is enforced by `npm run validate:exams` (`scripts/lib/board-rules.mjs`). The Cambridge reference notes are in [exam-spec.md](exam-spec.md).

## Where files go

- One file per exam: `src/assets/exams/b1/<board>/<board>-NN.json`, `id` equal to the file name (for example `cambridge-pet-06`, `eoi-b1-01`). Never change an id that has been published: learner progress is stored by exam, part and item id.
- Header: `schemaVersion: 2`, `id`, `level: "B1"`, `board`, `title`, `subtitle`, `theme`, `estimatedMinutes`, `sections[]`.
- A section has `skill` (`reading|writing|listening|speaking|mediation`), `timeLimitMinutes`, `parts[]`. A part has `id` (`<skill>-<n>`), `number`, `title`, `instructions` and a discriminating `type` (see the interfaces in `models/exam.ts`). Item ids must be unique in the exam; `ChoiceQuestion.answer` is a zero-based option index, gapped-text, heading and matching keys are letters.
- New board: add it to `BOARD_INFO` (`scripts/lib/exam-files.mjs`) and to `BOARD_SPECS` (`scripts/lib/board-rules.mjs`), add the spec and URL to `docs/exam-formats.md`, and add a test in `scripts/lib/exam-rules.test.mjs`.

## Formats (one section per board)

Counts and sources: `docs/exam-formats.md`. Summary of what to build:

- **cambridge-pet**: Reading 6 parts (notices 5, matching 5/8 texts, multiple-choice 5, gapped-text 5 with 6 sentences, multiple-choice-cloze 6 with FOUR options, open-cloze 6). Writing: email + choice of article or story (opening sentence). Listening 7 + 6 + 6 + 6 (3 options, note completion one word). Speaking: interview, one photo, collaborative task with 4+ photos, discussion.
- **eoi**: sections reading, listening, writing, speaking, mediation. Reading and listening at least 3 tasks and 25 items; reading texts at most 1200 words; writing 2 tasks, 250 words in total; speaking monologue + dialogue; mediation 2 tasks (answer max 100 words, source max 200 words).
- **trinity-ise1**: Reading 30 items (long reading 15, multi-text 15), Writing 2 tasks of 100-130 words, Listening 2 recordings, Speaking topic task (`monologue-topic`) + conversation.
- **aptis-b1**: Reading 4 parts, Listening 4 parts (about 25 items), Writing 4 parts, Speaking 4 parts.
- **languagecert-b1**: Listening 7 + 6 + 7 + 6, Reading 5 + 6 + 7 + 8, Writing 70-100 and 100-120 words, Speaking at least 2 parts.
- **oxford-test-b1**: Reading 6 + 6 + 6 + 4, Listening 5 + 5 + 5 + 5, Writing email 80-130 and essay or review 100-160 words, Speaking interview (8 questions), voice messages (`role-play`), talk with 6 follow-ups.

## Quality rules (the validator checks them)

Errors (block CI): unique ids; valid answer indexes; an `explanation` on every question, gap and statement (one or two sentences quoting or pointing at the text or script, never "option A"); open cloze answers one word; note completion answers appear in the script; matching keys distinct; speakers are single people with turns for each person (a dialogue is never one long turn); images with file, alt, 3-5 `describeHints`, complete credit and whitelisted licence; no text copied between exams.

Warnings (fix them unless there is a reason): one key letter above 45% or four equal keys in a row; the key is the longest option in half of the questions; a keyword of the question appears only in the key; listening key not found in the script; voices without gender or without accent variety (en-GB, en-US, en-AU, en-IE); names or themes repeated in other exams; vocabulary above B1 (heuristic).

Authoring rules the machine cannot check:

- Write fresh notices, messages, articles, stories, interviews and monologues. Never copy or lightly rewrite official tasks or copyrighted texts.
- Target B1 everyday communication across personal, social, travel, study, work, health, leisure, shopping, transport, food and environment topics. The Cambridge B1 Preliminary Vocabulary List is a guide, not a whitelist.
- One defensible key per item. For each gap and question ask: could a competent B1 candidate choose another option or word? If yes, change the item or add the equivalent to `accepted` (open cloze). Typical traps found in the audit: verbs that also fit the gap grammatically (get/make/take a trip), prepositions with several correct options (at/in/by), comparatives that are also correct ("lighter" and "less"), extra sentences that fit another gap.
- Distractors must be plausible and parallel in length and grammar. No "all/none of the above". The key must not be conspicuously longer or contain the only keyword from the stem.
- Gapped text: each sentence must depend on the sentence before or after through reference, linking or time. The extra sentence must fit no gap. Read the finished passage aloud with the key sentences in place.
- Every part and passage title must describe its own content (do not reuse a title from another exam).
- Listening: each recording lists `speakers` (id, person name, `voice.lang`, `voice.gender`) and `turns`. Give each person their own speaker with a different voice; short dialogues need two speakers. Scripts sound spoken (contractions, short turns). A note-completion gap prompt must not show its answer.
- Names, places, themes and answer patterns must differ from the other exams of the board (check `npm run validate:exams` output and `docs/content-plan.md` when it exists).
- Speaking: photo prompts must describe what the photo really shows (people, place, activity). Photos use `image`; the built-in `illustration` is legacy.
- Writing: audience, purpose, `notes`, `contentPoints` (2+ lower-case keywords each, matched as word starts or phrases), approximate length; stories need an exact `openingSentence`.
- Speaking and writing feedback are practice aids; never claim an official score.

## Images: fetch-image workflow

Only Wikimedia Commons (CC0, Public domain, CC BY, CC BY-SA). No Google Images, no photos without a clear licence.

1. Put a visual in the exam JSON (`id`, `title`, `alt`) without an image.
2. Search and look at previews: `node scripts/fetch-image.mjs search "people cooking outdoors" --limit 8 --out <scratch dir>`; open the JPEG previews and choose one.
3. Check with `--dry` first: `node scripts/fetch-image.mjs <Commons file URL> --exam <examId> --visual <visualId> --dry`.
4. Run without `--dry`, adding `--alt "..." --hints "a;b;c"` (3-5 hints). It verifies the licence, saves `src/assets/images/exams/<examId>/<visualId>-1200.webp` and `-600.webp` and writes `image`, `credit`, `alt` and `describeHints`.
5. Look at each downloaded image before accepting it: the people, place and activity can be described with B1 vocabulary; no dominant text or logos; no identifiable minors; nothing sensitive. Delete the files and the JSON image if not.
6. Write an `alt` that describes what is visible, and update the part `prompt` to match the photo.

## Workflow and final checklist

1. Read `docs/exam-formats.md`, `models/exam.ts` and one audited exam. Pick a theme, names and photo topics not used by other exams.
2. Draft the whole paper with keys and explanations, then fetch the photos.
3. Run `npm run exams:index`, then `npm run validate:exams -- <file>`; fix errors and warnings. After editing the types run `npm run schema:generate` first.
4. Final checklist, in this order:
   1. **Solve the exam blind**: reread passages and scripts as a candidate, write your own answers without looking at the key, then compare. Rewrite every item with two defensible answers or none.
   2. **Validate**: `npm run validate:exams` has no errors and no avoidable warnings.
   3. **Review the images**: every photo opened and approved; credits on `/credits`.
   4. **Register in `index.json`**: `npm run exams:index`, then validate again, `npm run lint`, `npm test`, `npm run build`.
5. Report the topic, vocabulary covered, photos with their licences, and any doubts.
