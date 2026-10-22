# Export (`features/exam/export`)

The Results page card "Export" offers a PDF ("Full report" or "Answer sheet only", with an optional annex of reading texts and listening scripts) and a ZIP, for the attempt being viewed (current or archived).

`ResultExportService` (root) gathers recordings (`AudioDbService`, key `<examId>:<attemptId>:<itemId>`), speaking pictures (`export-images.ts` downsizes to JPEG) and `studentName`. It then dynamically imports `pdf-render` (pdfmake) and `zip-export` (fflate).

Neither library may be in the initial bundle. Do not import `pdfmake`, `fflate`, `pdf-render` or `zip-export` statically outside `export/`.

## Layers

1. `report-model.ts`: pure data. `buildReportModel(input, options)` marks with `buildSectionReport`, `writingSummary`, `analyzeSpeech` and the task checklist. `wrapLines` gives exact line numbers because the answer is laid out in monospace.
2. `pdf-document.ts`: pure. `buildDocument(model)` returns a pdfmake definition. Everything is vector (rings, bars, tick and cross icons, brush stroke) and text always accompanies colour.
3. `pdf-render.ts`: loads pdfmake, fonts and `rules.json`, and runs `runRules` for the writing notes. Spelling is not included.

## Fonts

pdfmake needs static fonts, so `assets/fonts/pdf/` has Bricolage Grotesque 400/700/800 and JetBrains Mono 400/700 (latin subset, `.woff` from @fontsource, OFL licences next to them). They are fetched only on export (lazy asset group in `ngsw-config.json`). `clean()` replaces glyphs outside that subset; draw symbols as vectors, never as text.

## ZIP

`exam.json`, `answers.json` (learner data, scores, writing, transcripts, recording paths, `allAnswers`), `results.pdf` (full report), `recordings/<partId>-<promptId>.<ext>`, `README.txt`. Time used and flagged items exist only for the current attempt (`session`).

## Page breaks

Tables use `headerRows` + `keepWithHeaderRows` + `dontBreakRows`. Cards are `unbreakable`. A heading is grouped with the block that follows it.
