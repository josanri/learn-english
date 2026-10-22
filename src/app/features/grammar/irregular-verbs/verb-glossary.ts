import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { SpeechService } from '../../../core/speech.service';
import { LocalStorageService } from '../../../core/storage.service';
import type { IrregularVerb, VerbPattern } from '../../../models/grammar';
import { Badge, EmptyState, Icon, SegmentedControl, type SegmentOption } from '../../../shared/ui';
import { patternOf } from './verb-engine';

const PATTERNS: SegmentOption[] = [
  { value: 'all', label: 'All patterns' },
  { value: 'AAA', label: 'cut-cut-cut' },
  { value: 'ABA', label: 'come-came-come' },
  { value: 'ABB', label: 'make-made-made' },
  { value: 'ABC', label: 'sing-sang-sung' },
];

const SCOPES: SegmentOption[] = [
  { value: 'all', label: 'All verbs' },
  { value: 'starred', label: 'Starred' },
];

interface Row {
  verb: IrregularVerb;
  pattern: VerbPattern;
}

/** Searchable table of the irregular verbs with a pattern filter, stars and a spoken example. */
@Component({
  selector: 'app-verb-glossary',
  imports: [Badge, EmptyState, Icon, SegmentedControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters">
      <div class="field search">
        <label for="verb-search">Search a verb</label>
        <input
          id="verb-search"
          type="search"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
      </div>
      <app-segmented-control label="Pattern" [options]="patterns" [(value)]="pattern" />
      <app-segmented-control label="Show" [options]="scopes" [(value)]="scope" />
    </div>

    <p class="muted count" role="status">{{ rows().length }} of {{ verbs().length }} verbs shown</p>

    @if (rows().length === 0) {
      <app-empty-state
        heading="No verbs found"
        description="Try another word or change the filters."
        icon="info"
      />
    } @else {
      <table>
        <caption class="visually-hidden">
          Irregular verbs: base form, past simple, past participle and pattern
        </caption>
        <thead>
          <tr>
            <th scope="col">Base form</th>
            <th scope="col">Past simple</th>
            <th scope="col">Past participle</th>
            <th scope="col">Pattern</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.verb.id) {
            <tr>
              <th scope="row" data-label="Base form">
                {{ row.verb.base }}
                @if (row.verb.note) {
                  <span class="note">{{ row.verb.note }}</span>
                }
              </th>
              <td data-label="Past simple">
                {{ row.verb.past }}
                @for (alt of row.verb.alt?.past ?? []; track alt) {
                  <span class="alt">/ {{ alt }}</span>
                }
              </td>
              <td data-label="Past participle">
                {{ row.verb.participle }}
                @for (alt of row.verb.alt?.participle ?? []; track alt) {
                  <span class="alt">/ {{ alt }}</span>
                }
              </td>
              <td data-label="Pattern">
                <app-badge>{{ row.pattern }}</app-badge>
              </td>
              <td class="actions">
                @if (speech.supported) {
                  <button
                    type="button"
                    class="icon-button"
                    [attr.aria-label]="'Hear the verb ' + row.verb.base"
                    (click)="hear(row.verb)"
                  >
                    <app-icon name="volume" [size]="20" />
                  </button>
                }
                <button
                  type="button"
                  class="icon-button star"
                  [class.on]="isStarred(row.verb.id)"
                  [attr.aria-pressed]="isStarred(row.verb.id)"
                  [attr.aria-label]="'Star the verb ' + row.verb.base"
                  (click)="store.toggleVerbStar(row.verb.id)"
                >
                  <app-icon name="flag" [size]="20" />
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    .filters {
      display: grid;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .search {
      max-width: 24rem;
      margin-bottom: 0;
    }
    .count {
      margin: 0 0 var(--space-3);
      font-size: var(--step--1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    th,
    td {
      padding: var(--space-3) var(--space-4);
      border-bottom: var(--bw) solid var(--border-muted);
      text-align: start;
      vertical-align: middle;
    }
    thead th {
      font-family: var(--font-mono);
      font-size: var(--step--1);
      font-weight: 500;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    tbody th {
      font-weight: 800;
    }
    .alt {
      color: var(--text-muted);
    }
    .note {
      display: block;
      max-width: 22rem;
      color: var(--text-muted);
      font-size: var(--step--1);
      font-weight: 400;
    }
    .actions {
      white-space: nowrap;
      text-align: end;
    }
    .icon-button {
      display: inline-grid;
      place-items: center;
      width: var(--target);
      height: var(--target);
      border: var(--bw) solid transparent;
      border-radius: var(--radius);
      background: transparent;
      color: var(--text);
      cursor: pointer;
    }
    .icon-button:hover {
      background: var(--surface-2);
    }
    .star.on {
      border-color: var(--border);
      background: var(--surface-2);
    }

    @media (max-width: 47.99rem) {
      table,
      tbody,
      tr,
      th,
      td {
        display: block;
      }
      thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
      }
      tbody tr {
        margin-bottom: var(--space-3);
        border: var(--bw) solid var(--border-muted);
        border-radius: var(--radius-lg);
        background: var(--surface);
      }
      table {
        border: 0;
        background: transparent;
      }
      th,
      td {
        border-bottom: 0;
        padding: var(--space-2) var(--space-4);
      }
      td[data-label]::before {
        content: attr(data-label) ': ';
        color: var(--text-muted);
        font-size: var(--step--1);
      }
      .actions {
        text-align: start;
      }
    }
  `,
})
export class VerbGlossary {
  readonly verbs = input.required<readonly IrregularVerb[]>();

  protected readonly store = inject(LocalStorageService);
  protected readonly speech = inject(SpeechService);
  protected readonly patterns = PATTERNS;
  protected readonly scopes = SCOPES;
  protected readonly query = signal('');
  protected readonly pattern = signal('all');
  protected readonly scope = signal('all');

  protected readonly rows = computed<Row[]>(() => {
    const q = this.query().trim().toLowerCase();
    const progress = this.store.grammar().verbs;
    return this.verbs()
      .map((verb) => ({ verb, pattern: patternOf(verb) }))
      .filter(({ verb, pattern }) => {
        if (this.pattern() !== 'all' && pattern !== this.pattern()) return false;
        if (this.scope() === 'starred' && !progress[verb.id]?.starred) return false;
        if (!q) return true;
        return [
          verb.base,
          verb.past,
          verb.participle,
          ...(verb.alt?.past ?? []),
          ...(verb.alt?.participle ?? []),
        ].some((form) => form.toLowerCase().includes(q));
      });
  });

  protected isStarred(id: string): boolean {
    return this.store.grammar().verbs[id]?.starred === true;
  }

  protected hear(verb: IrregularVerb): void {
    void this.speech.speakText(`${verb.base}. ${verb.past}. ${verb.participle}.`);
  }
}
