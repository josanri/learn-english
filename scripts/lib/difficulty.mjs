// Text measures for the exam difficulty report (scripts/exam-difficulty.mjs). Pure functions,
// tested in difficulty.test.mjs. These are rough signals, not a CEFR level: they help to find the
// exams whose texts are clearly longer, denser or richer in rare words than the others.

/**
 * Forms that the list gives only through a headword or in its appendices: be, have and do, the
 * contracted negatives and the numbers.
 */
const BASE_FORMS =
  "am is are isn't aren't has does doesn't don't didn't cannot can't won't wouldn't shouldn't couldn't would should could might may must shall " +
  'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million ' +
  "first second third fourth fifth sixth seventh eighth ninth tenth o'clock";

/** Every word form a learner of the B1 list knows: list words, simple inflections, irregular forms. */
export function knownWords(vocabulary, irregularVerbs) {
  const known = new Set(BASE_FORMS.split(' '));
  for (const entry of vocabulary.words) {
    for (const word of entry.w.toLowerCase().split(/[\s/,()]+/))
      if (/^[a-z'-]+$/.test(word)) known.add(word);
  }
  for (const verb of irregularVerbs.verbs) {
    const forms = [verb.base, verb.past, verb.participle, ...Object.values(verb.alt ?? {}).flat()];
    for (const form of forms)
      for (const w of String(form)
        .toLowerCase()
        .split(/[\s/]+/))
        known.add(w);
  }
  return known;
}

/** Base forms to try for a word: `stories` -> `story`, `stopped` -> `stop`, `quickly` -> `quick`. */
export function candidateLemmas(word) {
  const w = word.toLowerCase().replace(/'s$|s'$|'(m|ll|re|ve|d)$/, '');
  const out = new Set([w]);
  const add = (x) => x.length >= 2 && out.add(x);
  if (w.endsWith('ies')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('ied')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s')) add(w.slice(0, -1));
  for (const suffix of ['ed', 'ing', 'er', 'est']) {
    if (!w.endsWith(suffix)) continue;
    const stem = w.slice(0, -suffix.length);
    add(stem);
    add(`${stem}e`);
    if (/([b-df-hj-np-tv-z])\1$/.test(stem)) add(stem.slice(0, -1)); // stopped -> stop
    if (stem.endsWith('i')) add(`${stem.slice(0, -1)}y`); // happier -> happy
  }
  if (w.endsWith('ily')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('ly')) add(w.slice(0, -2));
  if (w.endsWith("n't")) add(w.slice(0, -3));
  return [...out];
}

/** Rough syllable count of an English word (vowel groups, silent final e). */
export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export function sentencesOf(text) {
  return String(text ?? '')
    .replace(/\[\d+\]/g, '___')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[A-Za-z]/.test(s));
}

/** Words of a text, with a flag for capitalised words inside a sentence (names, places). */
function tokens(sentence) {
  const words = sentence.match(/\p{L}[\p{L}'’-]*/gu) ?? [];
  return words.map((raw, i) => ({
    word: raw.replace(/’/g, "'").replace(/-+$/, ''),
    name: i > 0 && /^\p{Lu}/u.test(raw) && raw !== 'I',
  }));
}

/**
 * Measures a list of texts: words, words per sentence, Flesch reading ease (higher is easier)
 * and the share of words that are not in the B1 list (names and numbers are left out).
 */
export function measureTexts(texts, known) {
  let words = 0;
  let sentences = 0;
  let syllableCount = 0;
  let checked = 0;
  const offList = new Map();
  for (const text of texts) {
    for (const sentence of sentencesOf(text)) {
      const list = tokens(sentence);
      if (list.length === 0) continue;
      sentences++;
      for (const { word, name } of list) {
        words++;
        syllableCount += syllables(word);
        // Names, and single letters such as the p of "p.m.", are not vocabulary.
        if (name || (word.length === 1 && !/^[aiAI]$/.test(word))) continue;
        // Hyphenated words count as known when every piece is known.
        const pieces = word.toLowerCase().split('-').filter(Boolean);
        checked++;
        const isKnown = pieces.every((p) => candidateLemmas(p).some((c) => known.has(c)));
        if (!isKnown) offList.set(word.toLowerCase(), (offList.get(word.toLowerCase()) ?? 0) + 1);
      }
    }
  }
  const unknown = [...offList.values()].reduce((a, b) => a + b, 0);
  const perSentence = sentences ? words / sentences : 0;
  const flesch = words ? 206.835 - 1.015 * perSentence - 84.6 * (syllableCount / words) : 0;
  return {
    words,
    sentences,
    wordsPerSentence: round1(perSentence),
    flesch: round1(flesch),
    offListPercent: checked ? round1((unknown / checked) * 100) : 0,
    offListWords: [...offList].sort((a, b) => b[1] - a[1]).map(([w]) => w),
  };
}

/** Reading texts (passages, notices, texts, people) and listening scripts of an exam. */
export function examTexts(exam) {
  const reading = [];
  const listening = [];
  for (const section of exam.sections)
    for (const part of section.parts) {
      if (section.skill === 'reading')
        reading.push(
          part.passage,
          ...(part.notices ?? []),
          ...(part.texts ?? []).map((t) => t.text),
          ...(part.people ?? []).map((t) => t.text),
          ...(part.sentences ?? []),
        );
      if (section.skill === 'listening')
        for (const r of [part.recording, ...(part.clips ?? []).map((c) => c.recording)])
          if (r) listening.push(...r.turns.map((t) => t.text));
    }
  return { reading: reading.filter(Boolean), listening: listening.filter(Boolean) };
}

export function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function standardDeviation(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}

/** Values more than `limit` standard deviations from the mean, as { index, z }. */
export function outliers(values, limit = 2) {
  const m = mean(values);
  const sd = standardDeviation(values);
  if (sd === 0) return [];
  return values
    .map((v, index) => ({ index, z: round1((v - m) / sd) }))
    .filter(({ z }) => Math.abs(z) > limit);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
