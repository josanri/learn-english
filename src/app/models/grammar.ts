/** Shape of the grammar data (`assets/grammar/*.json`) and of the saved practice progress. */

/** Which of the three forms are the same: `AAA` cut-cut-cut, `ABA` come-came-come, `ABB` make-made-made, `ABC` sing-sang-sung. */
export type VerbPattern = 'AAA' | 'ABA' | 'ABB' | 'ABC';

/** Extra accepted spellings (for example British and American forms). The main form is always accepted. */
export interface VerbAlternatives {
  past?: string[];
  participle?: string[];
}

export interface IrregularVerb {
  /** Stable id, never renamed (it is the progress key). */
  id: string;
  base: string;
  past: string;
  participle: string;
  alt?: VerbAlternatives;
  /** Original sentence with `{{past}}` where the past simple goes. */
  example: string;
  /** Original sentence with `{{participle}}` (perfect or passive use). */
  exampleParticiple: string;
  /** Short hint for the glossary (pronunciation, British and American use). */
  note?: string;
}

export interface IrregularVerbsFile {
  verbs: IrregularVerb[];
}

export interface VerbFormExample {
  text: string;
  /** Short explanation shown after the sentence. */
  note?: string;
}

export interface VerbFormMistake {
  wrong: string;
  right: string;
  why: string;
}

export interface VerbFormCheck {
  question: string;
  answer: string;
  explanation: string;
}

export interface VerbFormTable {
  caption: string;
  /** Column headings. */
  head: string[];
  rows: string[][];
}

/** CEFR level of a guide or of one section of it. */
export type GuideLevel = 'B1' | 'B2';

/** One tense or structure in a grammar guide. */
export interface GuideSection {
  id: string;
  /** Set when the section is harder than the level of its guide (for example a B2 part in a B1 guide). */
  level?: GuideLevel;
  title: string;
  summary: string;
  tables: VerbFormTable[];
  uses: string[];
  signals: string[];
  examples: VerbFormExample[];
  mistakes: VerbFormMistake[];
  checks: VerbFormCheck[];
}

/** A page of the grammar area (`assets/grammar/guides/<id>.json`). */
export interface GuideFile {
  id: string;
  title: string;
  /** Hardest level in the guide; sections can mark themselves as B2. */
  level: GuideLevel;
  intro: string;
  /** Pages the content was based on or that are worth reading next. */
  sources?: { label: string; url: string }[];
  sections: GuideSection[];
}

/** One line of the guide list shown on the grammar hub, in teaching order. */
export interface GuideSummary {
  id: string;
  title: string;
  level: GuideLevel;
  summary: string;
}

export interface GuideIndex {
  guides: GuideSummary[];
}

/** Practice record for one irregular verb. */
export interface VerbProgress {
  right: number;
  wrong: number;
  /** Local day (`YYYY-MM-DD`) of the last answer. */
  lastSeen: string;
  /** The learner marked the verb as known. */
  known: boolean;
  starred: boolean;
}

export interface GrammarProgress {
  verbs: Record<string, VerbProgress>;
}
