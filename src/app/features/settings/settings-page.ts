import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SettingsService } from '../../core/settings.service';
import type { ThemePreference } from '../../models/storage';

/** `/settings`: theme and listening speed. */
@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Settings</h1>
    <p>
      <label>
        Theme
        <select [value]="settings().theme" (change)="setTheme($event)">
          <option value="system">Follow my device</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </p>
    <p>
      <label>
        Listening speed
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          [value]="settings().speechRate"
          (input)="setRate($event)"
        />
        {{ settings().speechRate }}&times;
      </label>
    </p>
  `,
})
export class SettingsPage {
  private readonly service = inject(SettingsService);
  protected readonly settings = this.service.settings;

  protected setTheme(event: Event): void {
    this.service.setTheme((event.target as HTMLSelectElement).value as ThemePreference);
  }

  protected setRate(event: Event): void {
    this.service.setSpeechRate(Number((event.target as HTMLInputElement).value));
  }
}
