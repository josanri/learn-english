/** A piece of a passage: plain text or the numbered gap marker `[n]`. */
export type PassageSegment = { type: 'text'; text: string } | { type: 'gap'; gap: number };

/** Splits `Some text [1] more [2]` into text and gap segments, in order. */
export function splitPassage(passage: string): PassageSegment[] {
  const segments: PassageSegment[] = [];
  const marker = /\[(\d+)\]/g;
  let last = 0;
  for (const match of passage.matchAll(marker)) {
    if (match.index > last) segments.push({ type: 'text', text: passage.slice(last, match.index) });
    segments.push({ type: 'gap', gap: Number(match[1]) });
    last = match.index + match[0].length;
  }
  if (last < passage.length) segments.push({ type: 'text', text: passage.slice(last) });
  return segments;
}

/** Paragraphs separated by blank lines; each keeps its own segments. */
export function splitParagraphs(passage: string): PassageSegment[][] {
  return passage
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(splitPassage);
}
