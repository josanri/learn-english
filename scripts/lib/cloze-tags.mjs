// Grammar tags of cloze items (open cloze gaps and multiple-choice cloze questions).
// `suggestTags` guesses the tag from the answer word, the options and the keywords of the
// explanation. `scripts/tag-cloze.mjs` writes the guesses into the exams; `checkClozeTags` (part of
// validate:exams) requires a valid tag on every cloze item. Keep GRAMMAR_TAGS equal to the
// `GrammarTag` type in src/app/models/exam.ts (a test compares them with the generated schema).

export const GRAMMAR_TAGS = [
  'verb-forms',
  'modals',
  'verb-patterns',
  'conditionals',
  'relative-clauses',
  'linking-words',
  'comparisons',
  'adverbs',
  'pronouns',
  'questions',
  'prepositions',
  'articles',
  'quantifiers',
  'phrasal-verbs',
  'fixed-phrases',
  'collocations',
  'word-choice',
];

export const CLOZE_TYPES = ['open-cloze', 'multiple-choice-cloze'];

const set = (words) => new Set(words.split(' '));

const ARTICLES = set('a an the');
const QUANTIFIERS = set(
  'much many any some every each few little no all both another none several lot lots most',
);
const PRONOUNS = set(
  'it its they them their theirs he him his she her hers we us our ours you your yours i me my mine myself yourself himself herself itself ourselves yourselves themselves one ones this these those there anything something nothing everything anyone someone everyone nobody somebody anybody everybody',
);
const MODALS = set(
  "can could must should would may might will shall ought cannot can't couldn't mustn't shouldn't won't need",
);
const AUXILIARIES = set(
  "be been being is are am was were have has had do does did don't doesn't didn't isn't aren't wasn't weren't haven't hasn't hadn't",
);
const LINKERS = set(
  'and but or so because while although though however when before after until till since unless once whereas whether instead also then despite if as nor yet otherwise therefore meanwhile',
);
const PREPOSITIONS = set(
  'at in on by for of with from about into onto over under between during except including through without to like near next across against along among around behind below beneath beside beyond inside outside past per towards toward up down off out upon within',
);
const PARTICLES = set('away back off up out over down around on in through along');
const QUESTION_WORDS = set('what how why where when who whose which whom');
const RELATIVES = set('who which whose whom that where when');
const ADVERBS = set(
  'too enough still yet already just even ever never again often always sometimes usually so such very really quite rather almost else here soon',
);
const COMPARATIVES = set('than more most less least as better best worse worst');

