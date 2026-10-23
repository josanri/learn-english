import { TestBed } from '@angular/core/testing';
import { SettingsService } from '../../../core/settings.service';
import { ExamCatalogueService } from '../../../data/exam-catalogue.service';
import type { Exam, WritingPart } from '../../../models/exam';
import { ExamSessionStore } from '../session/exam-session.store';
import { WritingPartView } from './writing-part';

const email: WritingPart = {
  type: 'email',
  id: 'writing-1',
  number: 1,
  title: 'Part 1: Email',
  instructions: '',
  task: {
    kind: 'email',
    title: 'Reply to an email',
    prompt: 'Write a reply to Alex.',
    wordCount: 'about 20 words',
    notes: ['Say which place you would like to visit.'],
    sourceEmail: { from: 'Alex', subject: 'Your visit', body: 'I am so excited!' },
    contentPoints: [{ text: 'Say which place you would like to visit.', keywords: ['visit'] }],
  },
};
const story: WritingPart = {
  type: 'choice-task',
  id: 'writing-2',
  number: 2,
  title: 'Part 2',
  instructions: '',
  options: [
    { kind: 'article', title: 'Article', prompt: 'Write an article.', wordCount: 'about 20 words' },
    {
      kind: 'story',
      title: 'Story',
      prompt: 'Write a story.',
      wordCount: 'about 20 words',
      openingSentence: 'It was late.',
    },
  ],
};
const exam: Exam = {
  schemaVersion: 2,
  id: 'w-01',
  level: 'B1',
  board: 'cambridge-pet',
  title: 'T',
  subtitle: '',
  theme: '',
  category: 'misc',
  estimatedMinutes: 10,
  sections: [{ skill: 'writing', timeLimitMinutes: 45, parts: [email, story] }],
};

