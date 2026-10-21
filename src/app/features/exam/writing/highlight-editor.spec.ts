import { TestBed } from '@angular/core/testing';
import type { Issue } from '../../../core/writing/types';
import { HighlightEditor } from './highlight-editor';

const ZWSP = String.fromCharCode(0x200b);

const issue = (start: number, end: number, group: Issue['group'] = 'grammar'): Issue => ({
  id: `r:${start}:${end}`,
  ruleId: 'r',
  group,
  severity: 'error',
  source: 'rules',
  category: 'Test',
  start,
  end,
  original: '',
  message: 'm',
  suggestions: [],
});

describe('HighlightEditor', () => {
  function setup(value: string, issues: Issue[] = []) {
    const fixture = TestBed.createComponent(HighlightEditor);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('issues', issues);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      backdrop: el.querySelector('.backdrop') as HTMLElement,
      field: el.querySelector('textarea') as HTMLTextAreaElement,
    };
  }

  it('draws exactly the text of the textarea in the overlay, with marks on the issues', () => {
    const text = 'He dont like  it.\nSecond line';
    const { backdrop, field } = setup(text, [issue(3, 7), issue(8, 12, 'spelling')]);
    expect(field.value).toBe(text);
    // The overlay has one zero-width space at the end so a final new line still takes up a line.
    expect(backdrop.textContent?.replaceAll(ZWSP, '')).toBe(text);
    const marks = Array.from(backdrop.querySelectorAll('mark'));
    expect(marks.map((m) => m.textContent)).toEqual(['dont', 'like']);
    expect(marks.map((m) => m.getAttribute('data-group'))).toEqual(['grammar', 'spelling']);
  });

  it('hides the overlay from assistive technology and names the textarea', () => {
    const { backdrop, field } = setup('Hello');
    expect(backdrop.getAttribute('aria-hidden')).toBe('true');
    expect(field.getAttribute('aria-label')).toBe('Your answer');
    expect(field.getAttribute('spellcheck')).toBe('false');
    expect(field.getAttribute('lang')).toBe('en');
  });

  it('ignores issues outside the text or overlapping each other', () => {
    const { backdrop } = setup('Hello world', [issue(0, 5), issue(3, 8), issue(20, 30)]);
    expect(Array.from(backdrop.querySelectorAll('mark')).map((m) => m.textContent)).toEqual([
      'Hello',
    ]);
    expect(backdrop.textContent?.replaceAll(ZWSP, '')).toBe('Hello world');
  });

  it('keeps the overlay in step with what is typed and reports the caret', () => {
    const { fixture, backdrop, field } = setup('abc');
    const carets: number[] = [];
    fixture.componentInstance.caret.subscribe((c: number) => carets.push(c));
    field.value = 'abcd\n';
    field.setSelectionRange(5, 5);
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('abcd\n');
    expect(backdrop.textContent?.replaceAll(ZWSP, '')).toBe('abcd\n');
    expect(carets.at(-1)).toBe(5);
  });

  it('can be read-only', () => {
    const fixture = TestBed.createComponent(HighlightEditor);
    fixture.componentRef.setInput('value', 'x');
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('textarea')?.readOnly).toBe(true);
  });
});
