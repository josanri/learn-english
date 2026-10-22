// Per-board paper-shape rules for the exam validator (pure functions, tested in exam-rules.test.mjs).
// The data lives in BOARD_SPECS; docs/exam-formats.md documents the same numbers with their sources.
//
// Sources (public specifications, consulted 2026-10):
//  - cambridge-pet  https://www.cambridgeenglish.org/exams-and-tests/preliminary/exam-format/
//                   (Reading 6 parts / 32 items, Writing 2 parts, Listening 4 parts / 25 items, Speaking 4 parts)
//  - eoi            Escuelas Oficiales de Idiomas, Pruebas de Certificacion, "Especificaciones de examen Nivel Intermedio B1" 2024-25:
//                   https://www.educa.jcyl.es/otrasensenanzas/en/ensenanzas-idiomas/pruebas-certificacion.files/1759578-Especificaciones_B1_24-25.pdf
//                   (CTE and CTO: at least 3 tasks and 25 items; PyCE: 2 tasks, max 250 words in total; PyCO: 2 tasks;
//                   Mediation: 2 tasks, written max 100 words, written source max 200 words; reading texts max 1200 words)
//  - trinity-ise1   Trinity College London, ISE Specifications Reading & Writing (Third Edition), ISE I task specifications:
//                   https://examenestrinity.elblogdeidiomas.es/wp-content/uploads/2016/11/ISE-Specifications-Reading-Writing-Third-Edition-2.pdf
//                   and https://www.trinitycollege.com/qualifications/english-language/ISE/ISE-I-B1-resources
//                   (Task 1 long reading 15 items, Task 2 multi-text reading 15 items, Tasks 3 and 4: 100-130 words;
//                   Speaking & Listening: topic task, conversation task, two independent listening tasks)
//  - aptis-b1       British Council Aptis General test format overview:
//                   https://www.britishcouncil.org/sites/default/files/aptis_general_test_format_overview_2023_0.pdf
//                   (Reading 4 parts, Listening 4 parts / 25 items, Writing 4 parts, Speaking 4 parts). Grammar & vocabulary core is not modelled.
//  - languagecert-b1 LanguageCert International ESOL, B1 "Achiever" level specification (handbook):
//                   https://languagecert.org/-/media/B653A182682F46C2BC27280AD4364693.ashx
//                   (Listening 7+6+7+6 items, Reading 5+6+7+8 items, Writing 70-100 and 100-120 words)
//  - oxford-test-b1 Oxford University Press, Oxford Test of English B1 Practice Test 3 (official sample):
//                   https://online.oupe.es/ELT/OTE/practicetests/B1-3/ote-b1-practice-test3.pdf
//                   (Reading 6+6+6+4 items, Listening 5+5+5+5, Writing email 80-130 and essay/review 100-160 words,
//                   Speaking interview 8 questions, two voice messages, a talk and 6 follow-up questions)
//
// Rules that follow a published number are errors. Text-length ranges (our own guidance) are warnings.

/** Number of marked items or prompts in a part. */
export function countItems(part) {
  if (Array.isArray(part.clips)) return part.clips.length;
  if (part.type === 'notices') return part.questions?.length ?? 0;
  if (part.type === 'interview' || part.type === 'discussion') return part.questions.length;
  if (part.type === 'monologue-topic') return part.topics.length;
  if (part.type === 'photo-description' || part.type === 'collaborative-task')
    return part.images.length;
  if (Array.isArray(part.questions)) return part.questions.length;
  if (Array.isArray(part.gaps)) return part.gaps.length;
  if (Array.isArray(part.statements)) return part.statements.length;
  return 0;
}

