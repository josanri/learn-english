---
name: b1-preliminary-exam-author
description: Create and review original B1 practice exams (Cambridge B1 Preliminary style by default) as schema-v2 JSON. Use when adding B1 Reading, Writing, Listening, Speaking or Mediation papers, prompts, image briefs, vocabulary coverage, or answer keys to this project.
---

# B1 exam author (schema v2)

Create original, level-appropriate practice materials. The paper structure for Cambridge B1 Preliminary is in [exam-spec.md](exam-spec.md). The data contract is `src/app/models/exam.ts`; look at `src/assets/exams/b1/cambridge-pet/cambridge-pet-01.json` for a complete example.

## Where files go

- One file per exam: `src/assets/exams/b1/<board>/<board>-NN.json`, with `id` equal to the file name (for example `cambridge-pet-06`).
- Header: `schemaVersion: 2`, `id`, `level: "B1"`, `board`, `title`, `subtitle`, `theme`, `estimatedMinutes`, `sections[]`.
- A section has `skill` (`reading|writing|listening|speaking|mediation`), `timeLimitMinutes` and `parts[]`. Each part has `id` (`<skill>-<n>`), `number`, `title`, `instructions` and a discriminating `type`. Part types are documented in `src/app/models/exam.ts`.
- New board: add it to `BOARD_INFO` in `scripts/lib/exam-files.mjs` and, if its paper shape is fixed, add a rule function in `scripts/validate-exams.mjs`.

## Workflow

1. Read `exam-spec.md`, `src/app/models/exam.ts` and one existing exam JSON.
2. Choose a coherent everyday theme; avoid repeating themes, names, answer patterns and visual tasks of existing exams.
3. Draft the whole paper. Keep every learner-facing string in English.
4. Write the answer key and short explanations together with the questions. Keep one defensible key per item, supported by the text or script.
5. Run `npm run exams:index` (regenerates `index.json`), then `npm run validate:exams`, and fix every reported issue. After editing the TypeScript types run `npm run schema:generate` first.
6. Check word counts, question counts, speaker ids used by turns, and answer option balance.

## Authoring rules

- Write fresh notices, messages, articles, stories, interviews and monologues. Never copy or lightly rewrite official sample tasks or any copyrighted exam item.
- Target CEFR B1 everyday communication. Mix personal, social, travel, study, work, health, leisure, shopping, transport, food and environment topics. Use the Cambridge B1 Preliminary Vocabulary List as a guide, not a whitelist.
- Distractors must be plausible and parallel in length and grammar. The key must not be conspicuously longer or contain the only keyword from the stem. No "all/none of the above".
- Keep question and gap ids unique in the exam and stable once published (learner progress is stored by id). `ChoiceQuestion.answer` is a zero-based option index; gapped-text and matching keys are letters.
- Listening: every recording lists `speakers` (id, name, `voice.lang`, optional gender/rate/pitch) and `turns` that reference those speaker ids. Use different voices for different speakers. Scripts must sound spoken (contractions, natural turn-taking), and each key must be recoverable from the script.
- Speaking: interview, one photo brief, a collaborative task with at least four visuals, and discussion questions. Visuals use `illustration` (existing built-in scene) until real photos are added; photos use `image` with `src`, `alt` and a full `credit` (author, license, licenseUrl, sourceUrl).
- Writing: give audience, purpose, content points and approximate length; stories need an exact `openingSentence`. Do not present automated feedback as an official score.
- Speaking and writing are practice aids only; never claim a Cambridge (or other board) score.
- Materials must be original practice items, not official papers.

## Deliverable

Add the exam JSON, regenerate `index.json`, make sure `npm run validate:exams` passes, and summarise the topic coverage and format.
