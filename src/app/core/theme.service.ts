import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { LocalStorageService } from './storage.service';

/** Applies the saved theme preference to the document (`data-theme` attribute). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly store = inject(LocalStorageService);

  constructor() {
    effect(() => {
      const theme = this.store.settings().theme;
      if (theme === 'system') delete this.root.dataset['theme'];
      else this.root.dataset['theme'] = theme;
    });
  }
}