export function wordCount(text) {
  return String(text ?? '')
    .replace(/\[\d+\]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Words in all the reading material of a part. */
export function partWords(part) {
  const bits = [
    part.passage,
    ...(part.notices ?? []),
    ...(part.texts ?? []).map((t) => t.text),
    ...(part.paragraphs ?? []).map((t) => t.text),
    ...(part.people ?? []).map((t) => t.text),
  ];
  return bits.reduce((sum, t) => sum + wordCount(t), 0);
}

/** "about 100 words", "70-100 words", "80–130 words" -> { min, max }; null if no number. */
export function parseWordRange(text) {
  const s = String(text ?? '');
  const range = s.match(/(\d+)\s*[-–—to]+\s*(\d+)/);
  if (range) return { min: +range[1], max: +range[2] };
  const one = s.match(/(\d+)/);
  return one ? { min: +one[1], max: +one[1] } : null;
}

const T = (...types) => types;
const writingTasks = (part) => (part.task ? [part.task] : (part.options ?? []));

/**
 * Declarative shape per board and skill.
 * part spec: types (allowed), items (exact count), itemsMin, options (exact option count of every question),
 * words [min, max] (warning), texts (exact number of texts), sentences (exact), people.
 */
export const BOARD_SPECS = {
  'cambridge-pet': {
    skills: ['reading', 'writing', 'listening', 'speaking'],
    parts: {
      reading: [
        { types: T('notices'), items: 5, options: 3 },
        { types: T('matching'), items: 5, texts: 8, distinctKeys: true },
        { types: T('multiple-choice'), items: 5, options: 3, words: [140, 400] },
        { types: T('gapped-text'), items: 5, sentences: 6, words: [100, 350], distinctKeys: true },
        { types: T('multiple-choice-cloze'), items: 6, options: 4, words: [60, 250] },
        { types: T('open-cloze'), items: 6, words: [60, 250] },
      ],
      writing: [
        { types: T('email') },
        { types: T('choice-task'), options: 2, kinds: ['article', 'story'] },
      ],
      listening: [
        { types: T('short-dialogues'), items: 7, options: 3 },
        { types: T('gist-dialogues'), items: 6, options: 3 },
        { types: T('note-completion'), items: 6 },
        { types: T('listening-interview'), items: 6, options: 3 },
      ],
      speaking: [
        { types: T('interview'), itemsMin: 3 },
        { types: T('photo-description'), items: 1 },
        { types: T('collaborative-task'), itemsMin: 4 },
        { types: T('discussion'), itemsMin: 3 },
      ],
    },
    writingWords: { email: [80, 120], article: [80, 120], story: [80, 120] },
  },

  eoi: {
    skills: ['reading', 'listening', 'writing', 'speaking', 'mediation'],
    sections: {
      reading: { partsMin: 3, itemsMin: 25, wordsMax: 1200 },
      listening: { partsMin: 3, itemsMin: 25 },
      writing: { parts: 2, totalWordsMax: 250 },
      speaking: { parts: 2 },
      mediation: { parts: 2 },
    },
    parts: {
      speaking: [
        { types: T('monologue-topic') },
        { types: T('role-play', 'discussion', 'interview', 'collaborative-task') },
      ],
      mediation: [{ types: T('mediation-text') }, { types: T('mediation-text') }],
    },
    mediationSourceMax: 200,
    mediationWordsMax: 100,
  },

  'trinity-ise1': {
    skills: ['reading', 'writing', 'listening', 'speaking'],
    sections: {
      reading: { partsMin: 2, items: 30 },
      writing: { parts: 2 },
      listening: { partsMin: 2 },
      speaking: { partsMin: 2 },
    },
    parts: {
      speaking: [{ types: T('monologue-topic') }, { types: T('discussion', 'interview') }],
    },
    writingWordsAll: [100, 130],
  },

  'aptis-b1': {
    skills: ['reading', 'writing', 'listening', 'speaking'],
    sections: {
      reading: { parts: 4 },
      listening: { parts: 4, itemsWarn: [17, 28] },
      writing: { parts: 4 },
      speaking: { parts: 4 },
    },
  },

  'languagecert-b1': {
    skills: ['reading', 'writing', 'listening', 'speaking'],
    parts: {
      reading: [
        { types: T('notices'), items: 5, options: 3 },
        { types: T('gapped-text'), items: 6, sentences: 7, distinctKeys: true },
        { types: T('matching'), items: 7, texts: 4 },
        { types: T('sentence-completion'), items: 8, maxWords: 3 },
      ],
      listening: [
        { types: T('short-dialogues'), items: 7, options: 3 },
        { types: T('listening-multiple-choice', 'gist-dialogues'), items: 6, options: 3 },
        { types: T('note-completion'), items: 7 },
        { types: T('listening-interview', 'listening-multiple-choice'), items: 6, options: 3 },
      ],
      writing: [
        { types: T('short-message', 'email') },
        { types: T('short-message', 'email', 'opinion-essay') },
      ],
      speaking: [],
    },
    sections: { speaking: { partsMin: 2 } },
    writingWordsByPart: [
      [70, 100],
      [100, 120],
    ],
  },

  'oxford-test-b1': {
    skills: ['reading', 'writing', 'listening', 'speaking'],
    parts: {
      reading: [
        { types: T('notices'), items: 6, options: 3 },
        { types: T('matching'), items: 6 },
        { types: T('gapped-text'), items: 6, sentences: 7, distinctKeys: true },
        { types: T('multiple-choice'), items: 4 },
      ],
      listening: [
        { types: T('short-dialogues'), items: 5, options: 3 },
        { types: T('note-completion'), items: 5 },
        { types: T('listening-true-false', 'opinion-matching'), items: 5 },
        { types: T('gist-dialogues', 'listening-multiple-choice'), items: 5, options: 3 },
      ],
      writing: [{ types: T('email') }, { types: T('choice-task'), options: 2 }],
      speaking: [
        { types: T('interview'), items: 8 },
        { types: T('role-play') },
        { types: T('monologue-topic'), followUps: 6 },
      ],
    },
    writingWordsByPart: [
      [80, 130],
      [100, 160],
    ],
  },
};

/** Returns { errors: string[], warnings: string[] } for the exam's board; unknown boards get only a warning. */
export function checkBoardRules(exam) {
  const errors = [];
  const warnings = [];
  const spec = BOARD_SPECS[exam.board];
  if (!spec) {
    warnings.push(
      `no structural rules for board "${exam.board}" (add them to scripts/lib/board-rules.mjs)`,
    );
    return { errors, warnings };
  }
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const got = exam.sections.map((s) => s.skill);
  if (got.join() !== spec.skills.join()) {
    err(`sections must be ${spec.skills.join(', ')} (found ${got.join(', ') || 'none'})`);
    return { errors, warnings };
  }
  const bySkill = Object.fromEntries(exam.sections.map((s) => [s.skill, s]));

  for (const skill of spec.skills) {
    const section = bySkill[skill];
    const rules = spec.sections?.[skill] ?? {};
    const partSpecs = spec.parts?.[skill];
    const label = skill[0].toUpperCase() + skill.slice(1);
    const n = section.parts.length;

    if (rules.parts !== undefined && n !== rules.parts)
      err(`${label} must have ${rules.parts} parts (found ${n})`);
    if (rules.partsMin !== undefined && n < rules.partsMin)
      err(`${label} needs at least ${rules.partsMin} parts (found ${n})`);
    if (partSpecs?.length && n !== partSpecs.length)
      err(`${label} must have exactly ${partSpecs.length} parts (found ${n})`);

    const total = section.parts.reduce((s, p) => s + countItems(p), 0);
    if (rules.items !== undefined && total !== rules.items)
      err(`${label} must have ${rules.items} items (found ${total})`);
    if (rules.itemsMin !== undefined && total < rules.itemsMin)
      err(`${label} needs at least ${rules.itemsMin} items (found ${total})`);
    if (rules.itemsWarn && (total < rules.itemsWarn[0] || total > rules.itemsWarn[1]))
      warn(
        `${label} has ${total} items; the public spec suggests ${rules.itemsWarn[0]}-${rules.itemsWarn[1]}`,
      );
    if (rules.wordsMax) {
      const words = section.parts.reduce((s, p) => s + partWords(p), 0);
      if (words > rules.wordsMax)
        err(`${label} texts have ${words} words; the maximum is ${rules.wordsMax}`);
    }

    (partSpecs ?? []).forEach((ps, i) => {
      const part = section.parts[i];
      if (!part) return;
      const where = `${label} part ${i + 1}`;
      if (!ps.types.includes(part.type))
        err(`${where} should use ${ps.types.join(' or ')} (found ${part.type})`);
      const items = countItems(part);
      if (ps.items !== undefined && items !== ps.items)
        err(`${where} should have ${ps.items} items, found ${items}`);
      if (ps.itemsMin !== undefined && items < ps.itemsMin)
        err(`${where} needs at least ${ps.itemsMin} items, found ${items}`);
      if (ps.options !== undefined) {
        const qs = part.clips ? part.clips.map((c) => c.question) : (part.questions ?? []);
        qs.forEach((q) => {
          if (q.options.length !== ps.options)
            err(`${q.id} should have ${ps.options} options (found ${q.options.length})`);
        });
      }
      if (ps.texts !== undefined && part.texts?.length !== ps.texts)
        err(`${where} must have ${ps.texts} texts`);
      if (ps.sentences !== undefined && part.sentences?.length !== ps.sentences)
        err(`${where} needs ${ps.sentences} sentence options for ${ps.items} gaps`);
      if (ps.distinctKeys) {
        const keys = (part.gaps ?? part.questions ?? []).map((g) =>
          typeof g.answer === 'number' ? g.answer : String(g.answer).toUpperCase(),
        );
        if (new Set(keys).size !== keys.length)
          err(`${where} uses the same key twice (each sentence or text can be used once)`);
      }
      if (ps.maxWords !== undefined && part.maxWords !== undefined && part.maxWords > ps.maxWords)
        err(`${where} allows ${part.maxWords} words per gap; the spec allows ${ps.maxWords}`);
      if (ps.words) {
        const w = partWords(part);
        if (w < ps.words[0] || w > ps.words[1])
          warn(`${where} has ${w} words; aim for ${ps.words[0]}-${ps.words[1]}`);
      }
      if (ps.kinds) {
        const kinds = (part.options ?? [])
          .map((t) => t.kind)
          .sort()
          .join(',');
        if (kinds !== [...ps.kinds].sort().join(','))
          err(`${where} tasks must be ${ps.kinds.join(' and ')}`);
      }
      if (ps.followUps !== undefined && part.followUpQuestions.length !== ps.followUps)
        err(`${where} needs ${ps.followUps} follow-up questions`);
    });

    // choice-task: `options` in the spec means the number of tasks to choose from.
    (partSpecs ?? []).forEach((ps, i) => {
      const part = section.parts[i];
      if (
        part?.type === 'choice-task' &&
        ps.options !== undefined &&
        part.options.length !== ps.options
      )
        err(`${label} part ${i + 1} needs ${ps.options} tasks to choose from`);
    });

    if (skill === 'writing') checkWriting(spec, section, err, warn);
  }

  if (exam.board === 'cambridge-pet') checkPetExtras(bySkill, err);
  if (exam.board === 'eoi') checkEoiMediation(spec, bySkill.mediation, err);
  return { errors, warnings };
}

function checkWriting(spec, section, err, warn) {
  const tasks = section.parts.map((p) => writingTasks(p));
  if (spec.writingWordsByPart) {
    spec.writingWordsByPart.forEach(([min, max], i) => {
      for (const t of tasks[i] ?? []) {
        const r = parseWordRange(t.wordCount);
        if (!r || r.min < min || r.max > max)
          err(`Writing part ${i + 1} word count should be ${min}-${max} (found "${t.wordCount}")`);
      }
    });
  }
  if (spec.writingWordsAll) {
    const [min, max] = spec.writingWordsAll;
    for (const t of tasks.flat()) {
      const r = parseWordRange(t.wordCount);
      if (!r || r.min < min || r.max > max)
        err(`Writing word count should be ${min}-${max} (found "${t.wordCount}")`);
    }
  }
  if (spec.writingWords) {
    for (const t of tasks.flat()) {
      const range = spec.writingWords[t.kind];
      const r = parseWordRange(t.wordCount);
      if (range && (!r || r.max < range[0] || r.min > range[1]))
        warn(`${t.kind} word count "${t.wordCount}" is outside ${range[0]}-${range[1]}`);
    }
  }
  if (spec.sections?.writing?.totalWordsMax) {
    const total = tasks.reduce(
      (s, ts) => s + Math.max(0, ...ts.map((t) => parseWordRange(t.wordCount)?.max ?? 0)),
      0,
    );
    if (total > spec.sections.writing.totalWordsMax)
      err(
        `Writing asks for ${total} words in total; the maximum is ${spec.sections.writing.totalWordsMax}`,
      );
  }
  for (const t of tasks.flat())
    if (t.kind === 'story' && !t.openingSentence)
      err(`story task "${t.title}" needs an opening sentence`);
  const first = section.parts[0];
  if (spec.skills.length && first && first.type === 'email' && first.task.kind !== 'email')
    err('Writing part 1 task kind should be email');
}

function checkPetExtras(bySkill, err) {
  const speaking = bySkill.speaking;
  speaking.parts.forEach((part, i) => {
    if (part.type === 'photo-description' && !part.prompt.trim())
      err(`Speaking part ${i + 1} needs a photo prompt`);
    if (part.type === 'collaborative-task' && !part.prompt.trim())
      err('Speaking part 3 needs a collaborative task prompt');
  });
}

function checkEoiMediation(spec, mediation, err) {
  for (const part of mediation.parts) {
    if (part.type !== 'mediation-text') continue;
    if (wordCount(part.sourceText) > spec.mediationSourceMax)
      err(`${part.id} source text is longer than ${spec.mediationSourceMax} words`);
    const r = parseWordRange(part.wordCount);
    if (r && r.max > spec.mediationWordsMax)
      err(`${part.id} answer length must be at most ${spec.mediationWordsMax} words`);
  }
}
