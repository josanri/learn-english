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

/** One tense or structure in the verb forms guide. */
export interface VerbFormSection {
  id: string;
  title: string;
  summary: string;
  tables: VerbFormTable[];
  uses: string[];
  signals: string[];
  examples: VerbFormExample[];
  mistakes: VerbFormMistake[];
  checks: VerbFormCheck[];
}

export interface VerbFormsFile {
  sections: VerbFormSection[];
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
