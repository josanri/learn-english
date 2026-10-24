import { TestBed } from '@angular/core/testing';
import { FoldPosture } from './fold-posture.service';

/** A controllable stand-in for `matchMedia` that answers the three fold queries. */
function fakeMedia(initial: Record<string, boolean>, unsupported: string[] = []) {
  const state = { ...initial };
  const listeners: (() => void)[] = [];
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    media: unsupported.includes(query) ? 'not all' : query,
    get matches() {
      return !unsupported.includes(query) && !!state[query];
    },
    addEventListener: (_type: string, fn: () => void) => listeners.push(fn),
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: Record<string, boolean>) {
      Object.assign(state, next);
      for (const fn of listeners) fn();
    },
    restore() {
      window.matchMedia = original;
    },
  };
}

const FOLDED = '(device-posture: folded)';
const COLUMNS = '(horizontal-viewport-segments: 2)';
const ROWS = '(vertical-viewport-segments: 2)';

describe('FoldPosture', () => {
  afterEach(() => {
    delete document.documentElement.dataset['fold'];
  });

  it('is flat when the phone is not folded', () => {
    const media = fakeMedia({ [FOLDED]: false, [COLUMNS]: false, [ROWS]: false });
    const fold = TestBed.inject(FoldPosture);
    expect(fold.layout()).toBe('flat');
    expect(fold.folded()).toBe(false);
    expect(document.documentElement.dataset['fold']).toBeUndefined();
    media.restore();
  });

  it('reports book pose and follows changes back to flat', () => {
    const media = fakeMedia({ [FOLDED]: true, [COLUMNS]: true, [ROWS]: false });
    const fold = TestBed.inject(FoldPosture);
    expect(fold.layout()).toBe('book');
    expect(fold.folded()).toBe(true);
    expect(document.documentElement.dataset['fold']).toBe('book');

    media.set({ [FOLDED]: false, [COLUMNS]: false });
    expect(fold.layout()).toBe('flat');
    expect(document.documentElement.dataset['fold']).toBeUndefined();
    media.restore();
  });

  it('reports laptop pose when the segments are stacked', () => {
    const media = fakeMedia({ [FOLDED]: true, [COLUMNS]: false, [ROWS]: true });
    const fold = TestBed.inject(FoldPosture);
    expect(fold.layout()).toBe('laptop');
    expect(document.documentElement.dataset['fold']).toBe('laptop');
    media.restore();
  });

  it('stays flat when the posture is folded but there are no segments to place content in', () => {
    const media = fakeMedia({ [FOLDED]: true, [COLUMNS]: false, [ROWS]: false });
    expect(TestBed.inject(FoldPosture).layout()).toBe('flat');
    media.restore();
  });

  it('treats a browser without the media features as flat', () => {
    const media = fakeMedia({ [FOLDED]: true, [COLUMNS]: true }, [FOLDED, COLUMNS, ROWS]);
    expect(TestBed.inject(FoldPosture).layout()).toBe('flat');
    media.restore();
  });

  it('does not throw when matchMedia is missing', () => {
    const original = window.matchMedia;
    // @ts-expect-error simulate an environment without matchMedia
    window.matchMedia = undefined;
    expect(TestBed.inject(FoldPosture).layout()).toBe('flat');
    window.matchMedia = original;
  });
});
