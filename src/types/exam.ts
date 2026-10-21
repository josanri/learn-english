export type Option = { id: string; text: string };
export type ChoiceQuestion = { id: string; prompt: string; options: string[]; answer: number; explanation?: string };
export type ReadingPart = {
  part: number;
  type: 'notices' | 'matching' | 'multiple-choice' | 'gapped-text' | 'multiple-choice-cloze' | 'open-cloze';
  title: string;
  instructions: string;
  passage?: string | string[];
  questions?: ChoiceQuestion[];
  people?: { id: string; text: string }[];
  texts?: { id: string; title: string; text: string }[];
  sentences?: string[];
  gaps?: { id: string; answer: string; accepted?: string[] }[];
};
export type WritingTask = { type: 'email' | 'article' | 'story'; title: string; prompt: string; sourceEmail?: { from: string; subject: string; body: string }; notes?: string[]; openingSentence?: string; wordCount: string };
export type ListeningClip = { id: string; speaker: string; script: string; question: ChoiceQuestion };
export type ListeningPart = {
  part: number;
  type: 'short-dialogues' | 'gist-dialogues' | 'note-completion' | 'interview';
  title: string;
  instructions: string;
  clips?: ListeningClip[];
  script?: string;
  gaps?: { id: string; prompt: string; answer: string; accepted?: string[] }[];
  questions?: ChoiceQuestion[];
};
export type SpeakingImagePrompt = { id: string; scene: 'garden' | 'cooking' | 'cycling' | 'music' | 'classroom' | 'computer' | 'cafe' | 'train' | 'beach' | 'museum' | 'market' | 'park'; title: string; alt: string; photoUrl?: string; photoCredit?: string; photoSource?: string };
export type SpeakingPart = {
  part: number;
  type: 'interview' | 'photo-description' | 'collaborative-task' | 'discussion';
  title: string;
  instructions: string;
  prompt?: string;
  questions?: { id: string; prompt: string }[];
  images?: SpeakingImagePrompt[];
};
export type PracticeExam = {
  id: string;
  title: string;
  subtitle: string;
  theme: string;
  reading: ReadingPart[];
  writing: { part1: WritingTask; part2: [WritingTask, WritingTask] };
  listening: ListeningPart[];
  speaking: SpeakingPart[];
};
