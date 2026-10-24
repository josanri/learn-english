/** Keys of `practice.mistakes` ("My mistakes"). The queue itself is in `features/mistakes`. */

/** Key of an exam item in `practice.mistakes`. */
export function examMistakeId(examId: string, itemId: string): string {
  return `exam:${examId}:${itemId}`;
}

/** Key of a phrasal verb in `practice.mistakes`. */
export function phrasalMistakeId(verbId: string): string {
  return `phrasal:${verbId}`;
}

export type MistakeRef =
  { kind: 'exam'; examId: string; itemId: string } | { kind: 'phrasal'; verbId: string };

/** Reads a `practice.mistakes` key back; null for an unknown shape. */
export function parseMistakeId(id: string): MistakeRef | null {
  const [kind, first, second, ...rest] = id.split(':');
  if (rest.length > 0) return null;
  if (kind === 'exam' && first && second) return { kind, examId: first, itemId: second };
  if (kind === 'phrasal' && first && second === undefined) return { kind, verbId: first };
  return null;
}
