# Exam engine (`features/exam`)

## Session store

`ExamShell` provides `ExamSessionStore` (one per open exam). It loads the exam JSON and exposes:

- `skill` (open section, set by the section page), `parts`, `part`, `answers`, `session`, `itemsByPart`, `score`, `unanswered`.
- Timer: `elapsed`, `remaining`, `timerNotice`, `paused`. `togglePause()` stops the clock only; answers stay editable. The pause is not saved (a reload resumes the clock). The header shows a pause / play icon button (accessible name "Pause timer" / "Resume timer") next to the clock when `showTimer` is on.
- `locked` (section submitted = read-only), `feedback(itemId)` (null until revealed: section submitted, or part checked in practice mode; never before submit when `examMode`).
- Writers: `setAnswer`, `toggleFlag`, `goToPart`, `checkPart`, `addListen`, `submitSection`, `retry`.

All state lives in `LocalStorageService`; the store only computes over it.

## Pages

Reading, Listening, Speaking and Writing use `SectionPage` (navigator only when the section has marked items; free-response prompts are counted through `PartDef.prompts`). Only Mediation still uses `PlaceholderSectionPage`. `/results` is `ResultsPage`.

## Scoring

Pure code in `engine/scoring.ts`: every part is reduced to `ScoreItem`s (`choice` stores the option index, `text` stores a string compared with `normalizeAnswer`; `choices` maps letters or true/false to labels). `engine/report.ts` builds per-part reports for any answers (current or archived attempt). Gap markers in passages are parsed by `engine/passage.ts`.

Cambridge scale: deliberately not estimated (conversion tables are unpublished and these papers are original). Results show percentage, a neutral practice band and an explanation.

## Part renderer registry

`parts/part-registry.ts`: `PART_REGISTRY` maps every `part.type` to `{ load, items }`.

To add a part type:

1. Add the interface to `models/exam.ts` and run `npm run schema:generate`.
2. Create a standalone renderer in `parts/` with `part = input.required<YourPart>()`. It reads and writes answers through `inject(ExamSessionStore)` and uses the controls in `ui/item-controls.ts` (`ChoiceQuestion`, `AnswerSelect`, `AnswerInput`, `SelectRow`, `FlagStrip`, `ItemFeedback`) plus `SplitLayout`, `Passage`, `AudioScriptPlayer`.
3. Add one registry entry. The mapped type fails to compile if one is missing; `part-registry.spec.ts` checks every type used in `assets/exams`.

`PartView` provides heading, instructions, the Check button, focus management and lazy loading. Renderers only draw the body. Item ids must stay unique per exam and stable (they are the answer keys). Gap inputs get ids `sel-<itemId>` / `in-<itemId>` and choice fieldsets `q-<itemId>` for the navigator's focus jump.

## Listening

`SpeechService.createPlayback(recording)` returns a `ScriptPlayback` (`core/speech-playback.ts`): sentence chunking for Chrome, pause = cancel and re-speak the chunk so Safari iOS works, a watchdog when `onend` never fires, per-speaker voices through `chooseVoices`, pitch shift when a voice is shared. It works for any number of speakers.

- Exam mode: 2 plays per recording, no transcript or Repeat until submitted.
- Practice mode: unlimited plays and a transcript toggle.
- Without speech synthesis the player shows the transcript with a notice.
