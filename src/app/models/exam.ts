/**
 * Exam data model, schema version 2.
 *
 * This file is the single source of truth for the shape of every exam JSON in `src/assets/exams/`.
 * `npm run schema:generate` derives a JSON Schema from it and `npm run validate:exams` checks every
 * exam against that schema plus board-specific rules. Keep this file free of Angular imports and
 * use only plain interfaces and type aliases so the schema generator can read it.
 */

export type ExamLevel = 'B1';

/** Boards/formats the app knows about. The type is open: any other string is also accepted. */
export type KnownExamBoard =
  | 'cambridge-pet' // Cambridge B1 Preliminary
  | 'eoi' // Escuela Oficial de Idiomas (Spain)
  | 'trinity-ise1' // Trinity ISE I
  | 'aptis-b1' // British Council Aptis
  | 'languagecert-b1' // LanguageCert International ESOL B1
  | 'oxford-test-b1'; // Oxford Test of English (B1 module)

export type ExamBoard = KnownExamBoard | (string & {});

export type Skill = 'reading' | 'writing' | 'listening' | 'speaking' | 'mediation';

// ---------------------------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------------------------

export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

/** A picture stored in the repository (or, for legacy items, a remote URL) with licence details. */
export interface ImageAsset {
  id: string;
  /** Local WebP, 1000 px wide, under `assets/images/exams/<examId>/` (relative to the site root). */
  src: string;
  /** Local WebP, 480 px wide, used in `srcset` for small screens. */
  srcSmall?: string;
  width?: number;
  height?: number;
  alt: string;
  credit: ImageCredit;
}

/** Multiple choice item. `answer` is the zero-based index into `options`. */
export interface ChoiceQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
}

/** A gap whose key is a single word/short phrase typed by the learner (or a letter for gapped text). */
export interface GapItem {
  id: string;
  answer: string;
  accepted?: string[];
  /** Why this is the answer, shown after marking (required by validate:exams). */
  explanation?: string;
}

/** A gap with a visible prompt, for note/sentence completion. */
export interface PromptedGap extends GapItem {
  prompt: string;
}

/** A statement judged true/false (and optionally "not given"). */
export interface StatementItem {
  id: string;
  text: string;
  answer: 'true' | 'false' | 'not-given';
  explanation?: string;
}

// ---------------------------------------------------------------------------------------------
// Audio: speakers and scripts with turns
// ---------------------------------------------------------------------------------------------

export interface SpeakerVoice {
  /** BCP 47 language tag used to pick a speech-synthesis voice. */
  lang: 'en-GB' | 'en-US' | 'en-AU' | 'en-IE' | 'en-CA' | 'en-IN' | 'en-ZA';
  gender?: 'female' | 'male';
  /** Speech rate multiplier (1 is normal). */
  rate?: number;
  /** Speech pitch multiplier (1 is normal). */
  pitch?: number;
}

export interface Speaker {
  id: string;
  name: string;
  voice: SpeakerVoice;
}

export interface ScriptTurn {
  speaker: string; // Speaker.id
  text: string;
}

/** A recording: who speaks and what they say, turn by turn. */
export interface Recording {
  speakers: Speaker[];
  turns: ScriptTurn[];
}

// ---------------------------------------------------------------------------------------------
// Parts. Every part has the same header and a discriminating `type`.
// ---------------------------------------------------------------------------------------------

export interface PartBase {
  /** Stable id such as `reading-3`; unique inside the exam. */
  id: string;
  /** Position inside its section, starting at 1. */
  number: number;
  title: string;
  instructions: string;
}

// ----- Reading -----

/** Several short notices/messages, one multiple-choice question per notice. */
export interface NoticesPart extends PartBase {
  type: 'notices';
  notices: string[];
  questions: ChoiceQuestion[];
}

/** Match people (`questions`, options are letters) to short texts. */
export interface MatchingPart extends PartBase {
  type: 'matching';
  people: { id: string; text: string }[];
  texts: { id: string; title: string; text: string }[];
  questions: ChoiceQuestion[];
}

/** One long text followed by multiple-choice questions. */
export interface MultipleChoiceTextPart extends PartBase {
  type: 'multiple-choice';
  passage: string;
  questions: ChoiceQuestion[];
}

/** Text with numbered gaps `[1]`..`[n]` to fill with lettered sentences; `gaps[].answer` is a letter. */
export interface GappedTextPart extends PartBase {
  type: 'gapped-text';
  passage: string;
  sentences: string[];
  gaps: GapItem[];
}

/** Text with numbered gaps; each gap is a multiple-choice question (vocabulary in context). */
export interface MultipleChoiceClozePart extends PartBase {
  type: 'multiple-choice-cloze';
  passage: string;
  questions: ChoiceQuestion[];
}

