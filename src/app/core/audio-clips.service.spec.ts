import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Recording } from '../models/exam';
import { AudioClipsService, scriptFingerprint } from './audio-clips.service';

const recording: Recording = {
  speakers: [{ id: 'a', name: 'Ann', voice: { lang: 'en-GB' } }],
  turns: [
    { speaker: 'a', text: 'One.' },
    { speaker: 'a', text: 'Two.' },
  ],
};
const exam = { level: 'B1', board: 'cambridge-pet', id: 'cambridge-pet-01' };

describe('AudioClipsService', () => {
  let http: HttpTestingController;
  let service: AudioClipsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AudioClipsService);
  });

  it('can be called inside computed() and finds the file by the script', async () => {
    const clip = computed(() => service.clipFor(exam, recording));
    expect(clip()).toBeUndefined();
    TestBed.tick();
    const request = http.expectOne('audio/b1/cambridge-pet/cambridge-pet-01/manifest.json');
    request.flush({
      recordings: [
        { file: 'r01.opus', fingerprint: scriptFingerprint(recording), duration: 5, turns: [0, 2] },
      ],
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(clip()).toEqual({
      url: 'audio/b1/cambridge-pet/cambridge-pet-01/r01.opus',
      starts: [0, 2],
    });
  });

  it('ignores audio made for another script', async () => {
    const clip = computed(() => service.clipFor(exam, recording));
    clip();
    TestBed.tick();
    http.expectOne('audio/b1/cambridge-pet/cambridge-pet-01/manifest.json').flush({
      recordings: [{ file: 'r01.opus', fingerprint: '00000000', duration: 5, turns: [0, 2] }],
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(clip()).toBeUndefined();
  });

  it('uses speech synthesis when the exam has no audio', async () => {
    const clip = computed(() => service.clipFor(exam, recording));
    clip();
    TestBed.tick();
    http
      .expectOne('audio/b1/cambridge-pet/cambridge-pet-01/manifest.json')
      .flush('Not found', { status: 404, statusText: 'Not Found' });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(clip()).toBeUndefined();
  });
});
