// Compact builders for Cambridge B1 Preliminary exams (schema v2). An author script describes the
// content with short calls (arrays instead of repeated object keys), calls `save()`, and then runs
// `node scripts/exam-tools.mjs rebalance <id>` and `build <id>`. Only about 60% of the tokens of
// writing the JSON by hand. See docs/authoring-exams.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORK = fileURLToPath(new URL('../../work/', import.meta.url));
const LETTERS = 'ABCDEFGH';

/** Multiple-choice item list: [prompt, options, answerIndex, explanation]. */
const choices = (prefix, items, promptOf = (p) => p) =>
  items.map(([prompt, options, answer, explanation], i) => ({
    id: `${prefix}${i + 1}`,
    prompt: promptOf(prompt, i),
    options,
    answer,
    explanation,
  }));

export const notices = (prefix, notes, qs) => ({
  id: 'reading-1',
  number: 1,
  title: 'Notices and messages',
  instructions: 'For each notice, choose what it means.',
  type: 'notices',
  notices: notes,
  questions: choices(`${prefix}1-`, qs),
});

/** people: [[name, text]], texts: 8 x [title, text], keys: index of the text for each person. */
export const matching = (prefix, title, people, texts, keys, explanations) => ({
  id: 'reading-2',
  number: 2,
  title,
  instructions:
    'Read what each person is looking for. Match each person to the best text. There are three extra texts.',
  type: 'matching',
  people: people.map(([, text], i) => ({ id: `p${i + 1}`, text })),
  texts: texts.map(([t, text], i) => ({ id: LETTERS[i], title: t, text })),
  questions: people.map(([name], i) => ({
    id: `${prefix}2-${i + 1}`,
    prompt: name,
    options: LETTERS.split(''),
    answer: keys[i],
    explanation: explanations[i],
  })),
});

export const multipleChoice = (prefix, title, passage, qs) => ({
  id: 'reading-3',
  number: 3,
  title,
  instructions: 'Read the article and choose the best answer for each question.',
  type: 'multiple-choice',
  passage,
  questions: choices(`${prefix}3-`, qs),
});

/** keys: letter of the sentence for each gap (five gaps, six sentences). */
export const gappedText = (prefix, title, passage, sentences, keys, explanations) => ({
  id: 'reading-4',
  number: 4,
  title,
  instructions: 'Choose the sentence that fits each gap. There is one extra sentence.',
  type: 'gapped-text',
  passage,
  sentences,
  gaps: keys.map((answer, i) => ({
    id: `${prefix}4-${i + 1}`,
    answer,
    explanation: explanations[i],
  })),
});

/** qs: [options, answerIndex, explanation]. */
export const cloze = (prefix, title, passage, qs) => ({
  id: 'reading-5',
  number: 5,
  title,
  instructions: 'Choose the correct word for each gap.',
  type: 'multiple-choice-cloze',
  passage,
  questions: qs.map(([options, answer, explanation], i) => ({
    id: `${prefix}5-${i + 1}`,
    prompt: `Gap ${i + 1}`,
    options,
    answer,
    explanation,
  })),
});

/** gaps: [answer, acceptedOrNull, explanation]. */
export const openCloze = (prefix, title, passage, gaps) => ({
  id: 'reading-6',
  number: 6,
  title,
  instructions: 'Write one word in each gap.',
  type: 'open-cloze',
  passage,
  gaps: gaps.map(([answer, accepted, explanation], i) => ({
    id: `${prefix}6-${i + 1}`,
    answer,
    ...(accepted ? { accepted } : {}),
    explanation,
  })),
});

export const reading = (...parts) => ({ skill: 'reading', timeLimitMinutes: 45, parts });

export const point = (text, keywords, question = false) => ({
  text,
  keywords,
  ...(question ? { question: true } : {}),
});

/** email: { prompt, notes, from, subject, body, points }; article: { title, prompt, points }; story: adds opening. */
export function writing(email, article, story) {
  return {
    skill: 'writing',
    timeLimitMinutes: 45,
    parts: [
      {
        id: 'writing-1',
        number: 1,
        type: 'email',
        title: 'Part 1: Email',
        instructions: 'This question is compulsory. Write your answer in about 100 words.',
        task: {
          kind: 'email',
          title: 'Reply to an email',
          prompt: email.prompt,
          notes: email.notes,
          sourceEmail: { from: email.from, subject: email.subject, body: email.body },
          contentPoints: email.points,
          wordCount: 'about 100 words',
        },
      },
      {
        id: 'writing-2',
        number: 2,
        type: 'choice-task',
        title: 'Part 2: Article or story',
        instructions: 'Choose one of the two tasks. Write your answer in about 100 words.',
        options: [
          {
            kind: 'article',
            title: article.title,
            prompt: article.prompt,
            contentPoints: article.points,
            wordCount: 'about 100 words',
          },
          {
            kind: 'story',
            title: story.title,
            prompt: story.prompt,
            openingSentence: story.opening,
            contentPoints: story.points,
            wordCount: 'about 100 words',
          },
        ],
      },
    ],
  };
}

