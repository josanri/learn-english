---
name: aptis-b1-exam-author
description: >-
  Create and review original full-B1 practice exams in the British Council Aptis ESOL General
  format as schema-v2 JSON in this project (Reading, Listening, Writing, Speaking, plus optional
  Core Grammar and Vocabulary), including B1 distractors, photos, answer keys, and explanations.
  Use when authoring, validating, or reviewing an aptis-b1 exam.
---

# Aptis B1 exam author

Read [references/aptis-spec.md](./references/aptis-spec.md) for the exact Aptis ESOL General
paper shape, full-B1 difficulty rules, grammar and vocabulary targets, distractor rules, and
schema mapping. Read `docs/authoring-exams.md` for the shared low-token workflow, quality rules,
and Wikimedia Commons photo steps. Do not read whole published exams.

## Workflow

1. Check `scripts/lib/board-rules.mjs` and `src/app/models/exam.ts` against the schema mapping in
   [references/aptis-spec.md](./references/aptis-spec.md). If a required Aptis part type is not
   implemented yet, implement it (and run `npm run schema:generate`) before writing exam JSON.
2. Run `node scripts/exam-tools.mjs brief aptis-b1` to check existing themes and names. Pick an
   unused theme, `category`, and club/community scenario (used across all four Writing parts).
3. Author one skill file at a time in `work/<examId>/` (`header.json` + one file per skill) with
   `board: "aptis-b1"` and `level: "B1"`. Keep **every part at full B1 difficulty** (use the
   Aptis task shapes, never A1/A2 beginner items):
   - **Core (optional if enabled):** 25 min, 25 grammar MCQs (3 options) + 25 vocabulary items
     (5 sets of 5 items, 10-word drop-down per set).
   - **Reading:** 35 min, 4 parts, 29 items (5 sentence comprehension, 2 x 5 sentence ordering,
     4-person opinion matching with 7 statements, 7-paragraph heading matching with 8 headings).
   - **Listening:** 40 min, 4 parts, 25 items, each recording played twice (13 short clips with
     3 options, 4 speakers matched to 6 options, 1 dialogue with 4 Man/Woman/Both items,
     2 monologues with 2 items each and 3 options).
   - **Writing:** 50 min, 4 parts inside one club scenario (5 answers of 1-5 words, 1 text of
     20-30 words, 3 chat replies of 30-40 words each, 2 emails: informal 40-50 words + formal
     120-150 words).
   - **Speaking:** 12 min, 4 parts (3 personal questions at 30 s, 1 photo + 2 questions at 45 s,
     2 contrasting photos + 2 questions at 45 s, 1 photo + 3 abstract questions with 60 s prep
     and 120 s talk).
4. Run `node scripts/exam-tools.mjs rebalance <examId>`, then `build <examId>`.
5. Run `npm run exams:tag-cloze -- --check`, then `npm run exams:tag-cloze`,
   `npm run exams:index`, and `npm run validate:exams -- <file>`. Fix all errors, then warnings.
6. Run `npm run exams:difficulty` and check `docs/reports/exam-difficulty.md`. Keep all four
   parts firmly at B1 level (no A1/A2 filler items and no obscure C1/C2 words).
7. Fetch Wikimedia Commons photos for Speaking Parts 2, 3, and 4 using
   `node scripts/fetch-image.mjs` (one contact sheet, then `--alt` and `--hints`).
8. Blind solve Reading and Listening (and Core if included) with
   `node scripts/exam-tools.mjs sheet <examId> <skill>` and `grade <examId> work/answers.json`.
   Fix every item that disagrees.
9. Run `npm run validate:exams`, `npm run audit:answer-order`, `npm run lint`, `npm test`, and
   `npm run build`.

## Hard rules

- Never prefix `part.title` with `Part 1:` (the UI already adds `Part N:`) and never put CEFR
  tags such as `(A1)`, `(A2)`, `(B1)`, or `(B2)` in part titles.
- Write every part at full **B1** level using the Aptis task shapes (do not write A1/A2 beginner
  questions in Part 1 or Part 2).
- Never copy or lightly rewrite official British Council Aptis papers or copyrighted texts.
- Never present practice scores, speech recognition, or automated writing checks as an official
  Aptis score or CEFR certificate.
- Every multiple-choice, matching, and gap item must have a clear 1-2 sentence `explanation`
  that points to the text or script (never say "option A").
- Every photo must be local WebP from Wikimedia Commons with a whitelisted licence (CC0, Public
  domain, CC BY, CC BY-SA), full credit, `alt`, and 3-5 `describeHints`.
