import type { VocabularyWord } from '../../models/vocabulary';

export const DICTIONARY_ROOT = 'https://dictionary.cambridge.org/dictionary/english/';

/** Cambridge Dictionary page of a headword: first alternative, no brackets, words joined by hyphens. */
export function dictionaryUrl(word: string): string {
  const first = word.split('/')[0] ?? word;
  const slug = first
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${DICTIONARY_ROOT}${slug}`;
}

/** First letter used for the A-Z filter. */
export function initialOf(word: string): string {
  const letter = word.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}

export interface VocabularyFilter {
  query: string;
  topic: string;
  letter: string;
  /** `all`, or one of `n v adj adv prep conj pron det phr`. */
  pos: string;
}

function hasPos(word: VocabularyWord, pos: string): boolean {
  if (pos === 'all') return true;
  const type = word.p ?? '';
  return pos === 'phr' ? type.includes('phr v') : type.split(/[\s,&]+/).includes(pos);
}

export function filterWords(
  words: readonly VocabularyWord[],
  filter: VocabularyFilter,
): VocabularyWord[] {
  const query = filter.query.trim().toLowerCase();
  return words.filter(
    (word) =>
      (filter.topic === 'all' || (word.t ?? []).includes(filter.topic)) &&
      (filter.letter === 'all' || initialOf(word.w) === filter.letter) &&
      hasPos(word, filter.pos) &&
      (query === '' || word.w.toLowerCase().includes(query)),
  );
}
