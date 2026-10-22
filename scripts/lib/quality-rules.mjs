// Automatic quality rules for exam JSON (pure functions; tested in exam-rules.test.mjs).
// Every function returns { errors: string[], warnings: string[] }. Errors block CI, warnings are advice.
import { classifyLicense } from './image-license.mjs';
import { partWords, wordCount } from './board-rules.mjs';

const LETTERS = 'ABCDEFGH';
const STOP = new Set(
  'about after again also another because before being between could does doing during each every from have having into just like make more most much only other over said same some such than that their them then there these they this those through under very want what when where which while with would your you are was were will can the and for not but had has his her its our out who how why one two any all'.split(
    ' ',
  ),
);

const stem = (w) =>
  w
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 5);
const contentWords = (text) =>
  String(text ?? '')
    .toLowerCase()
    .match(/[a-z]{4,}/g)
    ?.filter((w) => !STOP.has(w)) ?? [];

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];
/** Normal form for comparing gap answers with a script: lower case, digits written as words. */
function scriptForm(text) {
  return String(text)
    .toLowerCase()
    .replace(/\b(\d{1,2})\b/g, (m, d) => NUMBER_WORDS[+d] ?? m)
    .replace(/[’‘]/g, "'");
}

/** All recordings with a label, for listening checks. */
export function recordingsOf(exam) {
  const out = [];
  for (const section of exam.sections) {
    if (section.skill !== 'listening') continue;
    for (const part of section.parts) {
      if (part.clips)
        for (const clip of part.clips)
          out.push({
            id: clip.id,
            part,
            recording: clip.recording,
            questions: [clip.question],
            clip: true,
          });
      else if (part.recording)
        out.push({
          id: part.id,
          part,
          recording: part.recording,
          questions: part.questions ?? [],
          gaps: part.gaps,
          statements: part.statements,
        });
    }
  }
  return out;
}

/** Every ChoiceQuestion of the exam with the part it belongs to. */
export function choiceQuestions(exam) {
  const out = [];
  for (const section of exam.sections)
    for (const part of section.parts) {
      for (const q of part.questions ?? [])
        if (Array.isArray(q.options)) out.push({ q, part, section });
      for (const clip of part.clips ?? []) out.push({ q: clip.question, part, section });
    }
  return out;
}

/** Items that must have an explanation: choice questions, statements and gaps. */
function explainable(exam) {
  const out = [];
  for (const section of exam.sections)
    for (const part of section.parts) {
      for (const q of part.questions ?? []) if (q.options) out.push(q);
      for (const c of part.clips ?? []) out.push(c.question);
      for (const g of part.gaps ?? []) out.push(g);
      for (const s of part.statements ?? []) out.push(s);
    }
  return out;
}

export function checkExplanations(exam) {
  const errors = [];
  for (const item of explainable(exam)) {
    const e = (item.explanation ?? '').trim();
    if (!e) errors.push(`${item.id} has no explanation`);
    else if (e.length < 15) errors.push(`${item.id} explanation is too short to help a learner`);
  }
  return { errors, warnings: [] };
}

