# Aptis ESOL General (B1 Target) Specification

Reference for authoring original Aptis-style B1 practice exams in `B1exams`.

## 1. Exam overview

The official British Council Aptis ESOL General is a computer-based, multi-level test spanning
A1 to B2. In `B1exams`, `aptis-b1` practice papers use the **exact Aptis task shapes and timings**,
but write **every part at full B1 level** so B1 learners get a complete, consistent B1 exam
without A1/A2 beginner filler items.

Never prefix `part.title` with `Part N:` (the UI already renders `Part N:`) and never include
CEFR level labels such as `(A1)` or `(A2)` in part titles.

| Component                    | Time   | Structure                                      | CEFR ramp                  |
| ---------------------------- | ------ | ---------------------------------------------- | -------------------------- |
| Core: Grammar and Vocabulary | 25 min | 50 items (25 grammar + 25 vocabulary)          | A1-B2 (anchor score)       |
| Reading                      | 35 min | 4 parts, 29 items                              | A1 -> A2 -> B1 -> B2       |
| Listening                    | 40 min | 4 parts, 25 items (each recording plays twice) | A1 -> A2 -> B1 -> B2       |
| Writing                      | 50 min | 4 parts inside one club/community scenario     | A1 -> A2 -> B1 -> B2       |
| Speaking                     | 12 min | 4 parts, recorded on strict timers             | A1 -> A2/B1 -> B1/B2 -> B2 |

### Scoring context (reference only)

- Official Aptis reports each component on a **0-50** scale.
- Core has no standalone CEFR level; it lifts borderline skill scores to the next CEFR band.
- Official B1 / B2 cut-offs (0-50): Listening 24 / 34, Reading 26 / 38, Writing 26 / 40,
  Speaking 26 / 41.
- In `B1exams`, show percentage scores and neutral practice feedback only; never claim an
  official Aptis grade.

---

## 2. Exact component breakdown

### Core: Grammar and Vocabulary (25 min, 50 items)

- **Part 1 — Grammar (25 items):** Standalone sentences or short 2-turn dialogues with one gap
  and **3 options** (A, B, C). Covers written and spoken grammar from A1 to B2.
- **Part 2 — Vocabulary (25 items = 5 sets x 5 items):** Each set has 5 prompts and a shared
  drop-down of **10 options** (5 keys + 5 distractors):
  1. Synonym matching (word pairs, A1-A2).
  2. Definition matching (B1).
  3. Sentence completion in context (A2-B1).
  4. Synonym matching (higher-level verbs/adjectives, B1-B2).
  5. Collocations / word combinations (B1-B2, e.g., _make a decision_, _heavy rain_).

### Reading (35 min, 4 parts, 29 items)

| Part | Task                    | Level | Exact counts and rules                                                                                                                        |
| ---- | ----------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Sentence comprehension  | A1    | Short note/email with **5 gaps** (+ 1 example). **3 options** per gap (same part of speech).                                                  |
| 2    | Text cohesion           | A2    | **2 separate texts** of **6 sentences** each. Sentence 1 is fixed; order the other **5 sentences** (**10 items** total).                      |
| 3    | Opinion matching        | B1    | **4 short texts** (People A-D) on one topic + **7 statements**. Match each statement to A, B, C, or D (people can repeat).                    |
| 4    | Long text comprehension | B2    | **1 text** (~750 words) split into **7 scored paragraphs** (plus optional example paragraph 0) + **8 headings** (1 extra). **7 items** total. |

### Listening (40 min, 4 parts, 25 items)

Each recording plays twice in exam mode. Use natural spoken English and diverse accents
(`en-GB`, `en-US`, `en-AU`, `en-IE`) with explicit `gender`.

| Part | Task                    | Level | Exact counts and script lengths                                                                                            |
| ---- | ----------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | Information recognition | A1-A2 | **13 short clips** (40-80 words each: voicemails, announcements, short dialogues). **1 question per clip**, **3 options**. |
| 2    | Information matching    | A2-B1 | **4 speakers** (A-D, 45-65 words each) on one topic. **4 items** matched to **6 options** (2 extra).                       |
| 3    | Opinion matching        | B1    | **1 dialogue** (man + woman, 180-250 words). **4 statements** with 3 options: `The man`, `The woman`, `Both`.              |
| 4    | Monologue comprehension | B2    | **2 longer monologues** (160-220 words each). **2 questions per monologue** (**4 items**), **3 options** each.             |

### Writing (50 min, 4 parts)

All 4 parts belong to one shared scenario: the candidate joins a club, course, or community
group (for example, a hiking club, film society, or cooking group).

| Part | Task                    | Level | Target output and word count                                                                                                                                            |
| ---- | ----------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Word-level writing      | A1    | **5 short questions**; **1-5 words** each.                                                                                                                              |
| 2    | Short text writing      | A2    | **1 form prompt**; **20-30 words** in complete sentences.                                                                                                               |
| 3    | Three written responses | B1    | **3 chat/forum prompts** from members; **30-40 words** per reply (90-120 words total).                                                                                  |
| 4    | Formal and informal     | B2    | A club notice announces a change/problem. Write **2 emails**: (a) informal email to a friend (**40-50 words**) and (b) formal email to the manager (**120-150 words**). |

