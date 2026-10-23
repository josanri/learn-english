# Persistence

One localStorage key, `learn-english:v1` (schemaVersion 3):

```
{ schemaVersion, settings, progress: { [examId]: ExamProgress }, activity: string[], grammar: { verbs }, migrations }
```

`LocalStorageService` is signal-based, debounces writes with an effect and reads with try/catch. To change the shape, bump `CURRENT_SCHEMA_VERSION` and add a step in `core/state-migrations.ts`.

## ExamProgress

The CURRENT attempt as flat fields `{ answers, results, startedAt, updatedAt, sectionStatus }`, plus:

- `session?: { skill, parts: {skill: partId}, flagged, checked, listens: {recordingKey: n}, elapsed: {skill: seconds} }`.
- `attempts: Attempt[]`: archived earlier tries `{ id, startedAt, finishedAt, answers, results, sectionStatus }`. Retry = `LocalStorageService.startNewAttempt()` moves the current attempt there and empties the current one.
- `results` is keyed by skill (`reading`, `listening`: `{ correct, total, completedAt }`). Legacy migrated data may only have `objective`.

## Answer keys

Keys inside `answers` keep the original format: item id (`r1-1`), `writing-1`, `writing-2`, `writing-2-type`, `speaking:<promptId>`, `speaking-dur:<id>`, `speaking-topic:<partId>` and the writing rubric and check keys (see writing-checker.md). Never rename exam or item ids that are already published.

## Derived progress

- `core/progress.ts` `examStatus()` derives not-started / in-progress / completed, section fraction, score percent and `everCompleted`. Completed means every skill in `COMPLETABLE_SKILLS` (reading, writing, listening, speaking) that the exam has is `completed`. Only `SCORED_SKILLS` (reading, listening) have `results`; writing and speaking are completed by submitting the section and have no score.
- `core/stats.ts` `computeStats()` feeds the Home and /exams/b1 summary (completed exams, average per skill, streak, Continue).
- `activity` lists local days (`YYYY-MM-DD`) with practice and feeds the streak.

## IndexedDB

Recordings live in the database `learn-english-audio` (store `clips`), keyed `<examId>:<attemptId>:<itemId>`. The current attempt id is `<examId>-<archivedAttempts+1>` (`currentAttemptId()`), so Retry keeps old recordings under the archived attempt id. Old two-part keys are renamed once to the current attempt (`AudioDbService.migrateKeysToAttempts`, flag `migrations.audioKeys`).

There is no migration from the earlier React version: no learner ever had that data.

## Backup

Settings > Your data exports and imports the localStorage document as JSON. Recordings are not included.
