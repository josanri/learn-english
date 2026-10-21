/**
 * Types shared by the writing checker (main thread and Web Worker). Plain data only, so every
 * value can be sent through `postMessage`.
 */

/** Group shown in the suggestions panel. */
export type IssueGroup = 'spelling' | 'grammar' | 'vocabulary';

/** `error` is a probable mistake; `note` is a gentle hint that may be fine in context. */
export type IssueSeverity = 'error' | 'note';

export type IssueSource = 'rules' | 'spelling' | 'languagetool';

/** One problem found in the text, located by character offsets (`end` is exclusive). */
export interface Issue {
  /** Stable for the same rule and position: `<ruleId>:<start>:<end>`. */
  id: string;
  ruleId: string;
  group: IssueGroup;
  severity: IssueSeverity;
  source: IssueSource;
  /** Short label such as "Preposition" or "False friend". */
  category: string;
  start: number;
  end: number;
  /** The text that is highlighted. */
  original: string;
  /** Plain-English explanation. */
  message: string;
  /** Replacements for the highlighted text, best first. May be empty (nothing is applied). */
  suggestions: string[];
}

/** A rule of `rules.json`. */
export interface RuleDef {
  id: string;
  group: 'grammar' | 'vocabulary';
  severity: IssueSeverity;
  category: string;
  /** JavaScript regular expression source. Apostrophes are matched as `'` (curly ones are normalised). */
  pattern: string;
  /** Regular expression flags, for example `gi`. `g` is always added. */
  flags: string;
  message: string;
  /**
   * Replacement templates. `$0` is the whole match, `$1`..`$9` capture groups and `$m1`..`$m9` the
   * capture group looked up (lower case) in `map`. Without `replacement` the rule only explains.
   */
  replacement?: string | string[];
  map?: Record<string, string>;
  /** Fix "a" and "an" in the replacement (used when the replacement reorders words). */
  fixArticle?: boolean;
  /** A text the rule must flag. */
  bad: string;
  /** A correct text the rule must not flag. */
  good: string;
  /** What `bad` becomes after applying the first suggestion. */
  fixed?: string;
}

export interface RuleFile {
  version: number;
  rules: RuleDef[];
}

/** What the checker needs to know about the task (kept small so it can be posted to the worker). */
export interface TaskSpec {
  kind: string;
  title: string;
  /** For example "about 100 words" or "30 to 50 words". */
  wordCount: string;
  contentPoints: { text: string; keywords: string[]; question?: boolean }[];
  openingSentence?: string;
}

export type ChecklistStatus = 'done' | 'todo' | 'info';

export interface ChecklistItem {
  id: string;
  /** Section shown in the panel. */
  kind: 'points' | 'form';
  label: string;
  status: ChecklistStatus;
  /** Short explanation shown under the label. */
  detail?: string;
}

export type SpellingState = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface CheckRequest {
  type: 'check';
  id: number;
  text: string;
  lang: 'en-GB' | 'en-US';
  /** Words never reported as misspelt (names from the task, the learner's name). */
  exceptions: string[];
  task: TaskSpec | null;
  /** Absolute URL of the folder with the dictionaries (`assets/dictionaries/`). */
  dictionaryBase: string;
}

export interface CheckResponse {
  type: 'result';
  id: number;
  /** `rules` arrives first (no dictionary needed); `full` adds spelling. */
  phase: 'rules' | 'full';
  issues: Issue[];
  checklist: ChecklistItem[];
  spelling: SpellingState;
}
