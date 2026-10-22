import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { Exam, LevelIndex } from '../../models/exam';
import { CreditsPage } from './credits-page';

const index: LevelIndex = {
  schemaVersion: 2,
  level: 'B1',
  boards: [{ id: 'cambridge-pet', name: 'Cambridge', description: '' }],
  exams: [
    {
      id: 'e1',
      level: 'B1',
      board: 'cambridge-pet',
      title: 'Exam One',
      subtitle: '',
      theme: '',
      estimatedMinutes: 10,
      skills: ['speaking'],
      path: 'b1/cambridge-pet/e1.json',
    },
  ],
};

const exam = {
  id: 'e1',
  title: 'Exam One',
  sections: [
    {
      skill: 'speaking',
      parts: [
        {
          id: 'speaking-2',
          type: 'photo-description',
          images: [
            {
              id: 'v1',
              title: 'A garden',
              alt: 'alt',
              image: {
                id: 'v1',
                src: 'assets/images/exams/e1/v1-1200.webp',
                srcSmall: 'assets/images/exams/e1/v1-600.webp',
                alt: 'A man digs a garden bed.',
                credit: {
                  author: 'Jane Photographer',
                  license: 'CC BY-SA 4.0',
                  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
                  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Garden.jpg',
                },
              },
            },
            { id: 'v2', title: 'Drawn scene', alt: 'alt', illustration: 'park' },
          ],
        },
      ],
    },
  ],
} as unknown as Exam;

describe('CreditsPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists every photograph with author, licence and source, and skips drawn illustrations', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      return new Response(JSON.stringify(url.endsWith('index.json') ? index : exam));
    });
    const fixture = TestBed.createComponent(CreditsPage);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('li').length).toBe(1);
    });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Jane Photographer');
    expect(el.textContent).toContain('CC BY-SA 4.0');
    const links = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('https://commons.wikimedia.org/wiki/File:Garden.jpg');
    expect(el.querySelector('img')?.getAttribute('src')).toContain('v1-600.webp');
  });
});
