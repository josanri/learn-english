import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    for (const key of ['theme', 'textSize', 'motion', 'contrast']) delete root.dataset[key];
  });

  it('mirrors the appearance settings on the html element', () => {
    TestBed.inject(ThemeService);
    const settings = TestBed.inject(SettingsService);
    const root = TestBed.inject(DOCUMENT).documentElement;

    TestBed.tick();
    expect(root.dataset['theme']).toBeUndefined(); // "system": CSS follows prefers-color-scheme

    settings.update({ theme: 'dark', textSize: 'large', reduceMotion: true, highContrast: true });
    TestBed.tick();
    expect(root.dataset['theme']).toBe('dark');
    expect(root.dataset['textSize']).toBe('large');
    expect(root.dataset['motion']).toBe('reduce');
    expect(root.dataset['contrast']).toBe('high');

    settings.update({
      theme: 'system',
      textSize: 'normal',
      reduceMotion: false,
      highContrast: false,
    });
    TestBed.tick();
    expect(root.dataset['theme']).toBeUndefined();
    expect(root.dataset['textSize']).toBeUndefined();
    expect(root.dataset['motion']).toBeUndefined();
    expect(root.dataset['contrast']).toBeUndefined();
  });
});