/** speaker: [id, name, lang, gender]. */
const speaker = ([id, name, lang, gender]) => ({ id, name, voice: { lang, gender } });
const turnsOf = (turns) => turns.map(([who, text]) => ({ speaker: who, text }));

/** speakers: [[id, name, lang, gender]], turns: [[speakerId, text]]. */
export const clip = (prefix, n, speakers, turns, prompt, options, answer, explanation) => ({
  id: `${prefix}${n}-clip`,
  recording: { speakers: speakers.map(speaker), turns: turnsOf(turns) },
  question: { id: `${prefix}${n}q`, prompt, options, answer, explanation },
});

export const shortDialogues = (clips) => ({
  id: 'listening-1',
  number: 1,
  title: 'Short conversations',
  instructions: 'Listen to seven short conversations. Choose the correct answer.',
  type: 'short-dialogues',
  clips,
});

export const gistDialogues = (clips) => ({
  id: 'listening-2',
  number: 2,
  title: 'Understanding the main idea',
  instructions: 'Listen to six short conversations and choose the best answer.',
  type: 'gist-dialogues',
  clips,
});

/** gaps: [prompt, answer, acceptedOrNull, explanation]. */
export const noteCompletion = (title, who, text, gaps) => ({
  id: 'listening-3',
  number: 3,
  title,
  instructions: 'Listen to the talk and complete each note with one word.',
  type: 'note-completion',
  recording: { speakers: [speaker(who)], turns: [{ speaker: who[0], text }] },
  gaps: gaps.map(([prompt, answer, accepted, explanation], i) => ({
    id: `l3-${i + 1}`,
    prompt,
    answer,
    ...(accepted ? { accepted } : {}),
    explanation,
  })),
});

export const interview = (title, speakers, turns, qs) => ({
  id: 'listening-4',
  number: 4,
  title,
  instructions: 'Listen to the interview and choose the correct answer.',
  type: 'listening-interview',
  recording: { speakers: speakers.map(speaker), turns: turnsOf(turns) },
  questions: choices('l4-', qs),
});

export const listening = (...parts) => ({ skill: 'listening', timeLimitMinutes: 35, parts });

/** Speaking section. photo and each item of `collaborative` are [visualId, title]; the photo files are added with fetch-image. */
export function speaking(
  n,
  interviewQs,
  photoPrompt,
  photo,
  topicTitle,
  collPrompt,
  collaborative,
  discussionQs,
) {
  const visual = ([id, title]) => ({
    id,
    title,
    alt: 'Placeholder alt text to be replaced by the photo description.',
    describeHints: ['placeholder 1', 'placeholder 2', 'placeholder 3'],
  });
  return {
    skill: 'speaking',
    timeLimitMinutes: 12,
    parts: [
      {
        id: 'speaking-1',
        number: 1,
        title: 'Getting to know you',
        instructions: 'Answer each question in your own words. Aim to speak for 20-30 seconds.',
        type: 'interview',
        questions: interviewQs.map((prompt, i) => ({ id: `s${n}-1-${i + 1}`, prompt })),
      },
      {
        id: 'speaking-2',
        number: 2,
        title: 'Describe a photograph',
        instructions:
          'Look at the photograph and speak for about one minute. Describe what you can see and say what the people might be feeling.',
        type: 'photo-description',
        prompt: photoPrompt,
        images: [visual(photo)],
      },
      {
        id: 'speaking-3',
        number: 3,
        title: topicTitle,
        instructions: 'Look at the pictures. Talk about the options and decide which one is best.',
        type: 'collaborative-task',
        prompt: collPrompt,
        images: collaborative.map(visual),
      },
      {
        id: 'speaking-4',
        number: 4,
        title: 'Talk about the topic',
        instructions: 'Answer the questions. Try to give a reason or an example with each answer.',
        type: 'discussion',
        questions: discussionQs.map((prompt, i) => ({ id: `s${n}-4-${i + 1}`, prompt })),
      },
    ],
  };
}

/** Writes work/<examId>/header.json and one file per section, ready for `exam-tools build`. */
export function save(examId, { title, subtitle, theme, category }, ...sections) {
  const dir = join(WORK, examId);
  mkdirSync(dir, { recursive: true });
  const header = {
    schemaVersion: 2,
    id: examId,
    level: 'B1',
    board: 'cambridge-pet',
    title,
    subtitle,
    theme,
    category,
    estimatedMinutes: 137,
    sectionOrder: sections.map((s) => s.skill),
  };
  writeFileSync(join(dir, 'header.json'), JSON.stringify(header, null, 2) + '\n');
  for (const section of sections) {
    writeFileSync(join(dir, `${section.skill}.json`), JSON.stringify(section, null, 2) + '\n');
  }
  console.log(
    `Saved work/${examId}/ (${sections.map((s) => s.skill).join(', ')}). Next: rebalance, build, validate.`,
  );
}
