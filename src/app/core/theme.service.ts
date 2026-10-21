import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { LocalStorageService } from './storage.service';

/**
 * Mirrors the appearance settings on `<html>` as data attributes that `styles/*.css` react to:
 * `data-theme` (absent means follow the system), `data-text-size`, `data-motion`, `data-contrast`.
 * `index.html` sets the same attributes before Angular starts, so there is no flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly store = inject(LocalStorageService);

  constructor() {
    effect(() => {
      const { theme, textSize, reduceMotion, highContrast } = this.store.settings();
      this.set('theme', theme === 'system' ? undefined : theme);
      this.set('textSize', textSize === 'normal' ? undefined : textSize);
      this.set('motion', reduceMotion ? 'reduce' : undefined);
      this.set('contrast', highContrast ? 'high' : undefined);
      this.root.style.colorScheme = theme === 'system' ? '' : theme;
    });
  }

  private set(name: string, value: string | undefined): void {
    if (value === undefined) delete this.root.dataset[name];
    else this.root.dataset[name] = value;
  }
}
