import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Issue, IssueGroup, SpellingState } from '../../../core/writing/types';
import { Badge, Button } from '../../../shared/ui';

export interface ApplyEvent {
  issue: Issue;
  suggestion: string;
}

const GROUPS: readonly { id: IssueGroup; title: string; empty: string }[] = [
  { id: 'spelling', title: 'Spelling', empty: 'No spelling mistakes found.' },
  { id: 'grammar', title: 'Grammar', empty: 'No grammar or punctuation problems found.' },
  { id: 'vocabulary', title: 'Vocabulary', empty: 'No word-choice hints.' },
];

/**
 * The list of suggestions, grouped as Spelling / Grammar / Vocabulary. "Show" selects the text in
 * the editor, "Apply" makes the change the learner picked, "Ignore" hides the hint. Nothing is ever
 * changed without a click.
 */
@Component({
  selector: 'app-suggestions-panel',
  imports: [Badge, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (group of groups(); track group.id) {
      <details class="group" [open]="group.issues.length > 0 || null">
        <summary>
          <span class="name">{{ group.title }}</span>
          <app-badge [tone]="group.issues.length > 0 ? 'warning' : 'success'">
            {{ group.issues.length }}
            <span class="visually-hidden"> {{ group.issues.length === 1 ? 'hint' : 'hints' }}</span>
          </app-badge>
        </summary>
        @if (group.issues.length === 0) {
          <p class="empty muted">
            @if (group.id === 'spelling' && spelling() === 'loading') {
              Loading the dictionary...
            } @else if (group.id === 'spelling' && spelling() === 'unavailable') {
              The spelling dictionary could not be loaded. Check your connection and try again.
            } @else if (!hasText()) {
              Nothing to check yet.
            } @else {
              {{ group.empty }}
            }
          </p>
        } @else {
          <ul class="issues">
            @for (issue of group.issues; track issue.id) {
              <li
                class="issue"
                [attr.data-severity]="issue.severity"
                [class.active]="issue.id === activeId()"
              >
                <button type="button" class="where" (click)="show.emit(issue)">
                  <span class="original">{{ shorten(issue.original) }}</span>
                  <span class="category">{{ issue.category }}</span>
                  @if (issue.severity === 'note') {
                    <span class="category">Hint</span>
                  }
                  <span class="visually-hidden">. Show in the text</span>
                </button>
                <p class="message">{{ issue.message }}</p>
                <div class="actions">
                  @for (s of issue.suggestions.slice(0, 3); track s) {
                    <button
                      appButton
                      size="sm"
                      variant="primary"
                      type="button"
                      [disabled]="disabled()"
                      (click)="apply.emit({ issue, suggestion: s })"
                    >
                      {{ label(s) }}
                      <span class="visually-hidden"> for {{ shorten(issue.original) }}</span>
                    </button>
                  }
                  <button appButton size="sm" type="button" (click)="ignore.emit(issue)">
                    Ignore
                    <span class="visually-hidden"> {{ shorten(issue.original) }}</span>
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </details>
    }
    @if (ignoredCount() > 0) {
      <p class="ignored muted">
        {{ ignoredCount() }} ignored.
        <button type="button" class="link" (click)="restore.emit()">Show them again</button>
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .group {
      margin-bottom: var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      min-height: var(--target);
      padding: var(--space-2) var(--space-4);
      font-weight: 700;
      cursor: pointer;
    }
    .empty {
      margin: 0;
      padding: 0 var(--space-4) var(--space-3);
      font-size: var(--step--1);
    }
    .issues {
      margin: 0;
      padding: 0 var(--space-3) var(--space-3);
      list-style: none;
    }
    .issue {
      margin-top: var(--space-3);
      padding: var(--space-3);
      border-left: 5px solid var(--warning);
      border-radius: var(--radius-sm);
      background: var(--bg);
    }
    .issue[data-severity='note'] {
      border-left-style: dotted;
    }
    .issue.active {
      outline: 2px solid var(--focus-ring);
    }
    .where {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-2);
      min-height: var(--target);
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .where:hover .original {
      text-decoration: underline;
    }
    .original {
      font-family: var(--font-mono);
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .category {
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .message {
      margin: 0 0 var(--space-2);
      font-size: var(--step--1);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .ignored {
      font-size: var(--step--1);
    }
    .link {
      min-height: var(--target);
      padding: 0 var(--space-1);
      border: 0;
      background: none;
      color: var(--accent-text);
      font: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
  `,
})
export class SuggestionsPanel {
  readonly issues = input.required<readonly Issue[]>();
  readonly activeId = input<string | null>(null);
  readonly spelling = input<SpellingState>('idle');
  readonly hasText = input(false);
  readonly disabled = input(false);
  readonly ignoredCount = input(0);

  readonly show = output<Issue>();
  readonly apply = output<ApplyEvent>();
  readonly ignore = output<Issue>();
  readonly restore = output<void>();

  protected readonly groups = computed(() =>
    GROUPS.map((g) => ({ ...g, issues: this.issues().filter((i) => i.group === g.id) })),
  );

  protected label(suggestion: string): string {
    return suggestion === '' ? 'Remove it' : `Apply: ${suggestion}`;
  }

  protected shorten(text: string): string {
    const flat = text.replace(/\s+/g, ' ');
    return flat.length > 48 ? `${flat.slice(0, 45)}...` : flat;
  }
}
