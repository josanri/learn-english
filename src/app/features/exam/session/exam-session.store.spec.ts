import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SettingsService } from '../../../core/settings.service';
import { LocalStorageService } from '../../../core/storage.service';
import { ExamCatalogueService } from '../../../data/exam-catalogue.service';
import type { Exam } from '../../../models/exam';
import { ExamSessionStore } from './exam-session.store';

const voice = { lang: 'en-GB' as const };
const exam: Exam = {
  schemaVersion: 2,
  id: 'test-01',
  level: 'B1',
  board: 'cambridge-pet',
  title: 'Test exam',
  subtitle: '',
  theme: '',
  category: 'misc',
  estimatedMinutes: 10,
  sections: [
    {
      skill: 'reading',
      timeLimitMinutes: 6,
      parts: [
        {
          type: 'notices',
          id: 'reading-1',
          number: 1,
          title: 'Notices',
          instructions: '',
          notices: ['One', 'Two'],
          questions: [
            {
              id: 'r1-1',
              prompt: 'Q1',
              options: ['a', 'b', 'c'],
              answer: 1,
              explanation: 'Because b.',
            },
            { id: 'r1-2', prompt: 'Q2', options: ['a', 'b', 'c'], answer: 0 },
          ],
        },
        {
          type: 'open-cloze',
          id: 'reading-2',
          number: 2,
          title: 'Cloze',
          instructions: '',
          passage: 'We arrived [1] the coast and [2] home.',
          gaps: [
            { id: 'r2-1', answer: 'at', accepted: ['in'] },
            { id: 'r2-2', answer: 'went' },
          ],
        },
      ],
    },
    {
      skill: 'listening',
      timeLimitMinutes: 5,
      parts: [
        {
          type: 'short-dialogues',
          id: 'listening-1',
          number: 1,
          title: 'Clips',
          instructions: '',
          clips: [
            {
              id: 'l1-1-clip',
              recording: {
                speakers: [{ id: 's', name: 'S', voice }],
                turns: [{ speaker: 's', text: 'Hello.' }],
              },
              question: { id: 'l1-1q', prompt: 'Q', options: ['x', 'y'], answer: 0 },
            },
          ],
        },
      ],
    },
    {
      skill: 'writing',
      timeLimitMinutes: 10,
      parts: [
        {
          type: 'email',
          id: 'writing-1',
          number: 1,
          title: 'Email',
          instructions: '',
          task: {
            kind: 'email',
            title: 'Reply',
            prompt: 'Write.',
            wordCount: 'about 50 words',
            contentPoints: [{ text: 'Say hi.', keywords: ['hi', 'hello'] }],
          },
        },
      ],
    },
    {
      skill: 'speaking',
      timeLimitMinutes: 4,
      parts: [
        {
          type: 'interview',
          id: 'speaking-1',
          number: 1,
          title: 'Interview',
          instructions: '',
          questions: [
            { id: 's1-1', prompt: 'Where do you live?' },
            { id: 's1-2', prompt: 'What do you do?' },
          ],
        },
      ],
    },
  ],
};

