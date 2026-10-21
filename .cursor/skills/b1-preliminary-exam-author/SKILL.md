---
name: b1-preliminary-exam-author
description: Create and review original Cambridge B1 Preliminary-style practice exams as structured JSON. Use when adding B1 Preliminary Reading, Writing, Listening, or Speaking papers, prompts, image briefs, vocabulary coverage, or answer keys to this project.
---

# B1 Preliminary Exam Author

Create original, level-appropriate practice materials for this project. Follow the current paper structure and content design in [exam-spec.md](exam-spec.md), and match the data contract in `src/types/exam.ts` and existing files in `src/data/`.

## Workflow

1. Read `exam-spec.md`, the TypeScript exam types, and one existing exam JSON.
2. Choose a coherent everyday theme and avoid repeating themes, settings, names, answer patterns, photo briefs and visual-task options from existing exams.
3. Draft the full paper with every field required by the JSON contract. Keep all learner-facing copy and source texts in English.
4. Write the answer key and concise explanations at the same time as the questions. Keep answers unambiguous and supported by the text or audio script.
5. Use the project validator and review every reported issue. Check word counts, question counts, valid keys, transcript/audio alignment, and answer option balance.
6. Update the exam catalogue only after the JSON is valid.

## Authoring rules

- Write fresh notices, messages, articles, stories, interviews, and monologues. Do not copy or lightly rewrite Cambridge sample tasks, copyrighted passages, or real exam items.
- Target CEFR B1 everyday communication. Use familiar situations and a mix of personal, social, travel, study, work, health, leisure, shopping, transport, food, and environment topics.
- Draw on the Cambridge B1 Preliminary Vocabulary List as a guide to receptive and productive lexis, not as a closed word whitelist. Prefer natural collocations, common phrasal verbs, and vocabulary whose meaning can be inferred in context.
- Keep distractors plausible and parallel in length and grammar. Do not make the answer conspicuously longer, repeat a unique keyword from the stem only in the key, or use “all/none of the above”.
- Ensure each item tests one clear reading/listening purpose. Avoid trivia, culturally narrow knowledge, trick wording, and multiple defensible answers.
- Listening scripts must sound spoken: contractions, natural turn-taking, clear references, realistic details, and occasional paraphrase between script and question. Every keyed answer must be explicitly recoverable from the script. Give each clip a distinct voice label; the app generates speech from the scripts.
- Include all four Speaking parts: personal interview questions; one original photo brief for a one-minute individual long turn; a collaborative task supported by at least four related visual prompts; and follow-up discussion questions. Keep prompts concrete, open-ended and answerable with B1 vocabulary. Rotate everyday settings and avoid specialist knowledge.
- Make image briefs visually specific and easy to describe (people, setting, activity and useful objects), with a concise accessible `alt` description. The app renders original local illustrations from the `scene` key; use a scene supported by `SpeakingImagePrompt` unless you extend its type and illustration component too.
- This is a solo rehearsal tool: learners record one response per question or visual. Do not present speech recognition as an assessment of pronunciation, fluency or accuracy, or claim that speaking has been Cambridge scored.
- Include the required writing email task and the two Part 2 choices (article and story). Each task should set a clear audience and purpose, include useful content prompts, and request about 100 words.
- Do not claim that automated writing feedback is a Cambridge score. Cambridge writing assessment uses Content, Communicative Achievement, Organisation, and Language; human judgement is needed for reliable scoring.
- Make the general-purpose and “for Schools” contexts age-appropriate if one version is requested. Do not mix the two variants without labelling them.

## Deliverable

Add one JSON file under `src/data/`, preserve the schema, add it to the catalogue, and provide a short summary of its topic coverage and format. Update the vocabulary coverage note when introducing a meaningful new topic area.