export function checkKeyDistribution(exam) {
  const warnings = [];
  const qs = choiceQuestions(exam).filter(({ part }) => part.type !== 'matching');
  if (qs.length >= 10) {
    const counts = {};
    for (const { q } of qs) counts[q.answer] = (counts[q.answer] ?? 0) + 1;
    for (const [i, n] of Object.entries(counts))
      if (n / qs.length > 0.45)
        warnings.push(
          `answer ${LETTERS[i]} is the key of ${n} of ${qs.length} questions (${Math.round((100 * n) / qs.length)}%, limit 45%)`,
        );
  }
  // Streaks of four identical keys in a row look like a pattern.
  let run = 1;
  for (let i = 1; i < qs.length; i++) {
    run = qs[i].q.answer === qs[i - 1].q.answer ? run + 1 : 1;
    if (run === 4)
      warnings.push(
        `four consecutive questions end at ${qs[i].q.id} with the same key ${LETTERS[qs[i].q.answer]}`,
      );
  }
  // Parts with at least five questions should not use a single letter for more than 60%.
  const byPart = new Map();
  for (const { q, part } of qs) byPart.set(part.id, [...(byPart.get(part.id) ?? []), q]);
  for (const [id, list] of byPart) {
    if (list.length < 5) continue;
    const c = {};
    for (const q of list) c[q.answer] = (c[q.answer] ?? 0) + 1;
    const [letter, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    if (n / list.length > 0.6)
      warnings.push(`${id}: key ${LETTERS[letter]} used for ${n} of ${list.length} questions`);
  }
  return { errors: [], warnings };
}

export function checkOptionLength(exam) {
  const warnings = [];
  const qs = choiceQuestions(exam).filter(
    ({ part }) => part.type !== 'matching' && part.type !== 'multiple-choice-cloze',
  );
  if (qs.length < 8) return { errors: [], warnings };
  let longest = 0;
  let keyWordOnly = 0;
  for (const { q } of qs) {
    const lens = q.options.map((o) => o.length);
    const max = Math.max(...lens);
    if (lens[q.answer] === max && lens.filter((l) => l === max).length === 1) longest++;
    const promptStems = new Set(contentWords(q.prompt).map(stem));
    const keyStems = new Set(contentWords(q.options[q.answer]).map(stem));
    const others = new Set(
      q.options.filter((_, i) => i !== q.answer).flatMap((o) => contentWords(o).map(stem)),
    );
    if ([...keyStems].some((s) => promptStems.has(s) && !others.has(s))) keyWordOnly++;
  }
  if (longest / qs.length >= 0.5)
    warnings.push(
      `the correct option is the longest in ${longest} of ${qs.length} questions; make distractors as long as the key`,
    );
  if (keyWordOnly / qs.length >= 0.35 && keyWordOnly >= 3)
    warnings.push(
      `a keyword of the question appears only in the correct option in ${keyWordOnly} of ${qs.length} questions`,
    );
  return { errors: [], warnings };
}

export function checkGaps(exam) {
  const errors = [];
  for (const section of exam.sections)
    for (const part of section.parts) {
      if (part.type === 'open-cloze')
        for (const g of part.gaps)
          for (const a of [g.answer, ...(g.accepted ?? [])])
            if (/\s/.test(a.trim()))
              errors.push(`${g.id}: open cloze answers must be one word ("${a}")`);
      if (part.type === 'sentence-completion' || part.type === 'note-completion')
        for (const g of part.gaps) {
          const max = part.maxWords ?? 3;
          if (g.answer.trim().split(/\s+/).length > max)
            errors.push(`${g.id}: answer is longer than ${max} words`);
        }
    }
  return { errors, warnings: [] };
}

export function checkListening(exam) {
  const errors = [];
  const warnings = [];
  const langs = new Set();
  const recs = recordingsOf(exam);
  for (const { id, part, recording, questions, gaps, statements, clip } of recs) {
    const speakers = recording.speakers;
    for (const s of speakers) {
      langs.add(s.voice.lang);
      if (
        /^(friends|colleagues|couple|neighbours|neighbors|students|visitors|two\b|a couple)/i.test(
          s.name.trim(),
        ) ||
        / and /i.test(s.name)
      )
        errors.push(`${id}: speaker "${s.name}" is a group; use one speaker per person`);
      if (!s.voice.gender) warnings.push(`${id}: speaker "${s.name}" has no voice gender`);
    }
    const voiceKeys = speakers.map((s) => `${s.voice.lang}/${s.voice.gender ?? '?'}`);
    if (speakers.length > 1 && new Set(voiceKeys).size < speakers.length)
      warnings.push(`${id}: two speakers share the same voice (language and gender)`);
    const dialogueType =
      part.type === 'gist-dialogues' ||
      part.type === 'listening-interview' ||
      part.type === 'short-dialogues';
    if (clip && recording.turns.length === 1 && /\?\s+\S/.test(recording.turns[0].text))
      errors.push(`${id}: a dialogue is written as one turn; give each speaker their own turn`);
    if (part.type === 'listening-interview' && speakers.length < 2)
      errors.push(`${id}: an interview needs two speakers`);
    if (part.type === 'gist-dialogues' && speakers.length < 2)
      errors.push(`${id}: a dialogue needs two speakers`);
    const used = new Set(recording.turns.map((t) => t.speaker));
    for (const s of speakers)
      if (!used.has(s.id)) warnings.push(`${id}: speaker "${s.name}" never speaks`);
    void dialogueType;

    const script = scriptForm(recording.turns.map((t) => t.text).join(' '));
    for (const g of gaps ?? []) {
      const answers = [g.answer, ...(g.accepted ?? [])].map(scriptForm);
      if (!answers.some((a) => script.includes(a)))
        errors.push(`${g.id}: the answer "${g.answer}" does not appear in the script`);
    }
    for (const q of questions) {
      if (!q.options) continue;
      const stems = contentWords(q.options[q.answer]).map(stem);
      if (stems.length && !stems.some((s) => script.includes(s)))
        warnings.push(
          `${q.id}: no word of the correct option appears in the script; check it is paraphrased clearly`,
        );
    }
    void statements;
  }
  if (recs.length >= 3 && langs.size < 2)
    warnings.push('all voices use the same accent; mix en-GB, en-US, en-AU, en-IE');
  return { errors, warnings };
}

export function checkMatching(exam) {
  const errors = [];
  for (const section of exam.sections)
    for (const part of section.parts)
      if (part.type === 'matching') {
        const labels = part.texts.map((t) => t.id);
        const letters = part.questions.map((q) => q.options[q.answer]);
        if (new Set(letters).size !== letters.length)
          errors.push(`${part.id}: two people share the same text`);
        for (const q of part.questions)
          if (q.options.length !== part.texts.length)
            errors.push(`${q.id}: matching options must list every text`);
        void labels;
      }
  return { errors, warnings: [] };
}

// ---------------------------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------------------------

const URL_OK = /^https:\/\/[^\s]+$/;
const SOURCE_HOSTS = ['commons.wikimedia.org'];

/** `exists(path)` receives a site-relative path such as `assets/images/exams/x/a.webp`. */
export function checkImages(exam, exists) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  for (const section of exam.sections)
    for (const part of section.parts)
      for (const visual of part.images ?? []) {
        const where = visual.id;
        if (!visual.image) {
          warnings.push(
            `${where}: uses a drawn illustration; replace it with a licensed photo (scripts/fetch-image.mjs)`,
          );
          continue;
        }
        const img = visual.image;
        if (seen.has(img.src)) errors.push(`${where}: image file is used twice`);
        seen.add(img.src);
        if (!img.src.startsWith(`assets/images/exams/${exam.id}/`))
          errors.push(`${where}: image must live under assets/images/exams/${exam.id}/`);
        for (const [label, p] of [
          ['src', img.src],
          ['srcSmall', img.srcSmall],
        ]) {
          if (label === 'srcSmall' && !p) {
            warnings.push(`${where}: srcSmall (480 px) is missing`);
            continue;
          }
          if (!exists(p)) errors.push(`${where}: ${label} file not found (${p})`);
        }
        if (!img.alt?.trim() || img.alt.trim().length < 20)
          errors.push(`${where}: needs a useful alt text (at least 20 characters)`);
        if (!visual.alt?.trim()) errors.push(`${where}: visual needs alt text`);
        const c = img.credit ?? {};
        for (const k of ['author', 'license', 'licenseUrl', 'sourceUrl'])
          if (!String(c[k] ?? '').trim()) errors.push(`${where}: credit.${k} is missing`);
        if (c.license && !classifyLicense(c.license))
          errors.push(`${where}: licence "${c.license}" is not on the whitelist`);
        for (const k of ['licenseUrl', 'sourceUrl'])
          if (c[k] && !URL_OK.test(c[k])) errors.push(`${where}: credit.${k} must be an https URL`);
        if (
          c.sourceUrl &&
          URL_OK.test(c.sourceUrl) &&
          !SOURCE_HOSTS.includes(new URL(c.sourceUrl).host)
        )
          errors.push(
            `${where}: source must be Wikimedia Commons (found ${new URL(c.sourceUrl).host})`,
          );
        const hints = visual.describeHints ?? [];
        if (hints.length < 3 || hints.length > 5)
          errors.push(`${where}: describeHints needs 3-5 items (found ${hints.length})`);
        if (!img.width || !img.height) warnings.push(`${where}: width and height are missing`);
      }
  return { errors, warnings };
}

