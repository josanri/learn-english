import { TestBed } from '@angular/core/testing';
import type { GuideTimelineRow } from '../../../models/grammar';
import { TenseTimeline } from './tense-timeline';

const rows: GuideTimelineRow[] = [
  {
    section: 'past-simple',
    label: 'Past simple',
    shape: 'past-point',
    example: 'I saw it yesterday.',
    description: 'One finished action at a known time in the past.',
  },
  {
    section: 'present-perfect',
    label: 'Present perfect',
    shape: 'past-to-now',
    example: 'I have lost my key.',
    description: 'A past action that is important now.',
  },
];

describe('TenseTimeline', () => {
  it('shows one row per tense with its name, example and description', async () => {
    const fixture = TestBed.createComponent(TenseTimeline);
    fixture.componentRef.setInput('rows', rows);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const items = el.querySelectorAll('ol > li');
    expect(items.length).toBe(2);
    const button = items[0].querySelector('button')!;
    expect(button.textContent?.trim()).toBe('Past simple');
    const described = el.querySelector(`#${button.getAttribute('aria-describedby')}`);
    expect(described?.textContent).toContain('One finished action at a known time in the past.');
    expect(items[1].textContent).toContain('I have lost my key.');
  });

  it('hides the drawings from screen readers and draws real SVG marks', async () => {
    const fixture = TestBed.createComponent(TenseTimeline);
    fixture.componentRef.setInput('rows', rows);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const svg = el.querySelector('ol svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const circle = svg.querySelector('circle.dot');
    expect(circle).toBeInstanceOf(SVGElement);
  });

  it('reports the section of the chosen tense', async () => {
    const fixture = TestBed.createComponent(TenseTimeline);
    fixture.componentRef.setInput('rows', rows);
    const chosen: string[] = [];
    fixture.componentInstance.go.subscribe((id) => chosen.push(id));
    await fixture.whenStable();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('ol button');
    (buttons[1] as HTMLButtonElement).click();
    expect(chosen).toEqual(['present-perfect']);
  });
});
