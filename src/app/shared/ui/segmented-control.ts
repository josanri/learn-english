import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentOption {
  value: string;
  label: string;
}

let nextId = 0;

/**
 * Single-choice control built on native radio buttons (arrow keys, grouping and announcements for free).
 * Use for filters and settings: `<app-segmented-control label="Format" [options]="opts" [(value)]="format" />`.
 */
@Component({
  selector: 'app-segmented-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset>
      <legend [class.visually-hidden]="hideLabel()">{{ label() }}</legend>
      <div class="options">
        @for (option of options(); track option.value) {
          <label>
            <input
              type="radio"
              [name]="name"
              [value]="option.value"
              [checked]="option.value === value()"
              (change)="value.set(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styles: `
    fieldset {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }
    legend {
      padding: 0;
      margin-bottom: var(--space-2);
      font-size: var(--step--1);
      font-weight: 700;
      color: var(--text-muted);
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    label {
      position: relative;
      display: inline-flex;
    }
    input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    span {
      display: inline-flex;
      align-items: center;
      min-height: var(--target);
      padding: 0 var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      font-weight: 700;
      font-size: var(--step--1);
      transition: background var(--dur);
    }
    input:hover + span {
      background: var(--surface-2);
    }
    input:checked + span {
      background: var(--text);
      color: var(--bg);
    }
    input:focus-visible + span {
      outline: 3px solid var(--focus-ring);
      outline-offset: 3px;
    }
  `,
})
export class SegmentedControl {
  readonly label = input.required<string>();
  readonly options = input.required<readonly SegmentOption[]>();
  readonly hideLabel = input(false);
  readonly value = model<string>('');
  protected readonly name = `segmented-${nextId++}`;
}
