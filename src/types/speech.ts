export type RecognitionAlternative = { transcript: string; confidence: number };
export type RecognitionResult = ArrayLike<RecognitionAlternative> & { isFinal?: boolean };
export type RecognitionEvent = Event & { results: ArrayLike<RecognitionResult> };
export type RecognitionErrorEvent = Event & { error: string; message?: string };

export interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(audioTrack?: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
}

export interface BrowserSpeechRecognitionConstructor {
  new(): BrowserSpeechRecognition;
  available?: (options: { langs: string[]; processLocally: boolean; quality?: 'command' | 'dictation' | 'conversation' }) => Promise<string>;
}

export type SpeechWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

export type CaptureStatus = 'idle' | 'checking' | 'recording' | 'saving' | 'error';
