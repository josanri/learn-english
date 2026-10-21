import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { LevelIndex } from '../../models/exam';
import { LevelPage } from './level-page';

describe('LevelPage', () => {
  it('lists the exams of each board from index.json', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(LevelPage);
    fixture.componentRef.setInput('level', 'b1');
    fixture.detectChanges();
    await Promise.resolve();

    const index: LevelIndex = {
      schemaVersion: 2,
      level: 'B1',
      boards: [
        {
          id: 'cambridge-pet',
          name: 'Cambridge B1 Preliminary (PET)',
          description: 'Practice papers.',
        },
      ],
      exams: [
        {
          id: 'cambridge-pet-01',
          level: 'B1',
          board: 'cambridge-pet',
          title: 'A Fresh Start',
          subtitle: 'Community',
          theme: 'Community',
          estimatedMinutes: 137,
          skills: ['reading'],
          path: 'b1/cambridge-pet/cambridge-pet-01.json',
        },
      ],
    };
    TestBed.inject(HttpTestingController).expectOne('assets/exams/b1/index.json').flush(index);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent).toContain('Cambridge B1 Preliminary');
    expect(element.querySelector('.exam-list a')?.getAttribute('href')).toBe(
      '/b1/cambridge-pet/cambridge-pet-01/reading',
    );
  });
});
