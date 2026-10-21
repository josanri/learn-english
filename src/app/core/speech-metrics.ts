/** Guidance only: simple counts of a spoken answer. They are NOT an official score. */
export interface SpeechMetrics {
  words: number;
  /** Seconds of audio, or null when the answer was typed. */
  durationSeconds: number | null;
  wordsPerMinute: number | null;
  /** Number of sentences, or null when the text has no end punctuation (recognition often omits it). */
  sentences: number | null;
  averageSentenceLength: number | null;
  uniqueWords: number;
  /** Type/token ratio (unique words divided by words) from 0 to 1; null below 10 words. */
  lexicalVariety: number | null;
  connectors: CountedWord[];
  fillers: CountedWord[];
}

export interface CountedWord {
  text: string;
  count: number;
}

/** B1 linking words and phrases worth using. Phrases are matched before single words. */
export const B1_CONNECTORS: readonly string[] = [
  'first of all',
  'on the other hand',
  'for example',
  'for instance',
  'in my opinion',
  'as well as',
  'in addition',
  'in conclusion',
  'as a result',
  'in fact',
  'what is more',
  'after that',
  'even though',
  'for this reason',
  'because of',
  'such as',
  'because',
  'however',
  'although',
  'though',
  'so',
  'but',
  'then',
  'also',
  'finally',
  'firstly',
  'secondly',
  'while',
  'whereas',
  'if',
  'when',
  'since',
  'unless',
  'therefore',
  'besides',
  'instead',
  'actually',
  'anyway',
];

/** Hesitation sounds and fillers. Words like "like" are left out because they are often normal. */
export const FILLERS: readonly string[] = [
  'you know',
  'i mean',
  'erm',
  'umm',
  'um',
  'uhm',
  'uh',
  'er',
  'eh',
  'hmm',
];

const SENTENCE_END = /[.!?]+(?=\s|$)/g;

/** Lower-case words (letters, digits and inner apostrophes). */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+(?:['’][a-z]+)?/g) ?? []).map((w) =>
    w.replace('’', "'"),
  );
}

/** Counts whole-word occurrences of each phrase in the token list (longer phrases win). */
function countPhrases(tokens: string[], phrases: readonly string[]): CountedWord[] {
  const counts = new Map<string, number>();
  const split = phrases
    .map((p) => ({ p, parts: p.split(' ') }))
    .sort((a, b) => b.parts.length - a.parts.length);
  let i = 0;
  while (i < tokens.length) {
    const hit = split.find(({ parts }) => parts.every((part, k) => tokens[i + k] === part));
    if (hit) {
      counts.set(hit.p, (counts.get(hit.p) ?? 0) + 1);
      i += hit.parts.length;
    } else {
      i += 1;
    }
  }
  return [...counts].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count);
}

export function analyzeSpeech(text: string, durationSeconds: number | null): SpeechMetrics {
  const tokens = tokenize(text);
  const words = tokens.length;
  const unique = new Set(tokens).size;
  const ends = text.match(SENTENCE_END)?.length ?? 0;
  const sentences = ends > 0 ? ends : null;
  const duration = durationSeconds !== null && durationSeconds > 0 ? durationSeconds : null;
  return {
    words,
    durationSeconds: duration,
    wordsPerMinute: duration !== null && words > 0 ? Math.round((words / duration) * 60) : null,
    sentences,
    averageSentenceLength: sentences ? Math.round((words / sentences) * 10) / 10 : null,
    uniqueWords: unique,
    lexicalVariety: words >= 10 ? Math.round((unique / words) * 100) / 100 : null,
    connectors: countPhrases(tokens, B1_CONNECTORS),
    fillers: countPhrases(tokens, FILLERS),
  };
}

/** Useful phrases to practise, by kind of speaking part. */
export const USEFUL_PHRASES: Record<string, readonly string[]> = {
  interview: [
    'I usually...',
    'The reason is that...',
    'One thing I really enjoy is...',
    'I would rather... because...',
    'Last weekend I...',
  ],
  'photo-description': [
    'In this picture I can see...',
    'In the background there is...',
    'They seem to be... because...',
    'It looks as if...',
    'I think they might be feeling...',
  ],
  'collaborative-task': [
    'I think we should choose... because...',
    'Another option is...',
    'On the other hand,...',
    'What do you think about...?',
    'In the end, I would pick... because...',
  ],
  discussion: [
    'In my opinion,...',
    'For example,...',
    'I agree up to a point, but...',
    'It depends on...',
    'The main advantage is that...',
  ],
  'monologue-topic': [
    'First of all, I would like to talk about...',
    'Another important point is...',
    'For instance,...',
    'To sum up,...',
    'Personally, I think that...',
  ],
  'role-play': [
    'Could you tell me...?',
    'I would like to...',
    'Would it be possible to...?',
    'I am afraid that...',
    'Thank you very much for your help.',
  ],
};
