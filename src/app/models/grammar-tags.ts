import type { GrammarTag } from './exam';

export interface GrammarTagInfo {
  label: string;
  /** Id of the grammar guide that explains the point (`/grammar/<guide>`), if there is one. */
  guide?: string;
}

/** Every tag a cloze item can carry, in the order used by lists. */
export const GRAMMAR_TAGS: Record<GrammarTag, GrammarTagInfo> = {
  'verb-forms': { label: 'Verb forms and tenses', guide: 'verb-forms' },
  modals: { label: 'Modal verbs', guide: 'modals' },
  'verb-patterns': { label: 'Verb patterns (to, -ing)', guide: 'verb-patterns' },
  conditionals: { label: 'Conditionals', guide: 'conditionals' },
  'relative-clauses': { label: 'Relative clauses', guide: 'relative-clauses' },
  'linking-words': { label: 'Linking words', guide: 'linking-words' },
  comparisons: { label: 'Comparisons', guide: 'adjectives' },
  adverbs: { label: 'Adverbs (too, enough, still, yet)', guide: 'adverbs' },
  pronouns: { label: 'Pronouns and possessives', guide: 'possessives' },
  questions: { label: 'Question words', guide: 'questions' },
  prepositions: { label: 'Prepositions' },
  articles: { label: 'Articles (a, an, the)' },
  quantifiers: { label: 'Quantifiers (much, any, every)' },
  'phrasal-verbs': { label: 'Phrasal verbs', guide: 'phrasal-verbs' },
  'fixed-phrases': { label: 'Fixed phrases' },
  collocations: { label: 'Word partners (collocations)' },
  'word-choice': { label: 'Choosing the right word' },
};

export const GRAMMAR_TAG_IDS = Object.keys(GRAMMAR_TAGS) as GrammarTag[];

export function isGrammarTag(value: unknown): value is GrammarTag {
  return typeof value === 'string' && Object.hasOwn(GRAMMAR_TAGS, value);
}