describe('ExamSessionStore', () => {
  const loaded = signal<Exam | undefined>(exam);

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        ExamSessionStore,
        {
          provide: ExamCatalogueService,
          useValue: {
            exam: () => ({
              hasValue: () => loaded() !== undefined,
              value: () => loaded(),
              isLoading: () => false,
              error: () => undefined,
            }),
          },
        },
      ],
    });
    const store = TestBed.inject(ExamSessionStore);
    store.location.set({ level: 'b1', board: 'cambridge-pet', examId: 'test-01' });
    store.skill.set('reading');
    TestBed.tick();
    return store;
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('derives sections, parts and the items of the open section', () => {
    const store = setup();
    expect(store.part()?.id).toBe('reading-1');
    expect(store.totalCount()).toBe(4);
    expect(
      store
        .itemsByPart()
        .get('reading-2')
        ?.map((p) => p.n),
    ).toEqual([1, 2]);
    store.skill.set('listening');
    expect(store.totalCount()).toBe(1);
  });

  it('saves answers, counts progress and marks the section in progress', () => {
    const store = setup();
    store.setAnswer('r1-1', 1);
    store.setAnswer('r2-1', 'IN');
    expect(store.answeredCount()).toBe(2);
    expect(store.score().correct).toBe(2);
    expect(store.unanswered().map((p) => p.item.id)).toEqual(['r1-2', 'r2-2']);
    expect(store.sectionStatus()).toBe('in-progress');
    expect(TestBed.inject(LocalStorageService).progressFor('test-01')?.answers).toEqual({
      'r1-1': 1,
      'r2-1': 'IN',
    });
  });

  it('resumes the part, flags and listens after a reload', () => {
    const first = setup();
    first.goToPart(1);
    first.toggleFlag('r2-2');
    first.skill.set('listening');
    first.addListen('l1-1-clip');
    TestBed.tick();
    expect(first.session().skill).toBe('listening'); // "Continue" reopens the last section
    // A new store (a new visit) reads the same saved document.
    const second = TestBed.runInInjectionContext(() => new ExamSessionStore());
    second.location.set({ level: 'b1', board: 'cambridge-pet', examId: 'test-01' });
    second.skill.set('reading');
    TestBed.tick();
    expect(second.partIndex()).toBe(1);
    expect(second.isFlagged('r2-2')).toBe(true);
    expect(second.listens('l1-1-clip')).toBe(1);
  });

  it('practice mode reveals feedback only after Check', () => {
    const store = setup();
    store.setAnswer('r1-1', 0);
    expect(store.feedback('r1-1')).toBeNull();
    store.checkPart('reading-1');
    expect(store.feedback('r1-1')).toMatchObject({
      correct: false,
      correctText: 'B. b',
      explanation: 'Because b.',
    });
    expect(store.feedback('r2-1')).toBeNull();
    expect(store.transcriptAllowed()).toBe(true);
  });

  it('exam mode gives no feedback or transcript until the section is submitted', () => {
    const store = setup();
    TestBed.inject(SettingsService).update({ examMode: true });
    store.setAnswer('r1-1', 1);
    store.checkPart('reading-1');
    expect(store.feedback('r1-1')).toBeNull();
    expect(store.transcriptAllowed()).toBe(false);
    expect(store.maxListens()).toBe(2);
    store.submitSection();
    expect(store.feedback('r1-1')?.correct).toBe(true);
    expect(store.transcriptAllowed()).toBe(true);
  });

  it('submitting saves the score, locks the section and keeps answers read-only', () => {
    const store = setup();
    store.setAnswer('r1-1', 1);
    store.setAnswer('r1-2', 2);
    store.submitSection();
    expect(store.locked()).toBe(true);
    expect(store.progress()?.results['reading']).toMatchObject({ correct: 1, total: 4 });
    store.setAnswer('r1-2', 0);
    expect(store.answer('r1-2')).toBe(2);
    expect(store.isRevealed('r2-1')).toBe(true);
  });

  it('retry archives the attempt and starts again without deleting anything', () => {
    const store = setup();
    store.setAnswer('r1-1', 1);
    store.submitSection();
    store.retry();
    expect(store.answeredCount()).toBe(0);
    expect(store.locked()).toBe(false);
    const progress = store.progress();
    expect(progress?.attempts).toHaveLength(1);
    expect(progress?.attempts[0].answers).toEqual({ 'r1-1': 1 });
    expect(progress?.attempts[0].results['reading']).toBeDefined();
  });

  it('counts speaking prompts as progress, completes without a score and names the attempt', () => {
    const store = setup();
    store.skill.set('speaking');
    expect(store.totalCount()).toBe(2);
    expect(store.answeredCount()).toBe(0);
    expect(store.attemptId()).toBe('test-01-1');
    expect(store.unansweredPrompts().map((p) => p.id)).toEqual(['s1-1', 's1-2']);

    store.setAnswer('speaking:s1-1', 'I live in Valencia.');
    store.setAnswer('speaking-dur:s1-2', 12.5);
    expect(store.answeredCount()).toBe(2);
    expect(store.partScore('speaking-1')).toEqual({ correct: 0, total: 2, answered: 2 });

    store.submitSection();
    expect(store.locked()).toBe(true);
    expect(store.progress()?.sectionStatus['speaking']).toBe('completed');
    expect(store.progress()?.results['speaking']).toBeUndefined();

    store.retry();
    expect(store.attemptId()).toBe('test-01-2');
    expect(store.progress()?.attempts[0].answers['speaking:s1-1']).toBe('I live in Valencia.');
  });

  it('counts a written answer as progress, completes without a score and keeps it per attempt', () => {
    const store = setup();
    store.skill.set('writing');
    expect(store.sectionItems()).toEqual([]);
    expect(store.totalCount()).toBe(1);
    expect(store.unansweredPrompts().map((p) => p.id)).toEqual(['writing-1']);

    store.setAnswer('writing-1', '   ');
    expect(store.answeredCount()).toBe(0);
    store.setAnswer('writing-1', 'Hello Alex, how are you?');
    store.setAnswer('writing-rubric:writing-1:content', 4);
    expect(store.answeredCount()).toBe(1);
    expect(store.partScore('writing-1')).toEqual({ correct: 0, total: 1, answered: 1 });

    store.submitSection();
    expect(store.locked()).toBe(true);
    expect(store.progress()?.sectionStatus['writing']).toBe('completed');
    expect(store.progress()?.results['writing']).toBeUndefined();
    store.setAnswer('writing-1', 'changed');
    expect(store.answer('writing-1')).toBe('Hello Alex, how are you?');

    store.retry();
    expect(store.progress()?.attempts[0].answers['writing-1']).toBe('Hello Alex, how are you?');
    expect(store.progress()?.attempts[0].answers['writing-rubric:writing-1:content']).toBe(4);
    expect(store.answer('writing-1')).toBeUndefined();
  });

  it('removes an answer', () => {
    const store = setup();
    store.setAnswer('speaking-dur:s1-1', 5);
    store.removeAnswer('speaking-dur:s1-1');
    expect(store.answer('speaking-dur:s1-1')).toBeUndefined();
  });

  it('counts time, warns at 5 and 1 minutes and saves elapsed seconds', async () => {
    const store = setup();
    await vi.advanceTimersByTimeAsync(5000);
    expect(store.elapsed()).toBe(5);
    expect(store.progress()?.session?.elapsed['reading']).toBe(5);
    expect(store.remaining()).toBe(355);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(store.timerNotice()).toBe('5 minutes left.');
    await vi.advanceTimersByTimeAsync(240_000);
    expect(store.timerNotice()).toBe('1 minute left.');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(store.timerNotice()).toContain('Time is up');
    expect(store.remaining()).toBeLessThanOrEqual(0);
  });

  it('stops counting while paused and continues after resume', async () => {
    const store = setup();
    await vi.advanceTimersByTimeAsync(3000);
    store.togglePause();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(store.elapsed()).toBe(3);
    expect(store.timerNotice()).toBe('Timer paused.');
    store.togglePause();
    await vi.advanceTimersByTimeAsync(2000);
    expect(store.elapsed()).toBe(5);
  });
});
