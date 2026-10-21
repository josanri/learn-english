export const STORAGE_KEY = 'northstar-practice-v3';
export const AUDIO_DATABASE = 'northstar-speech-recordings';
export const AUDIO_STORE = 'clips';
export const SPEECH_LANGUAGE = 'en-GB';

export const PAPER_SECTIONS = {
  reading: { label: 'READING', parts: 6 },
  writing: { label: 'WRITING', parts: 2 },
  listening: { label: 'LISTENING', parts: 4 },
  speaking: { label: 'SPEAKING', parts: 4 },
} as const;

export const SPEAKING_PART_LABELS = {
  interview: 'Getting to know you',
  'photo-description': 'Describe a photograph',
  'collaborative-task': 'Collaborative task',
  discussion: 'Discussion',
} as const;
