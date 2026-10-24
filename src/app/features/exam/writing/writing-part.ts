import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { SettingsService } from '../../../core/settings.service';
import { applyIssue } from '../../../core/writing/rule-engine';
import { countWords, lengthState, parseWordTarget } from '../../../core/writing/text';
import type { Issue } from '../../../core/writing/types';
import type { WritingPart } from '../../../models/exam';
import { Badge, Button, Card, SegmentedControl } from '../../../shared/ui';
import {
  checkKey,
  selectedTask,
  taskSpec,
  taskVocabulary,
  tasksOf,
  textKey,
  typeKey,
  type WritingCheckSummary,
} from '../parts/writing-prompts';
import { ExamSessionStore } from '../session/exam-session.store';
import { HighlightEditor } from './highlight-editor';
import { SuggestionsPanel, type ApplyEvent } from './suggestions-panel';
import { TaskChecklist } from './task-checklist';
import { WritingCheckerService } from './writing-checker.service';
import { WritingRubric } from './writing-rubric';

const SAVE_DELAY_MS = 500;

/** Names of the kinds of text, for the task heading and the task picker. */
const KIND_LABEL: Record<string, string> = {
  email: 'Email',
  article: 'Article',
  story: 'Story',
  message: 'Message',
  essay: 'Essay',
  letter: 'Letter',
  review: 'Review',
};

/**
 * Renderer of every writing part type (`email`, `choice-task`, `short-message`, `opinion-essay`):
 * the task (source email, notes, opening sentence), a highlight-overlay editor, a live word counter
 * against the target, the suggestions panel, the task checklist and the self-assessment rubric.
 *
 * The text is saved to `answers[part.id]` after a short pause (and on blur and when the screen is
 * left). The checker never changes the text by itself: "Apply" is always a click.
 */
