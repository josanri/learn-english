import type { Part, Skill } from './exam';

export interface PartTypeInfo {
  skill: Skill;
  /** What the learner does in this kind of part, in a few words. */
  label: string;
}

/** Names of the auto-marked part types, used by the weak-area lists. */
export const MARKED_PART_TYPES: Partial<Record<Part['type'], PartTypeInfo>> = {
  notices: { skill: 'reading', label: 'Short notices and messages' },
  matching: { skill: 'reading', label: 'Matching people to texts' },
  'multiple-choice': { skill: 'reading', label: 'Questions on a long text' },
  'gapped-text': { skill: 'reading', label: 'Missing sentences' },
  'multiple-choice-cloze': { skill: 'reading', label: 'Choose the missing word' },
  'open-cloze': { skill: 'reading', label: 'Write the missing word' },
  'true-false-notgiven': { skill: 'reading', label: 'True, false or not given' },
  'sentence-completion': { skill: 'reading', label: 'Complete the sentences' },
  'gap-fill-word-bank': { skill: 'reading', label: 'Gaps with a word bank' },
  'heading-matching': { skill: 'reading', label: 'Headings for paragraphs' },
  'short-dialogues': { skill: 'listening', label: 'Short recordings' },
  'gist-dialogues': { skill: 'listening', label: 'Main idea of short recordings' },
  'note-completion': { skill: 'listening', label: 'Notes from a recording' },
  'listening-interview': { skill: 'listening', label: 'Long interview' },
  'listening-multiple-choice': { skill: 'listening', label: 'Questions on a recording' },
  'listening-true-false': { skill: 'listening', label: 'True or false (listening)' },
  'opinion-matching': { skill: 'listening', label: 'Matching opinions' },
};

export function partTypeInfo(type: string): PartTypeInfo | undefined {
  return Object.hasOwn(MARKED_PART_TYPES, type)
    ? MARKED_PART_TYPES[type as Part['type']]
    : undefined;
}
