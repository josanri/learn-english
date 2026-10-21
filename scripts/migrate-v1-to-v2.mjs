// Converts the five legacy (schema v1) Cambridge B1 Preliminary papers kept in scripts/legacy-v1/
// into schema v2 files under src/assets/exams/b1/cambridge-pet/.
// Question/gap ids are preserved on purpose so saved learner answers keep working.
// Usage: node scripts/migrate-v1-to-v2.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const sourceDir = new URL('./legacy-v1/', import.meta.url);
const targetDir = new URL('../src/assets/exams/b1/cambridge-pet/', import.meta.url);
mkdirSync(targetDir, { recursive: true });

const UNSPLASH_LICENSE = 'https://unsplash.com/license';

function guessGender(label) {
  if (/\b(woman|girl|mother|mum|female|receptionist)\b/i.test(label)) return 'female';
  if (/\b(man|boy|father|dad|male)\b/i.test(label)) return 'male';
  return undefined;
}
const voice = (gender) => ({ lang: 'en-GB', ...(gender ? { gender } : {}), rate: 0.9 });

function monologue(name, text, gender) {
  return {
    speakers: [{ id: 'speaker-1', name, voice: voice(gender) }],
    turns: [{ speaker: 'speaker-1', text }],
  };
}

function clipRecording(label, script) {
  return monologue(label, script, guessGender(label));
}

function interviewRecording(script) {
  const labelPattern = /(?:^|\s)([A-Z][a-z]+):\s/g;
  const marks = [...script.matchAll(labelPattern)];
  const names = [...new Set(marks.map((m) => m[1]))];
  if (names.length !== 2 || !names.includes('Interviewer'))
    throw new Error(`Unexpected interview labels: ${names.join(',')}`);
  const guest = names.find((n) => n !== 'Interviewer');
  const speakers = [
    {
      id: 'interviewer',
      name: 'Interviewer',
      voice: { lang: 'en-GB', gender: 'female', rate: 0.9 },
    },
    { id: 'guest', name: guest, voice: { lang: 'en-GB', gender: 'male', rate: 0.9 } },
  ];
  const turns = marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : script.length;
    return {
      speaker: m[1] === 'Interviewer' ? 'interviewer' : 'guest',
      text: script.slice(start, end).trim(),
    };
  });
  return { speakers, turns };
}

function readingPart(p) {
  const base = {
    id: `reading-${p.part}`,
    number: p.part,
    title: p.title,
    instructions: p.instructions,
  };
  switch (p.type) {
    case 'notices':
      return { ...base, type: 'notices', notices: p.passage, questions: p.questions };
    case 'matching':
      return {
        ...base,
        type: 'matching',
        people: p.people,
        texts: p.texts,
        questions: p.questions,
      };
    case 'multiple-choice':
      return { ...base, type: 'multiple-choice', passage: p.passage, questions: p.questions };
    case 'gapped-text':
      return {
        ...base,
        type: 'gapped-text',
        passage: p.passage,
        sentences: p.sentences,
        gaps: p.gaps,
      };
    case 'multiple-choice-cloze':
      return { ...base, type: 'multiple-choice-cloze', passage: p.passage, questions: p.questions };
    case 'open-cloze':
      return { ...base, type: 'open-cloze', passage: p.passage, gaps: p.gaps };
    default:
      throw new Error(`Unknown reading type ${p.type}`);
  }
}

function writingTask(t) {
  const { type, ...rest } = t;
  return { kind: type, ...rest };
}

function writingParts(w) {
  return [
    {
      id: 'writing-1',
      number: 1,
      type: 'email',
      title: 'Part 1: Email',
      instructions: 'This question is compulsory. Write your answer in about 100 words.',
      task: writingTask(w.part1),
    },
    {
      id: 'writing-2',
      number: 2,
      type: 'choice-task',
      title: 'Part 2: Article or story',
      instructions: 'Choose one of the two tasks. Write your answer in about 100 words.',
      options: w.part2.map(writingTask),
    },
  ];
}