@Component({
  selector: 'app-writing-part',
  imports: [
    Badge,
    Button,
    Card,
    SegmentedControl,
    HighlightEditor,
    SuggestionsPanel,
    TaskChecklist,
    WritingRubric,
  ],
  providers: [WritingCheckerService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layout">
      <div class="main">
        @if (tasks().length > 1) {
          <app-segmented-control
            label="Choose one task"
            [options]="taskOptions()"
            [value]="task().kind"
            (valueChange)="chooseTask($event)"
          />
        }

        <app-card class="task">
          <p class="eyebrow">{{ kindLabel() }} &middot; {{ task().wordCount }}</p>
          <h3 class="task-title">{{ task().title }}</h3>
          <p>{{ task().prompt }}</p>
          @if (task().sourceEmail; as mail) {
            <figure class="mail" aria-label="Email you received">
              <dl>
                <div>
                  <dt>From</dt>
                  <dd>{{ mail.from }}</dd>
                </div>
                <div>
                  <dt>Subject</dt>
                  <dd>{{ mail.subject }}</dd>
                </div>
              </dl>
              <p>{{ mail.body }}</p>
            </figure>
          }
          @if (task().notes?.length) {
            <h4>Notes</h4>
            <ul class="notes">
              @for (note of task().notes; track note) {
                <li>{{ note }}</li>
              }
            </ul>
          }
          @if (task().openingSentence; as opening) {
            <p class="opening">
              Start your story with: <q>{{ opening }}</q>
            </p>
            @if (!locked() && text().trim() === '') {
              <button appButton size="sm" type="button" (click)="insertOpening(opening)">
                Insert this sentence
              </button>
            }
          }
        </app-card>

        <h4 class="label" [id]="labelId()">Your answer</h4>
        <app-highlight-editor
          #editor
          [value]="text()"
          (valueChange)="onText($event)"
          [issues]="marks()"
          [activeId]="active()?.id ?? null"
          [readonly]="locked()"
          [spellcheck]="settings().nativeSpellcheck"
          [inputId]="'in-' + part().id"
          [labelledby]="labelId()"
          [describedby]="meterId()"
          (caret)="caret.set($event)"
          (blurred)="flush()"
        />

        <div class="meter" [id]="meterId()">
          <span class="count mono">{{ words() }} {{ words() === 1 ? 'word' : 'words' }}</span>
          <span class="target muted">Aim for {{ target().label }}</span>
          <app-badge [tone]="lengthTone()">{{ lengthLabel() }}</app-badge>
          <span class="saved muted" role="status">{{ savedText() }}</span>
        </div>
        <p class="visually-hidden" aria-live="polite">{{ lengthAnnouncement() }}</p>

        @if (active(); as issue) {
          <section class="current" aria-label="Suggestion for the word at the cursor">
            <p class="current-message">
              <strong>{{ issue.original }}</strong
              >: {{ issue.message }}
            </p>
            <div class="current-actions">
              @for (s of issue.suggestions.slice(0, 3); track s) {
                <button
                  appButton
                  size="sm"
                  variant="primary"
                  type="button"
                  [disabled]="locked()"
                  (click)="apply({ issue, suggestion: s })"
                >
                  {{ s === '' ? 'Remove it' : 'Apply: ' + s }}
                </button>
              }
              <button appButton size="sm" type="button" (click)="ignore(issue)">Ignore</button>
            </div>
          </section>
        }
        <p class="visually-hidden" role="status" aria-live="polite">{{ announcement() }}</p>
      </div>

      <aside class="side fold-side" aria-label="Writing help">
        @if (checkerOn()) {
          <section aria-labelledby="sugg-title">
            <h3 id="sugg-title">Suggestions</h3>
            <p class="muted small">
              {{ statusText() }}
              <strong>Nothing changes unless you press Apply.</strong>
            </p>
            <app-suggestions-panel
              [issues]="visible()"
              [activeId]="active()?.id ?? null"
              [spelling]="checker.spelling()"
              [hasText]="words() > 0"
              [disabled]="locked()"
              [ignoredCount]="ignored().size"
              (show)="show($event)"
              (apply)="apply($event)"
              (ignore)="ignore($event)"
              (restore)="restoreIgnored()"
            />
          </section>

          <section aria-labelledby="task-title">
            <h3 id="task-title">Task</h3>
            <app-task-checklist [items]="checker.checklist()" />
          </section>
        } @else {
          <p class="exam-note" role="note">
            <strong>Exam mode is on.</strong> Suggestions and the task checklist appear after you
            submit this section. Your word count is always shown.
          </p>
        }

        <section aria-labelledby="rubric-title">
          <h3 id="rubric-title">Rate your own writing</h3>
          <app-writing-rubric [partId]="part().id" />
        </section>
      </aside>
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      gap: var(--space-6);
    }
    @media (min-width: 64rem) {
      .layout {
        grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
        align-items: start;
      }
    }
    /* Split screen held like a book: the writing help fills the right screen (.fold-side). */
    :host-context(html[data-fold='book']) .layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .main,
    .side {
      min-width: 0;
    }
    h3 {
      font-size: var(--step-1);
    }
    h4 {
      margin: var(--space-3) 0 var(--space-2);
      font-size: var(--step-0);
      letter-spacing: 0;
    }
    .task {
      display: block;
      margin: var(--space-4) 0;
    }
    .eyebrow {
      margin: 0;
    }
    .task-title {
      margin: var(--space-1) 0 var(--space-2);
    }
    .mail {
      margin: var(--space-3) 0;
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-left: 6px solid var(--accent);
      border-radius: var(--radius-sm);
      background: var(--bg);
    }
    .mail dl {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-5);
      margin: 0 0 var(--space-2);
    }
    .mail dl div {
      display: flex;
      gap: var(--space-2);
    }
    .mail dt {
      color: var(--text-muted);
      font-size: var(--step--1);
      font-weight: 700;
      text-transform: uppercase;
    }
    .mail dd {
      margin: 0;
      font-weight: 700;
    }
    .mail p {
      margin: 0;
    }
    .notes {
      margin: 0;
      padding-left: var(--space-5);
    }
    .opening {
      margin: var(--space-3) 0 var(--space-2);
    }
    .label {
      margin-top: var(--space-5);
    }
    .meter {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-4);
      margin-top: var(--space-3);
    }
    .count {
      font-weight: 800;
    }
    .saved {
      margin-left: auto;
      font-size: var(--step--1);
    }
    .current {
      margin-top: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .current-message {
      margin: 0 0 var(--space-2);
    }
    .current-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .side section {
      margin-bottom: var(--space-6);
    }
    .small {
      font-size: var(--step--1);
    }
    .exam-note {
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-left-width: 6px;
      border-radius: var(--radius-sm);
      background: var(--surface);
    }
  `,
})
export class WritingPartView {
  readonly part = input.required<WritingPart>();

  protected readonly store = inject(ExamSessionStore);
  private readonly settingsService = inject(SettingsService);
  protected readonly settings = this.settingsService.settings;
  protected readonly checker = inject(WritingCheckerService);
  private readonly editor = viewChild.required<HighlightEditor>('editor');

  protected readonly locked = this.store.locked;
  protected readonly tasks = computed(() => tasksOf(this.part()));
  protected readonly task = computed(() => selectedTask(this.part(), this.store.answers()));
  protected readonly taskOptions = computed(() =>
    this.tasks().map((t) => ({ value: t.kind, label: KIND_LABEL[t.kind] ?? t.kind })),
  );
  protected readonly kindLabel = computed(() => KIND_LABEL[this.task().kind] ?? this.task().kind);
  protected readonly labelId = computed(() => `label-${this.part().id}`);
  protected readonly meterId = computed(() => `meter-${this.part().id}`);

  // ---- Text and autosave ----
  protected readonly text = signal('');
  protected readonly saveState = signal<'idle' | 'pending' | 'saved'>('idle');
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  // ---- Word count ----
  protected readonly words = computed(() => countWords(this.text()));
  protected readonly target = computed(() => parseWordTarget(this.task().wordCount));
  private readonly length = computed(() => lengthState(this.words(), this.target()));
  protected readonly lengthLabel = computed(
    () =>
      ({ empty: 'Start writing', short: 'Too short', good: 'Good length', long: 'Too long' })[
        this.length()
      ],
  );
  protected readonly lengthTone = computed(
    () =>
      (({ empty: 'neutral', short: 'warning', good: 'success', long: 'warning' }) as const)[
        this.length()
      ],
  );
  protected readonly lengthAnnouncement = computed(() => {
    const state = this.length();
    return state === 'empty' ? '' : `${this.lengthLabel()}: ${this.words()} words.`;
  });
  protected readonly savedText = computed(() => {
    if (this.locked()) return 'Submitted';
    return { idle: '', pending: 'Saving...', saved: 'Draft saved on this device' }[
      this.saveState()
    ];
  });

  // ---- Checker ----
  protected readonly checkerOn = computed(() => !this.store.examMode() || this.locked());
  protected readonly ignored = signal<ReadonlySet<string>>(new Set());
  protected readonly caret = signal(-1);
  protected readonly announcement = signal('');

  private readonly all = computed(() => this.checker.issues());
  /** Issues the learner has not ignored; a word still being typed is not reported yet. */
  protected readonly visible = computed(() => {
    const caret = this.caret();
    const text = this.text();
    return this.all().filter((issue) => {
      if (this.ignored().has(ignoreKey(issue))) return false;
      const typing =
        issue.source === 'spelling' &&
        issue.end === caret &&
        /\p{L}$/u.test(text.slice(0, caret)) &&
        !this.locked();
      return !typing;
    });
  });
  protected readonly marks = computed(() => (this.checkerOn() ? this.visible() : []));
  protected readonly active = computed(() => {
    const caret = this.caret();
    if (caret < 0 || !this.checkerOn()) return null;
    return this.visible().find((i) => caret > i.start && caret <= i.end) ?? null;
  });

  protected readonly statusText = computed(() => {
    const parts: string[] = [];
    if (this.checker.busy()) parts.push('Checking...');
    if (this.settings().languageTool) {
      const state = this.checker.languageToolState();
      parts.push(
        state === 'error'
          ? 'LanguageTool could not be reached.'
          : 'LanguageTool is on: your text is sent to api.languagetool.org.',
      );
    }
    return parts.join(' ');
  });

  constructor() {
    // The saved text is the starting point; after that the local signal is the source of truth.
    effect(() => {
      const saved = this.store.answers()[textKey(this.part().id)];
      untracked(() => {
        if (this.text() === '' && typeof saved === 'string') this.text.set(saved);
      });
    });

    // Run the checker when the screen opens and whenever the task, dictionary or LanguageTool change.
    effect(() => {
      if (!this.checkerOn()) return;
      const input = {
        lang: this.settings().spellingLang,
        languageTool: this.settings().languageTool,
        task: taskSpec(this.task()),
        exceptions: taskVocabulary(this.task(), [this.settings().studentName]),
      };
      untracked(() => this.checker.request({ ...input, text: this.text() }, true));
    });

    // Remember the counts of the last check (used by Results and the PDF report).
    effect(() => {
      if (!this.checkerOn() || this.checker.busy() || this.locked()) return;
      const state = this.checker.spelling();
      if (state !== 'ready' && state !== 'unavailable') return;
      const issues = this.visible();
      const checklist = this.checker.checklist();
      const text = untracked(() => this.text());
      if (text.trim() === '') return;
      const summary: Omit<WritingCheckSummary, 'at'> = {
        words: countWords(text),
        spelling: issues.filter((i) => i.group === 'spelling').length,
        grammar: issues.filter((i) => i.group === 'grammar').length,
        vocabulary: issues.filter((i) => i.group === 'vocabulary').length,
        checklistDone: checklist.filter((c) => c.status === 'done').length,
        checklistTotal: checklist.length,
      };
      untracked(() => {
        const key = checkKey(this.part().id);
        const stored = this.store.answers()[key];
        const same =
          typeof stored === 'string' &&
          JSON.stringify({ ...JSON.parse(stored), at: undefined }) ===
            JSON.stringify({ ...summary, at: undefined });
        if (!same) {
          this.store.setAnswer(key, JSON.stringify({ ...summary, at: new Date().toISOString() }));
        }
      });
    });

    inject(DestroyRef).onDestroy(() => this.flush());
  }

  // ---- Editing ----
  protected onText(next: string): void {
    const before = this.text();
    if (next === before) return;
    this.text.set(next);
    this.checker.textChanged(before, next);
    this.scheduleSave();
    if (this.checkerOn()) this.requestCheck(false);
  }

  private requestCheck(immediate: boolean): void {
    this.checker.request(
      {
        text: this.text(),
        lang: this.settings().spellingLang,
        languageTool: this.settings().languageTool,
        task: taskSpec(this.task()),
        exceptions: taskVocabulary(this.task(), [this.settings().studentName]),
      },
      immediate,
    );
  }

  private scheduleSave(): void {
    if (this.locked()) return;
    this.saveState.set('pending');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DELAY_MS);
  }

  /** Writes the text to the saved answers now. */
  protected flush(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    if (this.saveState() !== 'pending' || this.locked()) return;
    this.store.setAnswer(textKey(this.part().id), this.text());
    this.saveState.set('saved');
  }

  protected chooseTask(kind: string): void {
    if (this.locked()) return;
    this.store.setAnswer(typeKey(this.part().id), kind);
    this.ignored.set(new Set());
  }

  protected insertOpening(sentence: string): void {
    this.onText(`${sentence} `);
    this.editor().select(this.text().length, this.text().length);
  }

  // ---- Suggestions ----
  protected show(issue: Issue): void {
    this.editor().reveal(issue);
  }

  protected apply({ issue, suggestion }: ApplyEvent): void {
    if (this.locked()) return;
    const before = this.text();
    if (before.slice(issue.start, issue.end) !== issue.original) return; // text moved on
    const next = applyIssue(before, issue, suggestion);
    this.text.set(next);
    this.checker.textChanged(before, next);
    this.scheduleSave();
    this.flush();
    this.requestCheck(true);
    const caret = issue.start + suggestion.length;
    this.editor().select(caret, caret);
    this.caret.set(caret);
    this.announcement.set(
      suggestion === ''
        ? `Removed "${issue.original}".`
        : `Replaced "${issue.original}" with "${suggestion}".`,
    );
  }

  protected ignore(issue: Issue): void {
    this.ignored.update((set) => new Set(set).add(ignoreKey(issue)));
    this.announcement.set(`Ignored "${issue.original}".`);
  }

  protected restoreIgnored(): void {
    this.ignored.set(new Set());
  }
}

/** Ignoring hides every issue of the same rule with the same text. */
function ignoreKey(issue: Pick<Issue, 'ruleId' | 'original'>): string {
  return `${issue.ruleId}:${issue.original.toLowerCase()}`;
}
