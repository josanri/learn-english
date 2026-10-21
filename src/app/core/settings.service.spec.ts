import { TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, sanitizeSettings } from './state-migrations';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => localStorage.clear());

  it('starts with the defaults', () => {
    expect(TestBed.inject(SettingsService).settings()).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the audio speed between 0.8 and 1.2', () => {
    const service = TestBed.inject(SettingsService);
    service.setSpeechRate(3);
    expect(service.settings().speechRate).toBe(1.2);
    service.setSpeechRate(0.1);
    expect(service.settings().speechRate).toBe(0.8);
  });

  it('ignores invalid values', () => {
    const service = TestBed.inject(SettingsService);
    service.update({ theme: 'neon' as never, recognitionLang: 'fr-FR' as never });
    expect(service.settings().theme).toBe('system');
    expect(service.settings().recognitionLang).toBe('en-GB');
  });

  it('keeps the writing checker private by default and validates its settings', () => {
    const service = TestBed.inject(SettingsService);
    expect(service.settings()).toMatchObject({
      languageTool: false,
      nativeSpellcheck: false,
      spellingLang: 'en-GB',
    });
    service.update({ spellingLang: 'en-US', languageTool: true });
    expect(service.settings()).toMatchObject({ spellingLang: 'en-US', languageTool: true });
    service.update({ spellingLang: 'es-ES' as never, languageTool: 'yes' as never });
    expect(service.settings()).toMatchObject({ spellingLang: 'en-GB', languageTool: false });
  });

  it('exports and imports progress, and rejects other files', () => {
    const service = TestBed.inject(SettingsService);
    service.update({ studentName: 'Ana', examMode: true });
    const exported = service.exportJson();

    service.update({ studentName: 'Other', examMode: false });
    expect(service.importJson(exported)).toEqual({ ok: true, exams: 0 });
    expect(service.settings().studentName).toBe('Ana');
    expect(service.settings().examMode).toBe(true);

    expect(service.importJson('not json').ok).toBe(false);
    expect(service.importJson('{"hello":1}').ok).toBe(false);
    expect(service.settings().studentName).toBe('Ana');
  });

  it('resets everything', async () => {
    const service = TestBed.inject(SettingsService);
    service.update({ studentName: 'Ana' });
    await service.resetAll();
    expect(service.settings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('sanitizeSettings', () => {
  it('fills missing fields of older saved settings', () => {
    expect(sanitizeSettings({ theme: 'dark', speechRate: 0.9 })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      speechRate: 0.9,
    });
  });
});
