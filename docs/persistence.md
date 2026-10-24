# Persistence

One localStorage key, `learn-english:v1` (schemaVersion 5):

```
{ schemaVersion, settings, progress: { [examId]: ExamProgress }, activity: string[], grammar: { verbs }, practice, migrations }
```

`LocalStorageService` is signal-based, debounces writes with an effect and reads with try/catch. To change the shape, bump `CURRENT_SCHEMA_VERSION` and add a step in `core/state-migrations.ts`.

## Practice

`practice: { cards: { [cardId]: CardState }, newPerDay, phrasal: { [verbId]: { right, wrong, lastSeen, streak } }, stories: { [storyId]: { finishedAt, correct, total } }, mistakes: { [mistakeId]: { added, card? } } }` (types in `models/practice.ts`, details in practice.md). Written through `LocalStorageService.saveCard / setNewCardsPerDay / resetCards / recordPhrasalResult / resetPhrasal / finishStory / resetStories / addMistakes / saveMistakeReview / removeMistakes / resetMistakes`; answers add the day to `activity`. Version 3 documents get an empty record (`emptyPractice()`), version 4 documents an empty `mistakes`, and `sanitizePractice` drops broken entries (that card or verb simply starts again; a mistake with a broken schedule stays without it).

`mistakes` keys come from `core/mistakes.ts`: `exam:<examId>:<itemId>` and `phrasal:<verbId>`. `addMistakes` (section submit, backfill) and a wrong `recordPhrasalResult` set `{ added }`, which also restarts the schedule of an item that was already there. `card` is the flashcard `CardState` (see practice.md).

## ExamProgress

The CURRENT attempt as flat fields `{ answers, results, startedAt, updatedAt, sectionStatus }`, plus:

- `session?: { skill, parts: {skill: partId}, flagged, checked, listens: {recordingKey: n}, elapsed: {skill: seconds} }`.
- `attempts: Attempt[]`: archived earlier tries `{ id, startedAt, finishedAt, answers, results, sectionStatus }`. Retry = `LocalStorageService.startNewAttempt()` moves the current attempt there and empties the current one.
- `results` is keyed by skill (`reading`, `listening`: `{ correct, total, completedAt, breakdown? }`). Legacy migrated data may only have `objective`.
- `breakdown: { parts: { [partType]: { correct, total } }, tags: { [GrammarTag]: { correct, total } } }` is saved at submit since version 5. Older results get it from `InsightsService.backfill` (it loads only the exams with such results, calls `setBreakdown`, which does not change `updatedAt`, and adds the wrong items of the newest result of each skill to `mistakes`).

## Answer keys

Keys inside `answers` keep the original format: item id (`r1-1`), `writing-1`, `writing-2`, `writing-2-type`, `speaking:<promptId>`, `speaking-dur:<id>`, `speaking-topic:<partId>` and the writing rubric and check keys (see writing-checker.md). Never rename exam or item ids that are already published.

## Derived progress

- `core/progress.ts` `examStatus()` derives not-started / in-progress / completed, section fraction, score percent and `everCompleted`. Completed means every skill in `COMPLETABLE_SKILLS` (reading, writing, listening, speaking) that the exam has is `completed`. Only `SCORED_SKILLS` (reading, listening) have `results`; writing and speaking are completed by submitting the section and have no score.
- `core/stats.ts` `computeStats()` feeds the Home and /exams/b1 summary (completed exams, average per skill, streak, Continue). `weakAreas()` sums the breakdown of the latest result of every exam and skill (areas with 6 or more items, weakest first); `rankBreakdowns()` does the same for one attempt on the results page.
- `activity` lists local days (`YYYY-MM-DD`) with practice and feeds the streak.

## IndexedDB

Recordings live in the database `learn-english-audio` (store `clips`), keyed `<examId>:<attemptId>:<itemId>`. The current attempt id is `<examId>-<archivedAttempts+1>` (`currentAttemptId()`), so Retry keeps old recordings under the archived attempt id. Old two-part keys are renamed once to the current attempt (`AudioDbService.migrateKeysToAttempts`, flag `migrations.audioKeys`).

There is no migration from the earlier React version: no learner ever had that data.

## Backup and persistent storage

Settings > Your data exports and imports the localStorage document as JSON. Recordings are not included.

`PersistentStorageService` reads `navigator.storage.persisted()`. Once `activity` has a day, the app shell calls `persist()` once per page load, so browsers that delete the data of sites without visits (Safari above all) keep it. Settings > Your data shows the status.
