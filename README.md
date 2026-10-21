# Northstar B1 English Practice

A React + TypeScript + Vite app with three original B1 Preliminary-style practice papers. The learner-facing interface is in English. Exam content lives in individual JSON files under `src/data/` and is rendered by reusable React components.

## Run locally

Install dependencies once, then start the development server:

```bash
npm install
npm run dev
```

Run the production build with `npm run build`, preview it with `npm run preview`, and check exam-data structure with `npm run validate:exams`.

## Exam content

Each paper includes practice activities for all four B1 Preliminary skills:

- Reading: 6 parts, 32 objective questions.
- Writing: a compulsory email plus a choice of article or story (about 100 words each).
- Listening: 4 parts, 25 questions; audio is generated from original scripts using the browser's English speech synthesis voice.
- Speaking: 4 parts, with a separate response for each interview question or visual prompt. The original practice illustrations are not Cambridge exam photographs.

Objective answers, writing drafts and editable speaking transcripts are stored in browser local storage. Speaking recordings are saved in this browser's IndexedDB and can be played back or deleted. Speech recognition support depends on the browser. The app prefers on-device recognition when available; the learner must explicitly allow recognition that may be processed online. Recording still works if speech recognition is unavailable, and transcripts can be typed or edited. Automated scoring covers objective reading and listening items. Speaking and writing are not given an automated Cambridge score.

## Add another exam

1. Create `src/data/exam-04.json` following `src/types/exam.ts` and the existing papers.
2. Import and append it in `src/data/index.ts`.
3. Run `npm run validate:exams` and `npm run build`.

Use the project skill in `.cursor/skills/b1-preliminary-exam-author/` for the public task shape, vocabulary guidance and authoring checklist. Materials in this project are original practice items; they are not official Cambridge English papers.

## Reference sources

- [Cambridge B1 Preliminary exam format](https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/)
- [B1 Preliminary Handbook for Teachers](https://www.cambridgeenglish.org/Images/168150-b1-preliminary-teachers-handbook.pdf)
- [B1 Preliminary Vocabulary List (August 2025)](https://www.cambridgeenglish.org/Images/506887-b1-preliminary-vocabulary-list.pdf)
