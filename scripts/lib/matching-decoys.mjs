// Measures how much a wrong text of the matching part (Reading part 2) looks like the right one.
// In the real paper a candidate often hesitates between two texts that share a detail (a day, a place, a topic),
// and only one detail decides. A decoy here is a wrong text that shares at least `MIN_SHARED` content words with
// the person description, and at most three fewer than the right text.
const STOP = new Set(
  `a an the and or but of to in on at for with from by as is are was be been can could would will want wants like likes
  would he she they it his her their its who which that this these some any very also only too not no so if when while
  where what how about into out up all one two get gets go goes need needs your you we our there than then them him
  have has had do does enjoy enjoys interested looking look find place new more most much many each every other`.split(
    /\s+/,
  ),
);
const stem = (w) => w.replace(/(ing|ed|es|s|ly)$/, '');

export function contentStems(text) {
  return new Set(
    (text.toLowerCase().match(/[a-z]+/g) ?? [])
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map(stem),
  );
}

export const MIN_SHARED = 2;

/** Per person: { id, shared: {letter: n}, key, decoy: letter|null }. */
export function analyseMatching(part) {
  return part.questions.map((q, i) => {
    const person = contentStems(part.people[i].text);
    const shared = {};
    for (const t of part.texts) {
      const words = contentStems(`${t.title} ${t.text}`);
      shared[t.id] = [...person].filter((w) => words.has(w)).length;
    }
    const key = 'ABCDEFGH'[q.answer];
    const decoy =
      Object.entries(shared)
        .filter(([id, n]) => id !== key && n >= MIN_SHARED && n >= shared[key] - 3)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { id: q.id, shared, key, decoy };
  });
}
