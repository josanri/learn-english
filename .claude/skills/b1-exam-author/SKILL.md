---
name: b1-exam-author
description: Create and review original Cambridge B1 Preliminary practice exams as schema-v2 JSON in this project (Reading, Writing, Listening, Speaking), including speaking photos, answer keys and explanations. Use when adding or checking an exam.
---

# B1 exam author

Follow `docs/authoring-exams.md`. It has the low-token workflow, the quality rules and the photo steps. Do not read other long documents or whole exams.

Short version:

1. `node scripts/exam-tools.mjs brief cambridge-pet` (paper shape and used themes).
2. `split cambridge-pet-01`, then write the new exam as one file per skill in `work/<id>/`, then `build <id>`.
3. `npm run exams:index`, `npm run validate:exams -- <file>`; fix errors, then warnings.
4. Photos: `node scripts/fetch-image.mjs search ...` (one contact sheet), then fetch the chosen file with `--alt` and `--hints`.
5. Blind solve with `sheet` and `grade`; change every item that disagrees.
6. `npm run lint`, `npm test`, `npm run build`.

Never copy official papers. Only Cambridge B1 Preliminary is offered in the UI.
