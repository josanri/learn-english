# Learning coach: weak areas, mistakes, phrasal verbs, difficulty report, issue links

Date: 2026-10-24. Status: approved by the owner ("go on, finish when everything is done").

## Goal

After an exam, the learner sees the weak areas and practises the exact items that were wrong. The
phrasal verb set is larger and balanced. A script measures the difficulty of the exams. Learners can
report a problem on GitHub. The README describes the current app.

## 1. Cloze grammar tags

- `ChoiceQuestion` and `GapItem` get `tags?: GrammarTag[]` (`models/exam.ts`). `GrammarTag` is a
  closed list: `verb-forms`, `modals`, `verb-patterns`, `conditionals`, `relative-clauses`,
  `linking-words`, `comparisons`, `adverbs`, `pronouns`, `questions`, `prepositions`, `articles`,
  `quantifiers`, `phrasal-verbs`, `fixed-phrases`, `collocations`, `word-choice`.
- `models/grammar-tags.ts` gives each tag a label and, when one exists, a grammar guide id.
- `scripts/tag-cloze.mjs` writes the tags on every `open-cloze` gap and `multiple-choice-cloze`
  question from rules on the answer word, the options and the explanation keywords. `--check` only
  reports. Items without a confident rule get a fallback (`word-choice` for multiple-choice cloze)
  and are listed for review.
- `validate:exams` requires one or more valid tags on each cloze item of the Cambridge board.

## 2. Breakdown of a result

- `ObjectiveResult.breakdown?: { parts: Record<partType, Tally>, tags: Record<GrammarTag, Tally> }`,
  `Tally = { correct, total }`.
- `engine/insights.ts` (pure): `analyseSection(section, answers)` returns `{ breakdown, wrong }`
  (`wrong` = item ids answered incorrectly or not answered).
- `submitSection` saves the breakdown with the result and adds the wrong items to the mistakes.
- `InsightsService.backfill(exams)` loads only the exams that have a result without a breakdown,
  fills in the breakdown (current attempt) and adds the wrong items. It runs from the progress
  summary and the mistakes page.

## 3. Weak areas

- `core/stats.ts` `weakAreas(state)` sums the latest breakdown of each exam. It returns the part
  types and tags with at least 6 answered items, lowest percentage first.
- The progress summary shows up to three part types and three tags under the heading "Your weak areas".
  Tags with a guide link to it. A link goes to "My mistakes".
- The results page shows the tag breakdown of the exam.

## 4. My mistakes (`/practice/mistakes`)

- `practice.mistakes: Record<string, CardState>`; ids `exam:<examId>:<itemId>` and
  `phrasal:<verbId>`. Schema version 5 adds the empty record.
- In: a wrong item at section submit (and in the backfill), a wrong phrasal verb answer. An item
  that is in the queue already keeps its schedule.
- Review: correct = `good`, wrong = `again` (`srs.schedule`). Out: interval of 21 days or more.
- Cards: cloze gaps show their sentence with the gap (the other gaps filled in); notices show the
  notice; other reading and listening items show the question, the options and "Open this part"
  (`?part=<partId>` on the section route). Phrasal verbs ask for the meaning.

## 5. Safe storage

- `StorageService` calls `navigator.storage.persist()` once after the first exam answer or practice
  result. Settings > Your data shows if the data is persistent.

## 6. Phrasal verbs

- About 80 new original verbs (176 to about 255). Two new groups: `home-food` (Home and food) and
  `feelings` (Feelings and opinions). The small groups (`health`, `money-shopping`) grow to at least 20.
- Wrong answers go to the mistakes queue (section 4).

## 7. Difficulty report

- `scripts/exam-difficulty.mjs` (`npm run exams:difficulty`) measures, for each exam, the reading
  passages and listening scripts: word count, mean sentence length, Flesch reading ease, and the
  share of words that are not in the B1 vocabulary list. It writes `docs/reports/exam-difficulty.md`
  with the averages, the ranges and the outliers (more than two standard deviations from the mean).

## 8. Issue links

- `.github/ISSUE_TEMPLATE/`: `content-error.yml`, `bug.yml`, `idea.yml`, `config.yml`.
- A general "Report a problem or suggest an idea" link (to `issues/new/choose`) in Settings and in
  the footer. The text says that a GitHub account is necessary.

## 9. README and docs

- README: 100 exams, the new features, the image size, the issue link.
- `docs/practice.md`, `docs/persistence.md`, `docs/exam-engine.md`, `docs/authoring-exams.md`:
  the new data and rules.

## Testing

Unit tests for `insights.ts`, `weakAreas`, the mistakes queue functions, the migration to v5 and the
storage writers. Script tests for `tag-cloze.mjs` rules and `exam-difficulty.mjs` metrics. All
project checks before each commit.
