# Exam formats and validator rules

The numbers below are enforced by `scripts/lib/board-rules.mjs` (`BOARD_SPECS`) and checked by `npm run validate:exams`.
Rules that follow a published number are errors. Text-length ranges are our own guidance and are warnings.
Part types are the types of `src/app/models/exam.ts`. Sources were consulted in October 2026; check them again when a board changes its paper.

## Cambridge B1 Preliminary (`cambridge-pet`)

Source: https://www.cambridgeenglish.org/exams-and-tests/preliminary/exam-format/

| Skill                              | Parts                                                                                                                                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reading (45 min, 32 items)         | 1 `notices` 5 items, 3 options. 2 `matching` 5 people, 8 texts, each text used once. 3 `multiple-choice` 5 items, 3 options. 4 `gapped-text` 5 gaps, 6 sentences. 5 `multiple-choice-cloze` 6 gaps, 4 options. 6 `open-cloze` 6 gaps, one word. |
| Writing (45 min)                   | 1 `email`, about 100 words. 2 `choice-task`: one article and one story (the story gives an opening sentence), about 100 words.                                                                                                                  |
| Listening (about 30 min, 25 items) | 1 `short-dialogues` 7 items, 3 options. 2 `gist-dialogues` 6 items, 3 options. 3 `note-completion` 6 gaps. 4 `listening-interview` 6 items, 3 options. Each recording is played twice.                                                          |
| Speaking (4 parts)                 | `interview`, `photo-description` (one photo), `collaborative-task` (at least four visuals), `discussion`.                                                                                                                                       |

Guidance (warnings): Part 3 text 140-400 words, Part 4 100-350, Parts 5 and 6 60-250.

## EOI Intermedio B1, Spain (`eoi`)

Source: Escuelas Oficiales de Idiomas, Pruebas de Certificacion, Especificaciones de examen Nivel Intermedio B1, course 2024-2025:
https://www.educa.jcyl.es/otrasensenanzas/en/ensenanzas-idiomas/pruebas-certificacion.files/1759578-Especificaciones_B1_24-25.pdf
(each autonomous community publishes its own guide; the structure is common).

- Sections in this order: `reading`, `listening`, `writing`, `speaking`, `mediation` (five activities, 20 points each).
- Reading and Listening: at least 3 tasks (parts) and at least 25 items each; reading texts at most 1200 words in total; each listening task is heard twice.
- Writing: 2 tasks (one free production, one response to a situation), at most 250 words in total.
- Speaking: 2 tasks (a monologue of at most 3 minutes, a dialogue of 3-5 minutes, 5 minutes of preparation). Modelled as a `monologue-topic` part and a `role-play`, `discussion`, `interview` or `collaborative-task` part.
- Mediation: 2 tasks (`mediation-text`); written answer at most 100 words, written source text at most 200 words.

## Trinity ISE I (`trinity-ise1`)

Sources: ISE Specifications Reading & Writing (Third Edition), ISE I task specifications:
https://examenestrinity.elblogdeidiomas.es/wp-content/uploads/2016/11/ISE-Specifications-Reading-Writing-Third-Edition-2.pdf
and the official ISE I page https://trinitycollege.com/qualifications/english-language/ISE/ISE-I-B1-resources

- Reading & Writing (2 hours). Task 1 long reading: one text of about 400 words and 15 items (5 title matching, 5 true statements, 5 sentence completion). Task 2 multi-text reading: four texts of about 400 words and 15 items (5 multiple matching, 5 true statements, 5 summary notes). Task 3 reading into writing and Task 4 extended writing: 100-130 words each.
- Speaking & Listening (about 18 minutes): topic task (prepared talk), conversation task and two independent listening tasks.
- Validator: sections `reading`, `writing`, `listening`, `speaking`; Reading has 30 items in at least 2 parts; Writing has 2 parts of 100-130 words; Listening at least 2 parts; Speaking starts with a `monologue-topic` (topic task) followed by a `discussion` or `interview` (conversation).
- Note: Trinity revised ISE in 2025; this specification is the Third Edition. Re-check the counts before generating many ISE exams.

## Aptis General B1 (`aptis-b1`)

Sources: British Council Aptis General test format overview https://www.britishcouncil.org/sites/default/files/aptis_general_test_format_overview_2023_0.pdf
and https://aptistrainer.com/english/test_structure/ (listening 25 items, four options).

- Reading (35 min): 4 parts (sentence comprehension, text cohesion, opinion matching, long text).
- Listening (about 40 min): 4 parts; warning outside 17-28 items.
- Writing (50 min): 4 parts (word-level answers, short text, three responses, formal and informal email).
- Speaking (about 12 min): 4 parts (personal questions, photo description, opinion, experience).
- The grammar and vocabulary core is not modelled. Item counts per reading part were not confirmed in a public source; only the number of parts is checked.

## LanguageCert International ESOL B1 "Achiever" (`languagecert-b1`)

Source: LanguageCert International ESOL handbook, B1 level specification:
https://languagecert.org/-/media/B653A182682F46C2BC27280AD4364693.ashx

- Listening (about 30 min, 26 items): 1 `short-dialogues` 7 items, 3 options. 2 three conversations with two items each (6, `listening-multiple-choice` or `gist-dialogues`). 3 `note-completion` 7 gaps, one to three words. 4 `listening-interview` or `listening-multiple-choice` 6 items.
- Reading (26 items): 1 `notices` 5 items. 2 `gapped-text` 6 gaps and 7 sentences. 3 `matching` 7 items over four texts. 4 `sentence-completion` 8 questions, one to three words.
- Writing: Part 1 70-100 words, Part 2 100-120 words.
- Speaking: about 12 minutes, face to face; at least 2 parts are required (the public document gives no part breakdown).

## Oxford Test of English B1 (`oxford-test-b1`)

Source: Oxford University Press, Oxford Test of English B1 Practice Test 3 (official sample):
https://online.oupe.es/ELT/OTE/practicetests/B1-3/ote-b1-practice-test3.pdf

- Reading (22 items): 1 `notices` 6 items, 3 options. 2 `matching` 6 items. 3 `gapped-text` 6 gaps and 7 sentences. 4 `multiple-choice` 4 items.
- Listening (20 items): 1 `short-dialogues` 5. 2 `note-completion` 5. 3 `listening-true-false` or `opinion-matching` 5. 4 `gist-dialogues` or `listening-multiple-choice` 5.
- Writing: 1 `email` 80-130 words. 2 `choice-task` with two tasks (essay or review), 100-160 words.
- Speaking: `interview` 8 questions, `role-play` (the two voice messages), `monologue-topic` (the talk) with 6 follow-up questions.

## Quality rules (all boards)

Errors: ids unique inside the exam; valid answer index; every question, gap and statement has an explanation; open cloze answers are one word; note completion answers appear in the script; every speaker is one person and a dialogue is not written as one turn; matching keys are distinct; images have their files on disk, alt text, 3-5 `describeHints`, a complete credit and a whitelisted licence (CC0, Public domain, CC BY, CC BY-SA, from Wikimedia Commons); no text is word for word the same as in another exam of the board.

Warnings: one answer letter above 45% or four equal keys in a row; the key is the longest option in half of the questions; a keyword of the question appears only in the key; listening key not found in the script; voices without gender or all the same accent; names or themes repeated in other exams of the board; vocabulary that may be above B1.

The vocabulary check is a heuristic: the Cambridge B1 Preliminary Vocabulary List is a PDF owned by Cambridge and is not available as a word list we may redistribute. The validator therefore flags words of 12 or more letters that do not appear in the other exams (reviewed as B1). Read the report as advice.
