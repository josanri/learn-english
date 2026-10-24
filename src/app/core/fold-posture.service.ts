import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

/**
 * How the screen is split. `flat` covers a normal screen, a fully open foldable and a closed one.
 * `book` has a vertical fold or hinge: two segments side by side.
 * `laptop` has a horizontal fold or hinge: two segments stacked.
 */
export type FoldLayout = 'flat' | 'book' | 'laptop';

/**
 * Detects a split screen with the Viewport Segments media features and
 * mirrors the result on `<html>` as `data-fold="book|laptop"` (absent when flat), the same way
 * `ThemeService` mirrors the appearance settings. Component styles react with
 * `:host-context(html[data-fold='book'])`.
 *
 * The browser reports two segments only when a fold or a hinge crosses the viewport: a half-folded
 * phone, or a dual-screen phone such as Surface Duo, whose hinge is there even when it lies flat
 * (posture `continuous`). So the posture is not needed to choose the layout.
 *
 * Both features are previews in Safari on iPhone Duo (behind feature flags) and ship in Chrome on
 * Android foldables. A browser that lacks them reports `not all` for the query, which is treated
 * as "not folded", so every page keeps its width-based layout there.
 */
@Injectable({ providedIn: 'root' })
export class FoldPosture {
  private readonly doc = inject(DOCUMENT);
  private readonly lists: MediaQueryList[] = [];

  private readonly state = signal<FoldLayout>('flat');
  /** Current fold layout. */
  readonly layout = this.state.asReadonly();
  /** True in `book` and `laptop`. */
  readonly folded = computed(() => this.state() !== 'flat');

  constructor() {
    const win = this.doc.defaultView;
    if (!win || typeof win.matchMedia !== 'function') return;
    for (const query of ['(horizontal-viewport-segments: 2)', '(vertical-viewport-segments: 2)']) {
      const list = win.matchMedia(query);
      this.lists.push(list);
      list.addEventListener?.('change', () => this.update());
    }
    this.update();
  }

  private matches(index: number): boolean {
    const list = this.lists[index];
    return !!list && list.media !== 'not all' && list.matches;
  }

  private update(): void {
    let layout: FoldLayout = 'flat';
    if (this.matches(0)) layout = 'book';
    else if (this.matches(1)) layout = 'laptop';
    this.state.set(layout);
    const root = this.doc.documentElement;
    if (layout === 'flat') delete root.dataset['fold'];
    else root.dataset['fold'] = layout;
  }
}