// ---------------------------------------------------------------------------------------------
// Vocabulary: approximation of the Cambridge B1 Preliminary Vocabulary List
// ---------------------------------------------------------------------------------------------

/**
 * The official list is a PDF owned by Cambridge and cannot be redistributed as a word list here, so this check is
 * an approximation: words of 12 or more letters (and a few typical C1 suffixes) that are not in `known` are reported.
 * `known` is the vocabulary of exams already reviewed as B1. Advice only, never an error.
 */
export function checkVocabulary(exam, known) {
  const texts = [];
  for (const section of exam.sections)
    for (const part of section.parts) {
      if (section.skill === 'speaking' || section.skill === 'writing') continue;
      texts.push(
        part.passage,
        ...(part.notices ?? []),
        ...(part.texts ?? []).map((t) => t.text),
        ...(part.people ?? []).map((t) => t.text),
      );
      for (const q of part.questions ?? []) texts.push(q.prompt, ...(q.options ?? []));
      for (const r of [part.recording, ...(part.clips ?? []).map((c) => c.recording)])
        if (r) texts.push(...r.turns.map((t) => t.text));
    }
  const flagged = new Map();
  for (const text of texts) {
    if (!text) continue;
    // Skip capitalised words that are not at the start of a sentence (names and places).
    const words = text.match(/(?<![.!?]\s)(?<!^)\b[A-Za-z]{12,}\b|^[A-Za-z]{12,}\b/g) ?? [];
    for (const raw of words) {
      const w = raw.toLowerCase();
      if (known.has(w)) continue;
      if (raw[0] === raw[0].toUpperCase() && raw[0] !== raw[0].toLowerCase()) continue;
      flagged.set(w, (flagged.get(w) ?? 0) + 1);
    }
  }
  const list = [...flagged.keys()];
  const warnings = list.length
    ? [
        `possible vocabulary above B1 (heuristic, not the Cambridge list): ${list.slice(0, 15).join(', ')}${list.length > 15 ? ` and ${list.length - 15} more` : ''}`,
      ]
    : [];
  return { errors: [], warnings };
}

