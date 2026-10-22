import { TestBed } from '@angular/core/testing';
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from './state-migrations';
import { LocalStorageService } from './storage.service';

describe('LocalStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('migrates the React-era key on first load and writes the new key', async () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ answers: { 'exam-05': { 'r1-1': 1 } }, results: {} }),
    );
    const service = TestBed.inject(LocalStorageService);
    expect(service.progressFor('cambridge-pet-05')?.answers).toEqual({ 'r1-1': 1 });
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(400);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.progress['cambridge-pet-05'].answers).toEqual({ 'r1-1': 1 });
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull(); // old data is left as a backup
  });

  it('records verb practice and adds today to the activity days', () => {
    const service = TestBed.inject(LocalStorageService);
    service.recordVerbResult('go', true);
    service.recordVerbResult('go', false);
    service.setVerbKnown('go', true);
    service.toggleVerbStar('go');
    const go = service.grammar().verbs['go'];
    expect(go).toMatchObject({ right: 1, wrong: 1, known: true, starred: true });
    expect(go.lastSeen).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(service.activity()).toEqual([go.lastSeen]);
    service.toggleVerbStar('go');
    expect(service.grammar().verbs['go'].starred).toBe(false);
    service.resetGrammar();
    expect(service.grammar().verbs).toEqual({});
  });

  it('debounces writes and stores answers with timestamps', async () => {
    const service = TestBed.inject(LocalStorageService);
    service.setAnswer('cambridge-pet-01', 'r1-1', 2);
    service.setAnswer('cambridge-pet-01', 'r1-2', 0);
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    await vi.advanceTimersByTimeAsync(400);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.progress['cambridge-pet-01'].answers).toEqual({ 'r1-1': 2, 'r1-2': 0 });
    expect(saved.progress['cambridge-pet-01'].updatedAt).toBeTruthy();
  });

  it('survives corrupt stored data', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const service = TestBed.inject(LocalStorageService);
    expect(service.progress()).toEqual({});
  });
});