function listeningPart(p) {
  const base = {
    id: `listening-${p.part}`,
    number: p.part,
    title: p.title,
    instructions: p.instructions,
  };
  switch (p.type) {
    case 'short-dialogues':
    case 'gist-dialogues':
      return {
        ...base,
        type: p.type,
        clips: p.clips.map((c) => ({
          id: `${c.id}-clip`,
          recording: clipRecording(c.speaker, c.script),
          question: c.question,
        })),
      };
    case 'note-completion': {
      const name = /I(?:’|')m ([A-Z][a-z]+)/.exec(p.script)?.[1] ?? 'Presenter';
      return {
        ...base,
        type: 'note-completion',
        recording: monologue(name, p.script),
        gaps: p.gaps,
      };
    }
    case 'interview':
      return {
        ...base,
        type: 'listening-interview',
        recording: interviewRecording(p.script),
        questions: p.questions,
      };
    default:
      throw new Error(`Unknown listening type ${p.type}`);
  }
}

function visual(img) {
  const out = { id: img.id, title: img.title, alt: img.alt, illustration: img.scene };
  if (img.photoUrl) {
    out.image = {
      id: `${img.id}-photo`,
      src: img.photoUrl,
      alt: img.alt,
      credit: {
        author: img.photoCredit ?? 'Unknown',
        license: 'Unsplash License',
        licenseUrl: UNSPLASH_LICENSE,
        sourceUrl: img.photoSource ?? img.photoUrl,
      },
    };
  }
  return out;
}

function speakingPart(p) {
  const base = {
    id: `speaking-${p.part}`,
    number: p.part,
    title: p.title,
    instructions: p.instructions,
  };
  switch (p.type) {
    case 'interview':
    case 'discussion':
      return { ...base, type: p.type, questions: p.questions };
    case 'photo-description':
    case 'collaborative-task':
      return { ...base, type: p.type, prompt: p.prompt, images: p.images.map(visual) };
    default:
      throw new Error(`Unknown speaking type ${p.type}`);
  }
}

function migrate(v1, index) {
  const id = `cambridge-pet-${String(index).padStart(2, '0')}`;
  const sections = [
    { skill: 'reading', timeLimitMinutes: 45, parts: v1.reading.map(readingPart) },
    { skill: 'writing', timeLimitMinutes: 45, parts: writingParts(v1.writing) },
    { skill: 'listening', timeLimitMinutes: 35, parts: v1.listening.map(listeningPart) },
    { skill: 'speaking', timeLimitMinutes: 12, parts: v1.speaking.map(speakingPart) },
  ];
  return {
    schemaVersion: 2,
    id,
    level: 'B1',
    board: 'cambridge-pet',
    title: v1.title,
    subtitle: v1.subtitle,
    theme: v1.theme,
    estimatedMinutes: sections.reduce((sum, s) => sum + s.timeLimitMinutes, 0),
    sections,
  };
}

// Collects every item id so we can prove nothing was lost.
function collectIds(value, ids = []) {
  if (Array.isArray(value)) value.forEach((v) => collectIds(v, ids));
  else if (value && typeof value === 'object') {
    if (typeof value.id === 'string') ids.push(value.id);
    Object.values(value).forEach((v) => collectIds(v, ids));
  }
  return ids;
}

const files = readdirSync(sourceDir)
  .filter((n) => /^exam-\d+\.json$/.test(n))
  .sort();
for (const file of files) {
  const v1 = JSON.parse(readFileSync(new URL(file, sourceDir), 'utf8'));
  const index = Number(/\d+/.exec(file)[0]);
  const v2 = migrate(v1, index);
  const stripRecordings = (ids) =>
    [...new Set(ids)].filter(
      (i) =>
        !/^(reading|writing|listening|speaking)-\d+$/.test(i) &&
        !i.endsWith('-photo') &&
        !i.endsWith('-clip') &&
        !/^(speaker-1|interviewer|guest)$/.test(i),
    );
  const clipIds = new Set(v1.listening.flatMap((p) => p.clips?.map((c) => c.id) ?? []));
  const before = stripRecordings(collectIds({ r: v1.reading, l: v1.listening, s: v1.speaking }))
    .filter(
      (i) => !clipIds.has(i) || v1.listening.some((p) => p.clips?.some((c) => c.question.id === i)),
    )
    .sort();
  const after = stripRecordings(collectIds(v2.sections)).sort();
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(
      `${file}: item ids changed during migration: missing ${before.filter((i) => !after.includes(i))} extra ${after.filter((i) => !before.includes(i))}`,
    );
  }
  writeFileSync(new URL(`${v2.id}.json`, targetDir), `${JSON.stringify(v2, null, 2)}\n`);
  console.log(`${file} -> ${v2.id}.json (${after.length} ids preserved)`);
}