describe('WritingPartView', () => {
  function setup(part: WritingPart) {
    TestBed.configureTestingModule({
      providers: [
        ExamSessionStore,
        {
          provide: ExamCatalogueService,
          useValue: {
            exam: () => ({
              hasValue: () => true,
              value: () => exam,
              isLoading: () => false,
              error: () => undefined,
            }),
          },
        },
      ],
    });
    const store = TestBed.inject(ExamSessionStore);
    store.location.set({ level: 'b1', board: 'cambridge-pet', examId: 'w-01' });
    store.skill.set('writing');
    TestBed.tick();
    const fixture = TestBed.createComponent(WritingPartView);
    fixture.componentRef.setInput('part', part);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, store, el, field: el.querySelector('textarea') as HTMLTextAreaElement };
  }

  const type = (ctx: ReturnType<typeof setup>, text: string) => {
    ctx.field.value = text;
    ctx.field.setSelectionRange(text.length, text.length);
    ctx.field.dispatchEvent(new Event('input'));
    ctx.fixture.detectChanges();
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('shows the task: source email, notes and target length', () => {
    const { el } = setup(email);
    expect(el.textContent).toContain('Reply to an email');
    expect(el.querySelector('.mail')?.textContent).toContain('I am so excited!');
    expect(el.querySelector('.notes')?.textContent).toContain('Say which place');
    expect(el.textContent).toContain('about 20 words');
    expect(el.querySelector('textarea')?.id).toBe('in-writing-1');
  });

  it('counts words live against the target and names the state', () => {
    const ctx = setup(email);
    expect(ctx.el.querySelector('.count')?.textContent).toContain('0 words');
    type(ctx, 'Dear Alex, I would like to visit the castle.');
    expect(ctx.el.querySelector('.count')?.textContent).toContain('9 words');
    expect(ctx.el.querySelector('.meter')?.textContent).toContain('Too short');
    type(ctx, Array.from({ length: 20 }, () => 'word').join(' '));
    expect(ctx.el.querySelector('.meter')?.textContent).toContain('Good length');
    type(ctx, Array.from({ length: 40 }, () => 'word').join(' '));
    expect(ctx.el.querySelector('.meter')?.textContent).toContain('Too long');
  });

  it('saves the text after a pause and when the box loses focus', async () => {
    const ctx = setup(email);
    type(ctx, 'Hello Alex');
    expect(ctx.store.answers()['writing-1']).toBeUndefined();
    ctx.field.dispatchEvent(new Event('blur'));
    expect(ctx.store.answers()['writing-1']).toBe('Hello Alex');
    expect(ctx.store.progress()?.sectionStatus['writing']).toBe('in-progress');
    type(ctx, 'Hello Alex!');
    await vi.waitFor(() => expect(ctx.store.answers()['writing-1']).toBe('Hello Alex!'));
  });

  it('starts from the saved text', () => {
    localStorage.clear();
    const ctx = setup(email);
    ctx.store.setAnswer('writing-1', 'Saved draft');
    TestBed.tick();
    const again = TestBed.createComponent(WritingPartView);
    again.componentRef.setInput('part', email);
    again.detectChanges();
    expect((again.nativeElement as HTMLElement).querySelector('textarea')?.value).toBe(
      'Saved draft',
    );
  });

  it('suggests a fix, applies it only on request and ignores on request', async () => {
    const ctx = setup(email);
    type(ctx, 'I am agree with you.');
    await vi.waitFor(() => {
      ctx.fixture.detectChanges();
      expect(ctx.el.querySelector('app-suggestions-panel .issue')).not.toBeNull();
    });
    expect(ctx.field.value).toBe('I am agree with you.'); // nothing changed by itself
    expect(ctx.el.querySelector('mark')?.textContent).toBe('I am agree');

    const apply = Array.from(
      ctx.el.querySelectorAll<HTMLButtonElement>('app-suggestions-panel button'),
    ).find((b) => b.textContent?.includes('Apply: I agree'))!;
    apply.click();
    ctx.fixture.detectChanges();
    expect(ctx.field.value).toBe('I agree with you.');
    expect(ctx.store.answers()['writing-1']).toBe('I agree with you.');

    type(ctx, 'I am agree with you.');
    await vi.waitFor(() => {
      ctx.fixture.detectChanges();
      expect(ctx.el.querySelector('app-suggestions-panel .issue')).not.toBeNull();
    });
    const ignore = Array.from(
      ctx.el.querySelectorAll<HTMLButtonElement>('app-suggestions-panel button'),
    ).find((b) => b.textContent?.trim().startsWith('Ignore'))!;
    ignore.click();
    ctx.fixture.detectChanges();
    expect(ctx.el.querySelector('app-suggestions-panel .issue')).toBeNull();
    expect(ctx.field.value).toBe('I am agree with you.');
  });

  it('lists the points of the task in the checklist', async () => {
    const ctx = setup(email);
    await vi.waitFor(() => {
      ctx.fixture.detectChanges();
      expect(ctx.el.querySelector('app-task-checklist')?.textContent).toContain(
        'Say which place you would like to visit.',
      );
    });
    type(ctx, 'I want to visit the castle.');
    await vi.waitFor(() => {
      ctx.fixture.detectChanges();
      expect(ctx.el.querySelector('app-task-checklist li[data-status="done"]')).not.toBeNull();
    });
  });

  it('lets the learner choose between article and story and inserts the opening sentence', () => {
    const ctx = setup(story);
    expect(ctx.el.textContent).toContain('Write an article.');
    const radios = Array.from(ctx.el.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    radios[1].click();
    ctx.fixture.detectChanges();
    expect(ctx.store.answers()['writing-2-type']).toBe('story');
    expect(ctx.el.textContent).toContain('Write a story.');
    const insert = Array.from(ctx.el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Insert this sentence'),
    )!;
    insert.click();
    ctx.fixture.detectChanges();
    expect(ctx.field.value).toBe('It was late. ');
  });

  it('hides suggestions in exam mode until the section is submitted', () => {
    const ctx = setup(email);
    TestBed.inject(SettingsService).update({ examMode: true });
    ctx.fixture.detectChanges();
    expect(ctx.el.querySelector('app-suggestions-panel')).toBeNull();
    expect(ctx.el.textContent).toContain('Exam mode is on');
    expect(ctx.el.querySelector('.count')).not.toBeNull();
    ctx.store.submitSection();
    ctx.fixture.detectChanges();
    expect(ctx.el.querySelector('app-suggestions-panel')).not.toBeNull();
    expect(ctx.field.readOnly).toBe(true);
  });

  it('stores the self-rating of the rubric', () => {
    const ctx = setup(email);
    const slider = ctx.el.querySelector<HTMLInputElement>(
      'app-writing-rubric input[type="range"]',
    )!;
    slider.value = '4';
    slider.dispatchEvent(new Event('input'));
    ctx.fixture.detectChanges();
    expect(ctx.store.answers()['writing-rubric:writing-1:content']).toBe(4);
    expect(ctx.el.querySelector('app-writing-rubric')?.textContent).toContain(
      'not an official mark',
    );
  });
});