/** Builds the `known` vocabulary: every word of 12+ letters used in the given (already reviewed) exams. */
export function knownVocabulary(exams) {
  const known = new Set();
  const add = (t) =>
    (
      String(t ?? '')
        .toLowerCase()
        .match(/[a-z]{12,}/g) ?? []
    ).forEach((w) => known.add(w));
  for (const exam of exams)
    JSON.stringify(exam, (k, v) => (typeof v === 'string' ? (add(v), v) : v));
  return known;
}

// ---------------------------------------------------------------------------------------------
// Across exams of the same board
// ---------------------------------------------------------------------------------------------

const GENERIC_NAMES =
  /^(a|an|the|two|friends|colleagues|couple|neighbours|neighbors|students|visitors|parent|customer|interviewer|presenter|announcer|customer|student|teacher|visitor|traveller|traveler|passenger|assistant|manager|receptionist|woman|man|boy|girl|speaker|guide|clerk|host|narrator|neighbour|colleague|friend|volunteer|cyclist|shop)\b/i;

function namesOf(exam) {
  const names = new Set();
  for (const { recording } of recordingsOf(exam))
    for (const s of recording.speakers) {
      const first = s.name.trim().split(/\s+/)[0];
      if (!GENERIC_NAMES.test(s.name.trim()) && /^[A-Z][a-z]+$/.test(first)) names.add(first);
    }
  for (const section of exam.sections)
    for (const part of section.parts) {
      for (const p of part.people ?? []) {
        const first = p.text.split(/\s+/)[0];
        if (/^[A-Z][a-z]+$/.test(first)) names.add(first);
      }
      for (const t of part.task ? [part.task] : (part.options ?? []))
        if (t.sourceEmail?.from && /^[A-Z][a-z]+$/.test(t.sourceEmail.from))
          names.add(t.sourceEmail.from);
    }
  return names;
}

/** Long texts that appear word for word in more than one exam. */
function textsOf(exam) {
  const out = [];
  for (const section of exam.sections)
    for (const part of section.parts) {
      for (const t of [
        part.passage,
        ...(part.notices ?? []),
        ...(part.texts ?? []).map((x) => x.text),
        ...(part.people ?? []).map((x) => x.text),
      ])
        if (t && wordCount(t) >= 8) out.push(t);
      for (const r of [part.recording, ...(part.clips ?? []).map((c) => c.recording)])
        if (r) {
          const t = r.turns.map((x) => x.text).join(' ');
          if (wordCount(t) >= 12) out.push(t);
        }
    }
  return out;
}

const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();

/** exams: parsed exam objects. Returns { errors, warnings } keyed by exam id. */
export function checkAcrossExams(exams) {
  const result = Object.fromEntries(exams.map((e) => [e.id, { errors: [], warnings: [] }]));
  for (let i = 0; i < exams.length; i++)
    for (let j = i + 1; j < exams.length; j++) {
      const a = exams[i];
      const b = exams[j];
      if (a.board !== b.board) continue;
      const shared = [...namesOf(a)].filter((n) => namesOf(b).has(n));
      if (shared.length >= 3)
        result[b.id].warnings.push(`shares names with ${a.id}: ${shared.join(', ')}`);
      if (norm(a.theme) === norm(b.theme))
        result[b.id].warnings.push(`same theme as ${a.id}: "${a.theme}"`);
      const ta = new Set(textsOf(a).map(norm));
      const dup = textsOf(b).filter((t) => ta.has(norm(t)));
      if (dup.length)
        result[b.id].errors.push(
          `${dup.length} text(s) are word for word the same as in ${a.id}: "${dup[0].slice(0, 60)}..."`,
        );
    }
  return result;
}

/** Texts whose heading does not match their content cannot be detected automatically; see docs/audit-2026.md. */
export function allQualityChecks(exam, { fileExists, known }) {
  const parts = [
    checkExplanations(exam),
    checkKeyDistribution(exam),
    checkOptionLength(exam),
    checkGaps(exam),
    checkListening(exam),
    checkMatching(exam),
    checkImages(exam, fileExists),
    checkVocabulary(exam, known),
  ];
  return {
    errors: parts.flatMap((p) => p.errors),
    warnings: parts.flatMap((p) => p.warnings),
  };
}

export { partWords };