/** Text with numbered gaps; the learner types one word per gap. */
export interface OpenClozePart extends PartBase {
  type: 'open-cloze';
  passage: string;
  gaps: GapItem[];
}

/** Judge statements against a text as true, false or not given (EOI, Aptis, Oxford). */
export interface TrueFalseNotGivenPart extends PartBase {
  type: 'true-false-notgiven';
  passage: string;
  statements: StatementItem[];
}

/** Complete sentences with a word or short phrase taken from the text. */
export interface SentenceCompletionPart extends PartBase {
  type: 'sentence-completion';
  passage?: string;
  /** Maximum number of words allowed per gap. */
  maxWords?: number;
  gaps: PromptedGap[];
}

/** Text with numbered gaps filled from a shared word bank (more words than gaps). */
export interface GapFillWordBankPart extends PartBase {
  type: 'gap-fill-word-bank';
  passage: string;
  wordBank: string[];
  gaps: GapItem[];
}

/** Match a heading to each paragraph (`gaps[].answer` is the heading letter). */
export interface HeadingMatchingPart extends PartBase {
  type: 'heading-matching';
  paragraphs: { id: string; text: string }[];
  headings: string[];
  gaps: GapItem[];
}

export type ReadingPart =
  | NoticesPart
  | MatchingPart
  | MultipleChoiceTextPart
  | GappedTextPart
  | MultipleChoiceClozePart
  | OpenClozePart
  | TrueFalseNotGivenPart
  | SentenceCompletionPart
  | GapFillWordBankPart
  | HeadingMatchingPart;

// ----- Listening -----

/** One short recording with one multiple-choice question (several clips per part). */
export interface ListeningClip {
  id: string;
  recording: Recording;
  question: ChoiceQuestion;
}

/** Seven short monologues/dialogues, one question each (Cambridge Part 1). */
export interface ShortDialoguesPart extends PartBase {
  type: 'short-dialogues';
  clips: ListeningClip[];
}

/** Six short dialogues focusing on gist (Cambridge Part 2). */
export interface GistDialoguesPart extends PartBase {
  type: 'gist-dialogues';
  clips: ListeningClip[];
}

/** One monologue; the learner completes notes with one word per gap. */
export interface NoteCompletionPart extends PartBase {
  type: 'note-completion';
  recording: Recording;
  gaps: PromptedGap[];
}

/** A longer interview with several multiple-choice questions. */
export interface ListeningInterviewPart extends PartBase {
  type: 'listening-interview';
  recording: Recording;
  questions: ChoiceQuestion[];
}

/** Any recording followed by multiple-choice questions (EOI, Trinity, Oxford). */
export interface ListeningMultipleChoicePart extends PartBase {
  type: 'listening-multiple-choice';
  recording: Recording;
  questions: ChoiceQuestion[];
}

/** A recording followed by true/false statements. */
export interface ListeningTrueFalsePart extends PartBase {
  type: 'listening-true-false';
  recording: Recording;
  statements: StatementItem[];
}

/** Match speakers to opinions/topics (Aptis style); `gaps[].answer` is the letter of the option. */
export interface OpinionMatchingPart extends PartBase {
  type: 'opinion-matching';
  recording: Recording;
  options: string[];
  gaps: PromptedGap[];
}

export type ListeningPart =
  | ShortDialoguesPart
  | GistDialoguesPart
  | NoteCompletionPart
  | ListeningInterviewPart
  | ListeningMultipleChoicePart
  | ListeningTrueFalsePart
  | OpinionMatchingPart;

// ----- Writing -----

/**
 * One thing the answer must cover. The writing checker looks for the `keywords` in the learner's
 * text to tell whether the point seems to be covered: a keyword without spaces matches the start of
 * a word (`recycl` finds recycle, recycling), a keyword with spaces matches that phrase. Keywords
 * are lower case. `question` means the point is covered only if the text also contains a question.
 */
export interface ContentPoint {
  text: string;
  keywords: string[];
  question?: boolean;
}

export interface WritingTask {
  /** Kind of text requested. */
  kind: 'email' | 'article' | 'story' | 'message' | 'essay' | 'letter' | 'review';
  title: string;
  prompt: string;
  sourceEmail?: { from: string; subject: string; body: string };
  /** Content points the answer must cover. */
  notes?: string[];
  /** What the checker looks for in the answer (required for every writing task by `validate:exams`). */
  contentPoints?: ContentPoint[];
  /** Exact first sentence for a story. */
  openingSentence?: string;
  /** Target length, for example `about 100 words`. */
  wordCount: string;
}

/** Reply to a message (compulsory email). */
export interface EmailPart extends PartBase {
  type: 'email';
  task: WritingTask;
}

/** Choose one of several tasks (for example an article or a story). */
export interface ChoiceTaskPart extends PartBase {
  type: 'choice-task';
  options: WritingTask[];
}

