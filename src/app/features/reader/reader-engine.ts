import type { StoryLevel, StorySummary } from '../../models/practice';

/** Plain text inside a paragraph. */
export interface TextPart {
  kind: 'text';
  text: string;
}

/** A glossed word: `text` is shown, `key` is the glossary entry it opens. */
export interface GlossPart {
  kind: 'gloss';
  text: string;
  key: string;
}

/** A piece of a paragraph: plain text or a glossed word that opens its meaning. */
export type StoryPart = TextPart | GlossPart;

/** Splits `The {{harbour}} was {{busy|crowded}}.` into text and glossed pieces. */
export function parseParagraph(paragraph: string): StoryPart[] {
  const parts: StoryPart[] = [];
  const pattern = /\{\{([^}|]+)(?:\|([^}]+))?\}\}/g;
  let last = 0;
  for (let match = pattern.exec(paragraph); match; match = pattern.exec(paragraph)) {
    if (match.index > last) parts.push({ kind: 'text', text: paragraph.slice(last, match.index) });
    const text = match[1];
    parts.push({ kind: 'gloss', text, key: (match[2] ?? text).toLowerCase() });
    last = match.index + match[0].length;
  }
  if (last < paragraph.length) parts.push({ kind: 'text', text: paragraph.slice(last) });
  return parts;
}

/** Paragraph text without the gloss markers. */
export function plainParagraph(paragraph: string): string {
  return parseParagraph(paragraph)
    .map((p) => p.text)
    .join('');
}

/** Number of words in the paragraphs (what the index stores as `words`). */
export function countWords(paragraphs: readonly string[]): number {
  return paragraphs
    .map(plainParagraph)
    .join(' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Reading time at about 150 words a minute, never less than one minute. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 150));
}

export const STORY_LEVELS: readonly StoryLevel[] = ['A2+', 'B1', 'B1+'];

export interface StoryFilter {
  level: StoryLevel | 'all';
  topic: string | 'all';
  /** Hide the stories already finished. */
  unreadOnly: boolean;
}

export function filterStories(
  stories: readonly StorySummary[],
  filter: StoryFilter,
  finished: ReadonlySet<string>,
): StorySummary[] {
  return stories.filter(
    (s) =>
      (filter.level === 'all' || s.level === filter.level) &&
      (filter.topic === 'all' || s.topic === filter.topic) &&
      (!filter.unreadOnly || !finished.has(s.id)),
  );
}

/**
 * The story suggested for today: the first unread story of the list, starting at a place that
 * changes every day, so a learner who opens the page daily sees a new suggestion.
 */
export function storyOfTheDay(
  stories: readonly StorySummary[],
  finished: ReadonlySet<string>,
  today: Date,
): StorySummary | null {
  if (stories.length === 0) return null;
  const day = Math.floor(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000,
  );
  for (let i = 0; i < stories.length; i++) {
    const story = stories[(day + i) % stories.length];
    if (!finished.has(story.id)) return story;
  }
  return stories[day % stories.length];
}
