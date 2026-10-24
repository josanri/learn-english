import type { StorySummary } from '../../models/practice';
import {
  countWords,
  filterStories,
  parseParagraph,
  plainParagraph,
  readingMinutes,
  storyOfTheDay,
} from './reader-engine';

const story = (id: string, patch: Partial<StorySummary> = {}): StorySummary => ({
  id,
  title: id,
  summary: '',
  topic: 'Travel',
  level: 'B1',
  words: 300,
  ...patch,
});

describe('parseParagraph', () => {
  it('splits text and glossed words, with an optional key', () => {
    expect(parseParagraph('The {{harbour}} was {{busy|Crowded}}.')).toEqual([
      { kind: 'text', text: 'The ' },
      { kind: 'gloss', text: 'harbour', key: 'harbour' },
      { kind: 'text', text: ' was ' },
      { kind: 'gloss', text: 'busy', key: 'crowded' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('returns one text piece when nothing is glossed', () => {
    expect(parseParagraph('Plain text.')).toEqual([{ kind: 'text', text: 'Plain text.' }]);
  });

  it('removes the markers and counts words', () => {
    expect(plainParagraph('A {{very|v}} old {{boat}}.')).toBe('A very old boat.');
    expect(countWords(['One two {{three}}.', 'Four – five!'])).toBe(5);
    expect(readingMinutes(40)).toBe(1);
    expect(readingMinutes(450)).toBe(3);
  });
});

describe('story lists', () => {
  const stories = [
    story('a'),
    story('b', { level: 'A2+' }),
    story('c', { topic: 'Food' }),
    story('d', { level: 'B1+', topic: 'Food' }),
  ];

  it('filters by level, topic and read state', () => {
    const finished = new Set(['c']);
    const ids = (filter: Parameters<typeof filterStories>[1]) =>
      filterStories(stories, filter, finished).map((s) => s.id);
    expect(ids({ level: 'all', topic: 'Food', unreadOnly: false })).toEqual(['c', 'd']);
    expect(ids({ level: 'all', topic: 'Food', unreadOnly: true })).toEqual(['d']);
    expect(ids({ level: 'A2+', topic: 'all', unreadOnly: false })).toEqual(['b']);
  });

  it('suggests a different unread story on different days', () => {
    const monday = storyOfTheDay(stories, new Set(), new Date(2026, 9, 26));
    const tuesday = storyOfTheDay(stories, new Set(), new Date(2026, 9, 27));
    expect(monday?.id).not.toBe(tuesday?.id);
  });

  it('skips finished stories and falls back when all are read', () => {
    const day = new Date(2026, 9, 26);
    const first = storyOfTheDay(stories, new Set(), day)!;
    const next = storyOfTheDay(stories, new Set([first.id]), day);
    expect(next?.id).not.toBe(first.id);
    const all = new Set(stories.map((s) => s.id));
    expect(storyOfTheDay(stories, all, day)?.id).toBe(first.id);
    expect(storyOfTheDay([], all, day)).toBeNull();
  });
});
