import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SettingsService } from '../../core/settings.service';
import { SpeechService } from '../../core/speech.service';
import type { Settings } from '../../models/storage';
import { Button, Card, Dialog, Icon, SegmentedControl, ToastService } from '../../shared/ui';
import type { SegmentOption } from '../../shared/ui';

const THEMES: SegmentOption[] = [
  { value: 'system', label: 'Follow my device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const TEXT_SIZES: SegmentOption[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
];
const LANGUAGES: SegmentOption[] = [
  { value: 'en-GB', label: 'British (en-GB)' },
  { value: 'en-US', label: 'American (en-US)' },
];

/** `/settings`: appearance, listening, speaking, exam options and the learner's saved data. */
@Component({
  selector: 'app-settings-page',
  imports: [Button, Card, Dialog, Icon, SegmentedControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">Preferences</p>
      <h1>Settings</h1>
      <p class="lede">Changes are saved on this device straight away.</p>

      <div class="sections">
        <app-card>
          <h2>Appearance</h2>
          <div class="field">
            <app-segmented-control
              label="Colour theme"
              [options]="themes"
              [value]="settings().theme"
              (valueChange)="choose('theme', $event)"
            />
          </div>
          <div class="field">
            <app-segmented-control
              label="Text size"
              [options]="textSizes"
              [value]="settings().textSize"
              (valueChange)="choose('textSize', $event)"
            />
          </div>
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              [checked]="settings().reduceMotion"
              (change)="set({ reduceMotion: checked($event) })"
            />
            <span class="track" aria-hidden="true"></span>
            <span class="text">
              Reduce motion
              <small>Turns off animations. Your device setting is always respected too.</small>
            </span>
          </label>
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              [checked]="settings().highContrast"
              (change)="set({ highContrast: checked($event) })"
            />
            <span class="track" aria-hidden="true"></span>
            <span class="text">
              High contrast
              <small>Stronger text and thicker borders.</small>
            </span>
          </label>
        </app-card>

        <app-card>
          <h2>Listening</h2>
          <div class="field">
            <label for="voice">Preferred voice</label>
            @if (speech.supported && voices().length > 0) {
              <select id="voice" [value]="settings().voiceUri ?? ''" (change)="setVoice($event)">
                <option value="">Automatic</option>
                @for (voice of voices(); track voice.voiceURI) {
                  <option [value]="voice.voiceURI">{{ voice.name }} ({{ voice.lang }})</option>
                }
              </select>
              <p class="hint">
                Used for every speaker when chosen; otherwise a different voice is picked per
                speaker.
              </p>
            } @else {
              <select id="voice" disabled aria-describedby="voice-hint">
                <option>Automatic</option>
              </select>
              <p id="voice-hint" class="hint">
                No English voices were found on this device. Recordings will use the default voice.
              </p>
            }
          </div>
          <div class="field">
            <label for="rate">
              Audio speed: <span class="mono">{{ settings().speechRate.toFixed(2) }}&times;</span>
            </label>
            <input
              id="rate"
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              [value]="settings().speechRate"
              (input)="set({ speechRate: number($event) })"
            />
            @if (speech.supported) {
              <div>
                <button appButton size="sm" type="button" (click)="speech.preview()">
                  <app-icon name="play" [size]="16" />
                  Hear a sample
                </button>
              </div>
            }
          </div>
        </app-card>

        <app-card>
          <h2>Speaking</h2>
          <div class="field">
            <app-segmented-control
              label="Speech recognition language"
              [options]="languages"
              [value]="settings().recognitionLang"
              (valueChange)="choose('recognitionLang', $event)"
            />
          </div>
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              [checked]="settings().onlineRecognition"
              (change)="set({ onlineRecognition: checked($event) })"
            />
            <span class="track" aria-hidden="true"></span>
            <span class="text">
              Allow online recognition
              <small>
                Some browsers send your voice to an online service to turn it into text. Turn this
                off to keep recordings on this device; the transcript is then unavailable.
              </small>
            </span>
          </label>
        </app-card>

        <app-card>
          <h2>Writing</h2>
          <div class="field">
            <app-segmented-control
              label="Spelling dictionary"
              [options]="languages"
              [value]="settings().spellingLang"
              (valueChange)="choose('spellingLang', $event)"
            />
            <p class="hint">
              The spelling checker runs on this device. Its dictionary is downloaded the first time
              you open a Writing task.
            </p>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              [checked]="settings().nativeSpellcheck"
              (change)="set({ nativeSpellcheck: checked($event) })"
            />
            <span class="track" aria-hidden="true"></span>
            <span class="text">
              Browser spellcheck
              <small>
                Also let your browser underline spelling mistakes in the writing box. You may see
                two kinds of underline.
              </small>
            </span>
          </label>
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              [checked]="settings().languageTool"
              (change)="set({ languageTool: checked($event) })"
              aria-describedby="lt-warning"
            />
            <span class="track" aria-hidden="true"></span>
            <span class="text">
              Extra grammar suggestions from LanguageTool
              <small>
                Optional and off by default. When it is on, everything you type in a Writing task is
                sent over the internet to the public LanguageTool service (api.languagetool.org),
                which is run by another company.
              </small>
            </span>
          </label>
          <p id="lt-warning" class="warning" role="note">
            <strong>Privacy:</strong> do not turn this on if your text contains personal details.
            The checks built into this app never send your text anywhere.
          </p>
        </app-card>

        <app-card>
          <h2>Exam</h2>
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              [checked]="settings().showTimer"
              (change)="set({ showTimer: checked($event) })"
            />
            <span class="track" aria-hidden="true"></span>
            <span class="text">
              Show timer
              <small>Display the time left for each section.</small>
            </span>
          </label>
          <label class="switch">
            <input
              type="checkbox"
              role="switch"
              [checked]="settings().examMode"
              (change)="set({ examMode: checked($event) })"
            />
            <span class="track" aria-hidden="true"></span>
            <span class="text">
              Exam mode
              <small>Hide hints and explanations until you have finished the exam.</small>
            </span>
          </label>
          <div class="field">
            <label for="student-name">Your name</label>
            <input
              id="student-name"
              type="text"
              autocomplete="name"
              maxlength="80"
              [value]="settings().studentName"
              (input)="set({ studentName: text($event) })"
              aria-describedby="name-hint"
            />
            <p id="name-hint" class="hint">
              Printed on your PDF report. It never leaves this device.
            </p>
          </div>
        </app-card>

        <app-card>
          <h2>Your data</h2>
          <p class="muted">
            Progress, answers and settings live in this browser. Export a copy to keep a backup or
            to move to another device. Voice recordings are not included in the export.
          </p>
          <div class="buttons">
            <button appButton type="button" (click)="exportProgress()">
              <app-icon name="download" [size]="18" />
              Export progress (JSON)
            </button>
            <button appButton type="button" (click)="filePicker.click()">
              <app-icon name="upload" [size]="18" />
              Import progress
            </button>
            <input
              #filePicker
              class="visually-hidden"
              type="file"
              accept="application/json,.json"
              tabindex="-1"
              aria-label="Choose a progress file to import"
              (change)="onFile($event)"
            />
            <button appButton variant="danger" type="button" (click)="confirmReset.set(true)">
              <app-icon name="trash" [size]="18" />
              Delete everything
            </button>
          </div>
        </app-card>
      </div>
    </div>

    <app-dialog heading="Replace your progress?" [(open)]="confirmImport">
      <p>
        Importing replaces the answers, scores and settings saved on this device with the contents
        of the file.
      </p>
      <ng-container actions>
        <button appButton type="button" (click)="confirmImport.set(false)">Keep my data</button>
        <button appButton variant="primary" type="button" (click)="applyImport()">
          Replace with file
        </button>
      </ng-container>
    </app-dialog>

    <app-dialog heading="Delete everything?" [(open)]="confirmReset">
      <p>
        This removes all answers, scores, settings and voice recordings from this device. It cannot
        be undone. Export your progress first if you want a copy.
      </p>
      <ng-container actions>
        <button appButton type="button" (click)="confirmReset.set(false)">Cancel</button>
        <button appButton variant="danger" type="button" (click)="deleteAll()">
          Yes, delete everything
        </button>
      </ng-container>
    </app-dialog>
  `,
  styles: `
    .sections {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
      gap: var(--space-5);
      align-items: start;
    }
    h2 {
      font-size: var(--step-2);
      margin-bottom: var(--space-4);
    }
    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .visually-hidden {
      position: absolute;
    }
    .warning {
      margin: var(--space-3) 0 0;
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--warning);
      border-radius: var(--radius-sm);
      font-size: var(--step--1);
    }
  `,
})
export class SettingsPage {
  private readonly service = inject(SettingsService);
  private readonly doc = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  protected readonly speech = inject(SpeechService);

  protected readonly settings = this.service.settings;
  protected readonly voices = this.speech.englishVoices;
  protected readonly themes = THEMES;
  protected readonly textSizes = TEXT_SIZES;
  protected readonly languages = LANGUAGES;

  protected readonly confirmReset = signal(false);
  protected readonly confirmImport = signal(false);
  private readonly pendingImport = signal<string | null>(null);

  protected set(patch: Partial<Settings>): void {
    this.service.update(patch);
  }

  /** Segmented controls report plain strings; `update` validates them against the allowed values. */
  protected choose(
    key: 'theme' | 'textSize' | 'recognitionLang' | 'spellingLang',
    value: string,
  ): void {
    this.service.update({ [key]: value } as Partial<Settings>);
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected number(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected setVoice(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.service.update({ voiceUri: value || null });
  }

  protected exportProgress(): void {
    const blob = new Blob([this.service.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.doc.createElement('a');
    link.href = url;
    link.download = `learn-english-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast.show('Progress exported.', 'success');
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.pendingImport.set(await file.text());
      this.confirmImport.set(true);
    } catch {
      this.toast.show('That file could not be read.', 'danger');
    }
  }

  protected applyImport(): void {
    const text = this.pendingImport();
    this.confirmImport.set(false);
    this.pendingImport.set(null);
    if (text === null) return;
    const result = this.service.importJson(text);
    if (result.ok) this.toast.show(`Progress imported (${result.exams} exams).`, 'success');
    else this.toast.show(result.message, 'danger');
  }

  protected async deleteAll(): Promise<void> {
    this.confirmReset.set(false);
    await this.service.resetAll();
    this.toast.show('All data was deleted from this device.', 'success');
  }
}
