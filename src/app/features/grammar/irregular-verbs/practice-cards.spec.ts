import { TestBed } from '@angular/core/testing';
import type { IrregularVerb } from '../../../models/grammar';
import { FlashCard, GapCard, TypeCard } from './practice-cards';

const burn: IrregularVerb = {
  id: 'burn',
  base: 'burn',
  past: 'burnt',
  participle: 'burnt',
  alt: { past: ['burned'], participle: ['burned'] },
  meaning: 'to damage something with fire',
  example: 'I {{past}} the toast.',
  exampleParticiple: 'The letters have been {{participle}}.',
};

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function flush(fixture: { whenStable(): Promise<unknown> }): Promise<void> {
  await fixture.whenStable();
}

describe('TypeCard', () => {
  it('checks both forms once and reports the result', async () => {
    const fixture = TestBed.createComponent(TypeCard);
    fixture.componentRef.setInput('verb', burn);
    const answers: boolean[] = [];
    fixture.componentInstance.answered.subscribe((v) => answers.push(v));
    const el = fixture.nativeElement as HTMLElement;
    await flush(fixture);

    const [past, participle] = Array.from(el.querySelectorAll<HTMLInputElement>('input'));
    expect(el.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true);
    type(past, 'burned');
    type(participle, 'burnt');
    await flush(fixture);
    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await flush(fixture);

    expect(answers).toEqual([true]);
    expect(el.querySelector('.feedback')?.textContent).toContain('Correct.');
    expect(past.disabled).toBe(true);
  });

  it('shows and hides the meaning of the verb on request', async () => {
    const fixture = TestBed.createComponent(TypeCard);
    fixture.componentRef.setInput('verb', burn);
    const el = fixture.nativeElement as HTMLElement;
    await flush(fixture);

    const toggle = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Show meaning'),
    )!;
    const meaning = el.querySelector<HTMLElement>('.meaning')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(meaning.hidden).toBe(true);

    toggle.click();
    await flush(fixture);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toContain('Hide meaning');
    expect(meaning.hidden).toBe(false);
    expect(meaning.textContent).toContain('to damage something with fire');
  });

  it('marks a wrong answer and shows the forms', async () => {
    const fixture = TestBed.createComponent(TypeCard);
    fixture.componentRef.setInput('verb', burn);
    const el = fixture.nativeElement as HTMLElement;
    await flush(fixture);
    const [past, participle] = Array.from(el.querySelectorAll<HTMLInputElement>('input'));
    type(past, 'burnd');
    type(participle, 'burnt');
    await flush(fixture);
    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await flush(fixture);
    expect(el.querySelector('.feedback')?.textContent).toContain('Not quite.');
    expect(el.querySelector('.feedback')?.textContent).toContain('burn – burnt – burnt');
    expect(past.getAttribute('aria-invalid')).toBe('true');
    expect(participle.getAttribute('aria-invalid')).toBeNull();
  });
});

describe('GapCard', () => {
  it('shows the sentence around the gap and accepts the alternative form', async () => {
    const fixture = TestBed.createComponent(GapCard);
    fixture.componentRef.setInput('verb', burn);
    fixture.componentRef.setInput('kind', 'past');
    const answers: boolean[] = [];
    fixture.componentInstance.answered.subscribe((v) => answers.push(v));
    const el = fixture.nativeElement as HTMLElement;
    await flush(fixture);

    expect(el.querySelector('.sentence')?.textContent).toContain('I');
    expect(el.querySelector('.sentence')?.textContent).toContain('the toast.');
    type(el.querySelector<HTMLInputElement>('input')!, 'Burned');
    await flush(fixture);
    el.querySelector<HTMLFormElement>('form')?.dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await flush(fixture);

    expect(answers).toEqual([true]);
    expect(el.querySelector('.detail')?.textContent).toContain('I burnt the toast.');
  });
});

describe('FlashCard', () => {
  it('hides the forms until the card is flipped, then reports what the learner knew', async () => {
    const fixture = TestBed.createComponent(FlashCard);
    fixture.componentRef.setInput('verb', burn);
    const answers: boolean[] = [];
    let nexts = 0;
    fixture.componentInstance.answered.subscribe((v) => answers.push(v));
    fixture.componentInstance.next.subscribe(() => nexts++);
    const el = fixture.nativeElement as HTMLElement;
    await flush(fixture);

    expect(el.textContent).not.toContain('burnt');
    el.querySelector<HTMLButtonElement>('button')?.click();
    await flush(fixture);
    expect(el.textContent).toContain('burnt / burned');

    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    buttons.find((b) => b.textContent?.includes('need to review'))?.click();
    expect(answers).toEqual([false]);
    expect(nexts).toBe(1);
  });
});