const lower = (s) => (s ?? '').toLowerCase().replace(/[’']/g, "'");
const words = (s) => lower(s).trim().split(/\s+/).filter(Boolean);
const allIn = (options, wordSet) =>
  options.length > 0 && options.every((o) => words(o).every((w) => wordSet.has(w)));

/** Grammar keywords of an explanation, checked in this order before the answer word. */
function fromExplanation(e) {
  if (/phrasal verb/.test(e)) return 'phrasal-verbs';
  if (/conditional|\bif\b clause|imaginary situation/.test(e)) return 'conditionals';
  if (/relative( clause| pronoun)?|refers back to|defining clause/.test(e))
    return 'relative-clauses';
  if (/compar|superlative|as \.\.\. as|as … as/.test(e)) return 'comparisons';
  if (/fixed (expression|phrase)|set phrase|idiom/.test(e)) return 'fixed-phrases';
  if (
    /passive|present perfect|past (simple|continuous|perfect)|present (simple|continuous)|future|tense|auxiliary|past participle|state verb|continuous/.test(
      e,
    )
  )
    return 'verb-forms';
  if (
    /infinitive|-ing\b|\bing form|gerund|base form|followed by (the )?(verb|to)|\bpattern\b/.test(e)
  )
    return 'verb-patterns';
  if (/followed by "?(with|to|of|in|on|at|for|about)\b|take different prepositions/.test(e))
    return 'collocations';
  return null;
}

/** Tag for an open cloze gap: `answer` is the expected word, `explanation` its reason. */
export function suggestOpenTag(answer, explanation) {
  const a = lower(answer).trim();
  const e = lower(explanation);
  const first = a.split(/\s+/)[0];

  if (/phrasal verb/.test(e)) return { tag: 'phrasal-verbs', sure: true };
  // A verb answer followed by a particle in the explanation: `"Turn on" a microphone`.
  if (
    !PREPOSITIONS.has(first) &&
    !PARTICLES.has(first) &&
    new RegExp(`\\b${first}\\s+(on|up|off|away|back|out|through|down)\\b`).test(e)
  )
    return { tag: 'phrasal-verbs', sure: true };
  if (/fixed (expression|phrase)|set phrase|idiom/.test(e))
    return { tag: 'fixed-phrases', sure: true };
  if (first === 'not') return { tag: 'verb-forms', sure: true };
  if (['more', 'less', 'better', 'worse', 'most', 'least'].includes(first))
    return { tag: 'comparisons', sure: true };
  if (/\bquestion\b|\basks?\b/.test(e) && QUESTION_WORDS.has(first))
    return { tag: 'questions', sure: true };
  if (
    RELATIVES.has(first) &&
    /relative|refers|links|describes|defin|the (person|place|thing|time)/.test(e)
  )
    return { tag: 'relative-clauses', sure: true };
  if (first === 'if' || first === 'unless' || /conditional/.test(e))
    return { tag: 'conditionals', sure: true };
  if (COMPARATIVES.has(first) && /compar|than|as \.\.\. as|as … as|superlative/.test(e))
    return { tag: 'comparisons', sure: true };
  if (ARTICLES.has(first)) return { tag: 'articles', sure: true };
  if (first === 'enough' || first === 'too') return { tag: 'adverbs', sure: true };
  if (QUANTIFIERS.has(first)) return { tag: 'quantifiers', sure: true };
  if (PRONOUNS.has(first)) return { tag: 'pronouns', sure: true };
  if (first === 'to') {
    if (/infinitive|purpose|in order|followed by/.test(e))
      return { tag: 'verb-patterns', sure: true };
    return { tag: 'prepositions', sure: true };
  }
  if (MODALS.has(first)) {
    if (/future|will for|prediction|promise/.test(e) && (first === 'will' || first === "won't"))
      return { tag: 'verb-forms', sure: true };
    return { tag: 'modals', sure: true };
  }
  if (AUXILIARIES.has(first)) return { tag: 'verb-forms', sure: true };
  if (first === 'so' && /so \+|so much|so many|so (\w+) that|very/.test(e))
    return { tag: 'adverbs', sure: true };
  if (
    ['before', 'after', 'until', 'since'].includes(first) &&
    /preposition|\+ noun|noun phrase|followed by a noun/.test(e)
  )
    return { tag: 'prepositions', sure: true };
  if (first === 'when' || first === 'where') {
    if (/question/.test(e)) return { tag: 'questions', sure: true };
    if (first === 'where') return { tag: 'relative-clauses', sure: true };
    return { tag: 'linking-words', sure: true };
  }
  if (first === 'what' || first === 'how' || first === 'why')
    return { tag: 'questions', sure: true };
  if (RELATIVES.has(first) && first !== 'that') return { tag: 'relative-clauses', sure: true };
  if (first === 'that') {
    // "Sorry that", "check that": a clause after a verb or adjective, not a relative clause.
    return { tag: 'linking-words', sure: true };
  }
  if (first === 'as') {
    if (/as soon as|as well|such as|as long as|as far as|as usual|as if/.test(e))
      return { tag: 'fixed-phrases', sure: true };
    return { tag: 'linking-words', sure: true };
  }
  if (LINKERS.has(first)) return { tag: 'linking-words', sure: true };
  if (
    PARTICLES.has(first) &&
    !['in', 'on', 'through'].includes(first) &&
    /\b(go|come|run|get|take|put|turn|look|give|throw|move|fly|keep|stay)s?\b/.test(e)
  )
    return { tag: 'phrasal-verbs', sure: false };
  if (PREPOSITIONS.has(first)) return { tag: 'prepositions', sure: true };
  if (ADVERBS.has(first)) return { tag: 'adverbs', sure: true };
  const fromE = fromExplanation(e);
  if (fromE) return { tag: fromE, sure: true };
  if (/we say|goes? with|collocat|(usual|common|natural) (phrase|word)|partner/.test(e))
    return { tag: 'collocations', sure: true };
  return { tag: 'word-choice', sure: false };
}

/** Options that are verb groups such as `has been`, `will be`, `to go`. */
function auxiliaryOptions(options) {
  return options.filter((o) => {
    const w = words(o);
    return w.length > 1 && (AUXILIARIES.has(w[0]) || MODALS.has(w[0]) || w[0] === 'to');
  }).length;
}

/** True when at least three options share their first letters (`go`, `going`, `gone`). */
function sameStemOptions(options) {
  const stems = options.map((o) => words(o).at(-1)?.slice(0, 3) ?? '');
  const counts = new Map();
  for (const s of stems) counts.set(s, (counts.get(s) ?? 0) + 1);
  return Math.max(...counts.values()) >= 3;
}

/** Tag for a multiple-choice cloze question. */
export function suggestChoiceTag(options, answerIndex, explanation) {
  const e = lower(explanation);
  if (/phrasal verb/.test(e)) return { tag: 'phrasal-verbs', sure: true };
  if (/compar|superlative/.test(e)) return { tag: 'comparisons', sure: true };
  const answer = words(options[answerIndex] ?? '').at(-1) ?? '';
  if (answer && new RegExp(`\\b${answer}\\s+(on|up|off|away|back|out|after|down)\\b`).test(e))
    return { tag: 'phrasal-verbs', sure: true };
  if (allIn(options, new Set([...QUANTIFIERS, ...COMPARATIVES])) && !allIn(options, COMPARATIVES))
    return { tag: 'quantifiers', sure: true };
  if (options.filter((o) => MODALS.has(words(o)[0])).length >= 3)
    return { tag: 'modals', sure: true };
  const auxiliaries = auxiliaryOptions(options);
  if (auxiliaries >= 2 || sameStemOptions(options)) {
    if (/after "?(should|can|must|could|would|might|may)\b/.test(e))
      return { tag: 'modals', sure: true };
    if (/infinitive|-ing\b|\bing form|gerund|base form|like to|followed by|\bpattern\b/.test(e))
      return { tag: 'verb-patterns', sure: true };
    if (auxiliaries >= 2 || fromExplanation(e) === 'verb-forms')
      return { tag: 'verb-forms', sure: true };
    // Forms of one word without a grammar reason (asleep / sleepy / sleeping): a meaning choice.
    return { tag: 'word-choice', sure: true };
  }
  if (allIn(options, AUXILIARIES)) return { tag: 'verb-forms', sure: true };
  if (/so \.\.\. that|so … that|such \.\.\. that/.test(e))
    return { tag: 'linking-words', sure: true };
  if (allIn(options, MODALS)) return { tag: 'modals', sure: true };
  const relative = /relative|refers to|a place where|a time when/.test(e);
  if (allIn(options, RELATIVES) && relative) return { tag: 'relative-clauses', sure: true };
  if (allIn(options, QUESTION_WORDS)) {
    return relative ? { tag: 'relative-clauses', sure: true } : { tag: 'questions', sure: true };
  }
  if (
    allIn(options, new Set(['if', 'unless', 'when', 'although', 'because'])) &&
    /conditional/.test(e)
  )
    return { tag: 'conditionals', sure: true };
  if (allIn(options, LINKERS)) return { tag: 'linking-words', sure: true };
  if (allIn(options, PREPOSITIONS)) return { tag: 'prepositions', sure: true };
  // Mixed sets such as during / while / between: the point is the word that links.
  if (allIn(options, new Set([...LINKERS, ...PREPOSITIONS])))
    return { tag: 'linking-words', sure: true };
  if (allIn(options, QUANTIFIERS)) return { tag: 'quantifiers', sure: true };
  if (allIn(options, PRONOUNS)) return { tag: 'pronouns', sure: true };
  if (allIn(options, ARTICLES)) return { tag: 'articles', sure: true };
  if (allIn(options, ADVERBS) || allIn(options, COMPARATIVES)) {
    return /compar|than|superlative/.test(e)
      ? { tag: 'comparisons', sure: true }
      : { tag: 'adverbs', sure: true };
  }
  if (/fixed (expression|phrase)|set phrase|idiom/.test(e))
    return { tag: 'fixed-phrases', sure: true };
  if (
    /we say|goes? with|go with|collocat|(usual|common|natural) (phrase|word|verb)|partner|do not go with|does not go with|is used with|you (do|make|take|have|get|give)\b/.test(
      e,
    )
  )
    return { tag: 'collocations', sure: true };
  const fromE = fromExplanation(e);
  if (fromE) return { tag: fromE, sure: true };
  // A meaning choice between content words is the normal case of this part type.
  return { tag: 'word-choice', sure: true };
}

/** Every cloze item of an exam with its part, for the tagger and the validator. */
export function clozeItems(exam) {
  const out = [];
  for (const section of exam.sections)
    for (const part of section.parts) {
      if (part.type === 'open-cloze') for (const g of part.gaps) out.push({ part, item: g });
      if (part.type === 'multiple-choice-cloze')
        for (const q of part.questions) out.push({ part, item: q });
    }
  return out;
}

/** Suggested tag of a cloze item. */
export function suggestTag(part, item) {
  return part.type === 'open-cloze'
    ? suggestOpenTag(item.answer, item.explanation)
    : suggestChoiceTag(item.options, item.answer, item.explanation);
}

/** Cloze items need at least one known tag. */
export function checkClozeTags(exam) {
  const errors = [];
  for (const { item } of clozeItems(exam)) {
    if (!Array.isArray(item.tags) || item.tags.length === 0) {
      errors.push(`${item.id} (cloze) has no grammar tag: run node scripts/tag-cloze.mjs`);
      continue;
    }
    for (const tag of item.tags)
      if (!GRAMMAR_TAGS.includes(tag)) errors.push(`${item.id} has an unknown tag "${tag}"`);
  }
  return { errors, warnings: [] };
}
