import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Exam, Part, WritingPart } from '../../../models/exam';
import {
  PART_REGISTRY,
  isInteractivePart,
  partDef,
  partItems,
  partPrompts,
  type PartType,
} from './part-registry';

const EXAMS_DIR = join(process.cwd(), 'src', 'assets', 'exams', 'b1');

function loadExams(): Exam[] {
  return readdirSync(EXAMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(EXAMS_DIR, d.name))
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(join(EXAMS_DIR, d.name, f), 'utf8')) as Exam),
    );
}

const READING_AND_LISTENING: PartType[] = [
  'notices',
  'matching',
  'multiple-choice',
  'gapped-text',
  'multiple-choice-cloze',
  'open-cloze',
  'true-false-notgiven',
  'sentence-completion',
  'gap-fill-word-bank',
  'heading-matching',
  'short-dialogues',
  'gist-dialogues',
  'note-completion',
  'listening-interview',
  'listening-multiple-choice',
  'listening-true-false',
  'opinion-matching',
];

describe('part registry', () => {
  it('has a renderer loader and item extractor for every reading and listening type', () => {
    for (const type of READING_AND_LISTENING) {
      const def = PART_REGISTRY[type];
      expect(def, type).toBeDefined();
      expect(typeof def.load, type).toBe('function');
      expect(typeof def.items, type).toBe('function');
    }
  });

  it('knows every part type used by the exams in the repository', () => {
    const exams = loadExams();
    expect(exams.length).toBeGreaterThan(0);
    for (const exam of exams) {
      for (const section of exam.sections) {
        for (const part of section.parts as Part[]) {
          expect(partDef(part.type), `${exam.id} ${part.type}`).toBeDefined();
        }
      }
    }
  });

  it('returns no items for an unknown type instead of failing', () => {
    expect(partItems({ type: 'hologram' } as unknown as Part)).toEqual([]);
    expect(partDef('hologram')).toBeUndefined();
  });

  it('lists only unique item ids per exam, and keeps writing and speaking unmarked', () => {
    for (const exam of loadExams()) {
      const ids = new Set<string>();
      for (const section of exam.sections) {
        for (const part of section.parts as Part[]) {
          const items = partItems(part);
          if (section.skill === 'writing' || section.skill === 'speaking') {
            expect(items).toEqual([]);
          }
          for (const item of items) {
            expect(ids.has(item.id), `${exam.id} duplicate ${item.id}`).toBe(false);
            ids.add(item.id);
          }
        }
      }
      expect(ids.size, exam.id).toBeGreaterThan(40);
    }
  });

  it('loads every renderer component', async () => {
    for (const type of READING_AND_LISTENING) {
      const component = await PART_REGISTRY[type].load();
      expect(component, type).toBeTruthy();
    }
  });

  it('has a real renderer and prompts for every speaking type', async () => {
    const speaking: PartType[] = [
      'interview',
      'photo-description',
      'collaborative-task',
      'discussion',
      'monologue-topic',
      'role-play',
    ];
    for (const type of speaking) {
      const def = PART_REGISTRY[type];
      expect(def.prompts, type).toBeDefined();
      expect(await def.load(), type).toBeTruthy();
    }
  });

  it('has a real renderer and a prompt for every writing type', async () => {
    const writing: PartType[] = ['email', 'choice-task', 'short-message', 'opinion-essay'];
    for (const type of writing) {
      const def = PART_REGISTRY[type];
      expect(def.prompts, type).toBeDefined();
      expect(isInteractivePart({ type } as Part), type).toBe(true);
      expect(await def.load(), type).toBeTruthy();
    }
  });

  it('gives every writing task of the exams content points with keywords', () => {
    for (const exam of loadExams()) {
      const writing = exam.sections.find((s) => s.skill === 'writing');
      expect(writing, exam.id).toBeDefined();
      for (const part of (writing?.parts ?? []) as WritingPart[]) {
        const tasks = part.type === 'choice-task' ? part.options : [part.task];
        for (const task of tasks) {
          expect(task.contentPoints?.length, `${exam.id} ${part.id} ${task.kind}`).toBeGreaterThan(
            0,
          );
          for (const point of task.contentPoints ?? []) {
            expect(point.keywords.length).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('lists unique speaking prompts per exam', () => {
    for (const exam of loadExams()) {
      const ids = new Set<string>();
      for (const section of exam.sections) {
        for (const part of section.parts as Part[]) {
          for (const prompt of partPrompts(part)) {
            expect(ids.has(prompt.id), `${exam.id} duplicate ${prompt.id}`).toBe(false);
            ids.add(prompt.id);
          }
        }
      }
      expect(ids.size, exam.id).toBeGreaterThanOrEqual(10);
    }
  });

  it('extracts the expected items from each reading type', () => {
    const matching = PART_REGISTRY['matching'].items({
      type: 'matching',
      id: 'reading-2',
      number: 2,
      title: '',
      instructions: '',
      people: [{ id: 'p1', text: 'Nina' }],
      texts: [
        { id: 'A', title: 'Photo walks', text: '' },
        { id: 'B', title: 'Garden', text: '' },
      ],
      questions: [{ id: 'r2-1', prompt: 'Nina', options: ['A', 'B'], answer: 1 }],
    });
    expect(matching[0].optionLabels).toEqual(['A. Photo walks', 'B. Garden']);

    const gapped = PART_REGISTRY['gapped-text'].items({
      type: 'gapped-text',
      id: 'reading-4',
      number: 4,
      title: '',
      instructions: '',
      passage: '[1]',
      sentences: ['x', 'y'],
      gaps: [{ id: 'r4-1', answer: 'B' }],
    });
    expect(gapped[0].correct).toBe('B');
    expect(gapped[0].choices).toHaveLength(2);
  });
});