### Speaking (12 min, 4 parts)

Computer-recorded with strict timers and no human interlocutor.

| Part | Task                             | Level | Prompts                                              | Prep | Speak       |
| ---- | -------------------------------- | ----- | ---------------------------------------------------- | ---- | ----------- |
| 1    | Personal information             | A1-A2 | **3 personal questions**                             | 0 s  | 30 s each   |
| 2    | Describe, opinion, reasons       | B1    | **1 photo** + **2 follow-up questions**              | 0 s  | 45 s each   |
| 3    | Describe, compare, reasons       | B1-B2 | **2 contrasting photos** + **2 follow-up questions** | 0 s  | 45 s each   |
| 4    | Personal experience and abstract | B2    | **1 photo** + **3 questions** answered in one turn   | 60 s | 120 s total |

---

## 3. Grammar, vocabulary, and distractor guidelines

### Grammar coverage

- **A1-A2:** Present simple/continuous, past simple, _going to_ / _will_, basic modals (_can, must, have to_), countable/uncountable nouns, comparatives/superlatives, basic prepositions.
- **B1 (core):** Present perfect vs. past simple, past continuous, _used to_, first and second conditionals, passive voice (present/past), modals of advice/deduction (_should, might, could_), gerund vs. infinitive, defining relative clauses, reported speech, linkers (_although, despite, unless, whereas_).
- **B2 (stretch):** Past perfect, third conditional, _wish_ / _if only_, past modals of deduction (_must have / can't have_), non-defining relative clauses, passive with modals.

### Vocabulary and topic domains

- **Topics:** Free time, clubs, travel, food, work, study, technology, environment, shopping, health, home, transport, culture, community events.
- **Lexical focus:** Synonyms, clear non-circular definitions, high-frequency collocations (_make/do/take/keep/heavy/strong_), B1-B2 phrasal verbs (_give up, look forward to, turn down, carry on, put off, run out of_), and informal vs. formal register pairs for Writing Part 4.
- Keep Part 4 (B2 stretch) readable for strong B1 candidates; avoid rare C1/C2 vocabulary.

### Distractor rules by part

- **Reading Part 1:** All 3 options share the same part of speech and grammatical fit; meaning or collocation decides the key.
- **Reading Part 2:** Every sentence links to its neighbours via pronouns (_it, they, this_), time markers (_after that, later_), or cause/effect so only **one** sequence is valid.
- **Reading Part 3:** Paraphrase every statement. Make at least two people mention the same sub-topic with different opinions so word-spotting fails.
- **Reading Part 4:** Headings summarise the **main idea** of the paragraph, not one minor detail. The extra heading echoes a topic word from one paragraph as a trap.
- **Listening Part 1:** Mention all 3 options in the script (3 times, prices, places, or items) and reject 2 via self-correction, changed plans, or negation.
- **Listening Part 2:** Make the 2 extra options echo minor ideas mentioned by one of the speakers.
- **Listening Part 3:** Include clear agreement phrases for `Both` and explicit polite disagreement for `The man` or `The woman`.
- **Listening Part 4:** Test speaker attitude, purpose, or implicit opinion; paraphrase the key option instead of repeating its exact words.

---

## 4. Mapping to `B1exams` schema and engine

Check `src/app/models/exam.ts` and `src/app/features/exam/parts/part-registry.ts`:

- **Ready today:**
  - Reading Part 1 -> `multiple-choice-cloze` (5 items, 3 options)
  - Reading Part 4 -> `heading-matching` (7 paragraphs, 8 headings)
  - Listening Part 1 -> `short-dialogues` (13 clips, 3 options)
  - Listening Part 2 -> `opinion-matching` (4 gaps, 6 options)
  - Listening Part 3 -> `listening-multiple-choice` (4 items, options `["The man", "The woman", "Both"]`)
  - Writing Part 2 -> `short-message` (20-30 words)
  - Speaking Part 1 -> `interview` (3 questions)
- **Needs schema/renderer extension before full fidelity:**
  - Core component -> optional `grammar-vocabulary` skill + standalone MCQ and 10-option set matching renderers.
  - Reading Part 2 -> `sentence-ordering` part type (2 texts x 5 ordered sentences after 1 fixed sentence).
  - Reading Part 3 -> `matching` with repeated keys allowed (4 texts, 7 questions).
  - Listening Part 4 -> multi-recording monologue part (2 monologues x 2 questions).
  - Writing Parts 1, 3, 4 -> multi-prompt writing part (5 short inputs; 3 chat textareas; dual informal + formal email tasks).
  - Speaking Parts 2, 3, 4 -> follow-up questions on `photo-description`, optional `image` on `monologue-topic`, and per-prompt timers (30 s / 45 s / 60 s prep + 120 s).