/** Very short message/note (20-50 words) such as a text or a postcard. */
export interface ShortMessagePart extends PartBase {
  type: 'short-message';
  task: WritingTask;
}

/** Opinion or discursive essay with a thesis and reasons. */
export interface OpinionEssayPart extends PartBase {
  type: 'opinion-essay';
  task: WritingTask;
}

export type WritingPart = EmailPart | ChoiceTaskPart | ShortMessagePart | OpinionEssayPart;

// ----- Speaking -----

export interface SpeakingPrompt {
  id: string;
  prompt: string;
}

/** A visual prompt. Legacy items draw an illustration (`illustration`); real photos use `image`. */
export interface SpeakingVisual {
  id: string;
  title: string;
  alt: string;
  /** Name of a built-in illustration scene (replaced by photos in a later phase). */
  illustration?: string;
  /** A licensed photograph. */
  image?: ImageAsset;
  /** 3-5 things a learner can describe in the picture (people, place, activity...). */
  describeHints?: string[];
}

/** Personal questions on familiar topics. */
export interface InterviewSpeakingPart extends PartBase {
  type: 'interview';
  questions: SpeakingPrompt[];
}

/** Describe one photograph for about a minute. */
export interface PhotoDescriptionPart extends PartBase {
  type: 'photo-description';
  prompt: string;
  images: SpeakingVisual[];
}

/** Discuss a situation using several visual prompts and reach a decision. */
export interface CollaborativeTaskPart extends PartBase {
  type: 'collaborative-task';
  prompt: string;
  images: SpeakingVisual[];
}

/** Open follow-up questions on the topic. */
export interface DiscussionPart extends PartBase {
  type: 'discussion';
  questions: SpeakingPrompt[];
}

/** Prepared talk on a topic chosen from a list, followed by questions (Trinity ISE I). */
export interface MonologueTopicPart extends PartBase {
  type: 'monologue-topic';
  topics: SpeakingPrompt[];
  preparationSeconds: number;
  speakingSeconds: number;
  followUpQuestions: SpeakingPrompt[];
}

/** Simulated conversation in a situation (shop, hotel, phone call) with cue cards. */
export interface RolePlayPart extends PartBase {
  type: 'role-play';
  situation: string;
  roleDescription: string;
  cues: string[];
}

export type SpeakingPart =
  | InterviewSpeakingPart
  | PhotoDescriptionPart
  | CollaborativeTaskPart
  | DiscussionPart
  | MonologueTopicPart
  | RolePlayPart;

// ----- Mediation -----

/** Read a source text and explain/summarise its key points for a given audience (CEFR mediation). */
export interface MediationTextPart extends PartBase {
  type: 'mediation-text';
  sourceText: string;
  /** Who the learner is writing/speaking for, and why. */
  audience: string;
  task: string;
  /** Key points a good answer should relay. */
  keyPoints: string[];
  wordCount: string;
}

export type MediationPart = MediationTextPart;

export type Part = ReadingPart | WritingPart | ListeningPart | SpeakingPart | MediationPart;

// ---------------------------------------------------------------------------------------------
// Sections and exams
// ---------------------------------------------------------------------------------------------

export interface ReadingSection {
  skill: 'reading';
  timeLimitMinutes: number;
  parts: ReadingPart[];
}
export interface WritingSection {
  skill: 'writing';
  timeLimitMinutes: number;
  parts: WritingPart[];
}
export interface ListeningSection {
  skill: 'listening';
  timeLimitMinutes: number;
  parts: ListeningPart[];
}
export interface SpeakingSection {
  skill: 'speaking';
  timeLimitMinutes: number;
  parts: SpeakingPart[];
}
export interface MediationSection {
  skill: 'mediation';
  timeLimitMinutes: number;
  parts: MediationPart[];
}

export type Section =
  ReadingSection | WritingSection | ListeningSection | SpeakingSection | MediationSection;

export interface Exam {
  schemaVersion: 2;
  id: string;
  level: ExamLevel;
  board: ExamBoard;
  title: string;
  subtitle: string;
  theme: string;
  estimatedMinutes: number;
  sections: Section[];
}

/** Lightweight listing entry generated into `index.json` (no questions or scripts). */
export interface ExamSummary {
  id: string;
  level: ExamLevel;
  board: ExamBoard;
  title: string;
  subtitle: string;
  theme: string;
  estimatedMinutes: number;
  skills: Skill[];
  /** Path relative to `assets/exams/`, for example `b1/cambridge-pet/cambridge-pet-01.json`. */
  path: string;
}

export interface BoardInfo {
  id: ExamBoard;
  name: string;
  description: string;
}

/** Contents of `assets/exams/<level>/index.json`. */
export interface LevelIndex {
  schemaVersion: 2;
  level: ExamLevel;
  boards: BoardInfo[];
  exams: ExamSummary[];
}
