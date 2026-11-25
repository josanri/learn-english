/**
 * Shape of the daily practice data (flashcards, phrasal verbs, graded reader) and of the progress
 * saved for it. Content files live in `assets/vocabulary/` and `assets/reader/`.
 */

/** One vocabulary flashcard (`assets/vocabulary/flashcards.json`). Definitions and examples are original. */
export interface Flashcard {
  /** Stable id, never renamed (it is the progress key). */
  id: string;
  /** Word or phrase on the front of the card. */
  w: string;
  /** Part of speech: `n`, `v`, `adj`, `adv`, `phr v`, `phr`. */
  p: string;
  /** Topic id (the B1 list topics plus `general`). */
  t: string;
  /** Simple definition in English. */
  d: string;
  /** Original example sentence that uses the word. */
  e: string;
}

export interface FlashcardTopic {
  id: string;
  name: string;
}

export interface FlashcardFile {
  topics: FlashcardTopic[];
  cards: Flashcard[];
}

/**
 * One phrasal verb (`assets/vocabulary/phrasal-verbs.json`). `example` marks the words of the
 * phrasal verb with double brackets, for example `I [[gave up]] sugar` or `[[Turn]] it [[down]]`.
 */
export interface PhrasalVerb {
  /** Stable id, never renamed (it is the progress key). */
  id: string;
  /** Base form, for example `give up` or `run out of`. */
  verb: string;
  meaning: string;
  example: string;
  /** Group id used by the filter. */
  group: string;
  /** Ids of entries close enough in meaning that they must not be offered as wrong answers. */
  similar?: string[];
}

export interface PhrasalGroup {
  id: string;
  name: string;
}

export interface PhrasalVerbsFile {
  groups: PhrasalGroup[];
  verbs: PhrasalVerb[];
}

/** One line of `assets/reader/index.json`. */
export interface StorySummary {
  id: string;
  title: string;
  /** One-sentence teaser shown on the list. */
  summary: string;
  /** Topic label shown on the list, for example `Travel`. */
  topic: string;
  /** `A2+` stories are gentler, `B1` the target level, `B1+` a little harder. */
  level: StoryLevel;
  words: number;
}

export type StoryLevel = 'A2+' | 'B1' | 'B1+';

export interface StoryIndex {
  stories: StorySummary[];
}

export interface StoryGloss {
  /** Meaning in simple English. */
  meaning: string;
}

export interface StoryQuestion {
  question: string;
  options: string[];
  /** Index of the right option. */
  answer: number;
  /** Shown after answering: why the answer is right. */
  explanation: string;
}

/**
 * A story (`assets/reader/stories/<id>.json`). Paragraphs mark glossed words as `{{word}}` or
 * `{{shown text|key}}` when the text differs from the glossary key.
 */
export interface Story extends StorySummary {
  paragraphs: string[];
  glossary: Record<string, StoryGloss>;
  questions: StoryQuestion[];
}

/** Where a card is in the spaced-repetition schedule. A card without a record is new. */
export type CardStatus = 'learning' | 'review' | 'relearning';

/** Spaced-repetition record of one flashcard. */
export interface CardState {
  status: CardStatus;
  /** Index of the current learning or relearning step. */
  step: number;
  /** Ease factor (2.5 at the start, never below 1.3). */
  ease: number;
  /** Current interval in days (0 while the card has never graduated). */
  interval: number;
  /** When the card is due again (ISO time). */
  due: string;
  /** Number of answers given. */
  reps: number;
  /** Number of times a review card was forgotten. */
  lapses: number;
  /** Time of the last answer (ISO). */
  last: string;
  /** Local day (`YYYY-MM-DD`) on which the card was first studied (counts towards the new-card limit). */
  added: string;
}

/** Practice record of one phrasal verb. */
export interface PhrasalProgress {
  right: number;
  wrong: number;
  /** Local day (`YYYY-MM-DD`) of the last answer. */
  lastSeen: string;
  /** Right answers in a row; three or more counts as learnt. */
  streak: number;
}

/** Result of the last time a story was finished. */
export interface StoryProgress {
  finishedAt: string;
  correct: number;
  total: number;
}

/**
 * One item of "My mistakes". The key is `exam:<examId>:<itemId>` or `phrasal:<verbId>`; the item
 * text is not copied, it is read again from the content file.
 */
export interface MistakeState {
  /** When the item was last answered incorrectly in an exam or a trainer (ISO time). */
  added: string;
  /** Review schedule; missing until the first review. */
  card?: CardState;
}

export interface PracticeState {
  cards: Record<string, CardState>;
  /** New flashcards introduced per day. */
  newPerDay: number;
  phrasal: Record<string, PhrasalProgress>;
  stories: Record<string, StoryProgress>;
  mistakes: Record<string, MistakeState>;
  /** Basic vocabulary words (same counters as the phrasal verbs), keyed by word id. */
  basic: Record<string, PhrasalProgress>;
  /** Ids of the speaking kit checklist items that the learner ticked. */
  checklist: string[];
}

/** One topic of the basic vocabulary (`assets/vocabulary/basic-vocabulary.json`). */
export interface BasicTopic {
  /** Stable id, used in the address (`/vocabulary/basic/<id>`). */
  id: string;
  name: string;
  /** One sentence shown under the name. */
  intro: string;
  /** Name of an icon of `shared/ui/icon.ts`. */
  icon: string;
  /** Picture of the topic: empty until a credited local file exists. */
  img: string;
  /** Original model sentences that use the words of the topic. */
  phrases: string[];
}

/**
 * One basic word. `e` marks the word with double brackets (`She has a red [[dress]].`); the marked
 * text is the word itself, so the gap exercise can blank it.
 */
export interface BasicWord {
  /** Stable id, never renamed (it is the progress key). */
  id: string;
  /** Word or short phrase, as the learner writes it. */
  w: string;
  /** Topic id. */
  t: string;
  /** Group label inside the topic, for example `Fruit`. */
  g: string;
  /** Simple definition in English. */
  d: string;
  /** Original example sentence with the word marked. */
  e: string;
  /** Full-colour picture of the word (`assets/images/basic/<id>.svg`), or empty. */
  img: string;
  /** Ids of words close enough in meaning that they must not be offered as wrong answers. */
  similar?: string[];
}

export interface BasicVocabularyFile {
  topics: BasicTopic[];
  words: BasicWord[];
}

/** One useful phrase of the speaking kit. */
export interface SpeakingPhrase {
  text: string;
  /** When to use it, in simple English. */
  use: string;
}

export interface SpeakingPhraseGroup {
  id: string;
  name: string;
  intro: string;
  phrases: SpeakingPhrase[];
}

/** One step of the four-step answer. */
export interface AnswerStep {
  title: string;
  hint: string;
  starters: string[];
}

export interface SpeakingQuestion {
  /** Stable id. */
  id: string;
  q: string;
  /** Original model answer that follows the four steps. */
  model: string;
}

export interface SpeakingQuestionTopic {
  id: string;
  name: string;
  questions: SpeakingQuestion[];
}

export interface ChecklistItem {
  /** Stable id, never renamed (it is the progress key). */
  id: string;
  text: string;
  /** App link that helps with the item, for example `/vocabulary/basic/clothes`. */
  link?: string;
}

/** `assets/speaking/speaking-kit.json`. */
export interface SpeakingKitFile {
  steps: AnswerStep[];
  example: { question: string; answer: string };
  phraseGroups: SpeakingPhraseGroup[];
  topics: SpeakingQuestionTopic[];
  checklist: ChecklistItem[];
}
