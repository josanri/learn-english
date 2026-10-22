/** Shape of `assets/vocabulary/*.json` (word lists taken from published exam vocabulary lists). */

export interface VocabularyTopic {
  id: string;
  name: string;
}

export interface VocabularyWord {
  /** Headword as printed in the list, for example `air conditioning` or `blond(e)`. */
  w: string;
  /** Part of speech as printed in the list, for example `n`, `adj & adv`, `phr v`. */
  p?: string;
  /** British (`Br`) or American (`Am`) English, when the list says so. */
  r?: 'Br' | 'Am';
  /** Topic ids from the list's topic appendix. */
  t?: string[];
  /** Short example phrase from the list, only where it separates meanings. */
  e?: string;
}

export interface VocabularyFile {
  source: { title: string; publisher: string; url: string };
  topics: VocabularyTopic[];
  words: VocabularyWord[];
}
