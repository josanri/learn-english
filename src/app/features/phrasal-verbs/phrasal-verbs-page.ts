import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FoldPosture } from '../../core/fold-posture.service';
import { LocalStorageService } from '../../core/storage.service';
import { PracticeCatalogueService } from '../../data/practice-catalogue.service';
import type { PhrasalVerb } from '../../models/practice';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  ProgressBar,
  SegmentedControl,
  type SegmentOption,
} from '../../shared/ui';
import {
  PHRASAL_SESSION_SIZE,
  choicesFor,
  gapForParticle,
  gapForVerb,
  isLearnt,
  parseExample,
  phrasalToReview,
  selectPhrasal,
  shuffle,
  type Choice,
  type GapPart,
  type PhrasalMode,
} from './phrasal-engine';

type ModeChoice = PhrasalMode | 'mixed';
type Phase = 'setup' | 'running' | 'done';

const VIEWS: SegmentOption[] = [
  { value: 'practice', label: 'Practice' },
  { value: 'list', label: 'List' },
];

const MODES: SegmentOption[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'meaning', label: 'Meaning' },
  { value: 'gap', label: 'Complete the sentence' },
  { value: 'particle', label: 'Missing particle' },
];

const MODE_HELP: Record<ModeChoice, string> = {
  mixed: 'A mix of the three exercises.',
  meaning: 'You see a phrasal verb. Choose what it means.',
  gap: 'You see a sentence with a gap. Choose the phrasal verb that completes it.',
  particle: 'You see a sentence with the verb but not the small word after it. Choose it.',
};

const POOLS: SegmentOption[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'Not learnt yet' },
  { value: 'review', label: 'To review' },
];

interface Question {
  key: string;
  verb: PhrasalVerb;
  mode: PhrasalMode;
  choices: Choice[];
  gaps: GapPart[];
}

interface Outcome {
  verb: PhrasalVerb;
  correct: boolean;
}

/** `/vocabulary/phrasal-verbs`: a list of common phrasal verbs and three exercises. */
@Component({
  selector: 'app-phrasal-verbs-page',
  imports: [RouterLink, Button, Card, Chip, EmptyState, Icon, ProgressBar, SegmentedControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow"><a routerLink="/vocabulary/b1">Words</a> &middot; Phrasal verbs</p>
      <h1>Phrasal verbs</h1>
      <p class="lede">
        Verbs like <em>give up</em> and <em>look after</em> are everywhere in B1 reading and
        listening. Practise a dozen a day: the ones you miss come back more often.
      </p>

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the phrasal verbs&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The phrasal verbs could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else {
        <ul class="stats" aria-label="Your progress">
          <li>
            <app-chip [prompt]="false">{{ learntCount() }} learnt</app-chip>
          </li>
          <li>
            <app-chip [prompt]="false">{{ practisedCount() }} practised</app-chip>
          </li>
          <li>
            <app-chip [prompt]="false">{{ reviewCount() }} to review</app-chip>
          </li>
          <li>
            <app-chip [prompt]="false">{{ verbs().length }} phrasal verbs</app-chip>
          </li>
        </ul>

        @if (!book()) {
          <div class="view">
            <app-segmented-control label="Section" [options]="views" [(value)]="view" />
          </div>
        }

        @if (book() || view() === 'list') {
          <div class="filters">
            <div class="field">
              <label for="pv-search">Search</label>
              <input
                id="pv-search"
                type="search"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
                [value]="query()"
                (input)="query.set($any($event.target).value)"
              />
            </div>
            <div class="field">
              <label for="pv-list-group">Topic</label>
              <select
                id="pv-list-group"
                [value]="listGroup()"
                (change)="listGroup.set($any($event.target).value)"
              >
                <option value="all">All topics</option>
                @for (g of groups(); track g.id) {
                  <option [value]="g.id">{{ g.name }}</option>
                }
              </select>
            </div>
          </div>
          <p class="muted" role="status">{{ listed().length }} phrasal verbs</p>
          <ul class="list">
            @for (v of listed(); track v.id) {
              <li>
                <p class="verb">
                  {{ v.verb }}
                  @if (learnt(v)) {
                    <span class="learnt"><app-icon name="check" [size]="16" /> learnt</span>
                  }
                </p>
                <p class="meaning">{{ v.meaning }}</p>
                <p class="ex">
                  @for (part of parts(v); track $index) {
                    @if (part.marked) {
                      <strong>{{ part.text }}</strong>
                    } @else {
                      {{ part.text }}
                    }
                  }
                </p>
              </li>
            }
          </ul>
        }
        @if (book() || view() !== 'list') {
          <div [class.fold-side]="book()">
            @switch (phase()) {
              @case ('setup') {
                <app-card>
                  <h2>Practice</h2>
                  <div class="setup">
                    <app-segmented-control label="Exercise" [options]="modes" [(value)]="mode" />
                    <p class="hint">{{ modeHelp() }}</p>
                    <div class="field">
                      <label for="pv-group">Topic</label>
                      <select
                        id="pv-group"
                        [value]="group()"
                        (change)="group.set($any($event.target).value)"
                      >
                        <option value="all">All topics</option>
                        @for (g of groups(); track g.id) {
                          <option [value]="g.id">{{ g.name }} ({{ countIn(g.id) }})</option>
                        }
                      </select>
                    </div>
                    <app-segmented-control
                      label="Phrasal verbs"
                      [options]="pools"
                      [(value)]="pool"
                    />
                    <p class="hint" role="status">
                      @if (poolIds().length === 0) {
                        {{ emptyText() }}
                      } @else {
                        {{ poolIds().length }} available. {{ sessionSize() }} per session.
                      }
                    </p>
                    <div>
                      <button
                        appButton
                        type="button"
                        variant="primary"
                        size="lg"
                        [disabled]="poolIds().length === 0"
                        (click)="start()"
                      >
                        Start
                        <app-icon name="arrow" [size]="22" />
                      </button>
                    </div>
                  </div>
                </app-card>
              }
              @case ('running') {
                @if (question(); as q) {
                  <div class="progress">
                    <p class="count" role="status">
                      Question {{ index() + 1 }} of {{ questions().length }}
                    </p>
                    <app-progress-bar
                      [value]="index() / questions().length"
                      label="Session progress"
                    />
                  </div>
                  <article class="question">
                    @switch (q.mode) {
                      @case ('meaning') {
                        <p class="ask">What does it mean?</p>
                        <p class="prompt">{{ q.verb.verb }}</p>
                      }
                      @case ('gap') {
                        <p class="ask">Which phrasal verb completes the sentence?</p>
                        <p class="sentence">
                          @for (part of q.gaps; track $index) {
                            @if (part.gap) {
                              <span class="gap" [class.filled]="picked() !== null">{{
                                picked() !== null ? part.text : '_____'
                              }}</span>
                            } @else {
                              {{ part.text }}
                            }
                          }
                        </p>
                        <p class="hint">The options are in the base form.</p>
                      }
                      @case ('particle') {
                        <p class="ask">Which word or words are missing?</p>
                        <p class="sentence">
                          @for (part of q.gaps; track $index) {
                            @if (part.gap) {
                              <span class="gap" [class.filled]="picked() !== null">{{
                                picked() !== null ? part.text : '_____'
                              }}</span>
                            } @else {
                              {{ part.text }}
                            }
                          }
                        </p>
                      }
                    }
                    <div class="options" role="group" aria-label="Options">
                      @for (choice of q.choices; track choice.label; let i = $index) {
                        <button
                          type="button"
                          class="option"
                          [class.right]="picked() !== null && choice.correct"
                          [class.wrong]="picked() === i && !choice.correct"
                          [disabled]="picked() !== null"
                          [attr.aria-pressed]="picked() === i"
                          (click)="pick(q, i)"
                        >
                          {{ choice.label }}
                        </button>
                      }
                    </div>
                    @if (picked() !== null) {
                      <div class="feedback" role="status">
                        @if (q.choices[picked()!].correct) {
                          <p class="result right"><app-icon name="check" /> Right.</p>
                        } @else {
                          <p class="result wrong"><app-icon name="cross" /> Not quite.</p>
                        }
                        <p>
                          <strong>{{ q.verb.verb }}</strong
                          >: {{ q.verb.meaning }}.
                        </p>
                        <p class="ex">
                          @for (part of parts(q.verb); track $index) {
                            @if (part.marked) {
                              <strong>{{ part.text }}</strong>
                            } @else {
                              {{ part.text }}
                            }
                          }
                        </p>
                        <button
                          appButton
                          type="button"
                          variant="primary"
                          class="next"
                          (click)="advance()"
                        >
                          {{ index() + 1 >= questions().length ? 'See results' : 'Next' }}
                          <app-icon name="arrow" />
                        </button>
                      </div>
                    }
                  </article>
                  <p class="end">
                    <button appButton type="button" variant="ghost" size="sm" (click)="finish()">
                      End session
                    </button>
                  </p>
                }
              }
              @case ('done') {
                <app-card [raised]="true">
                  <h2 tabindex="-1">Session finished</h2>
                  @if (outcomes().length === 0) {
                    <p>You did not answer any question.</p>
                  } @else {
                    <p class="score" role="status">
                      {{ rightCount() }} of {{ outcomes().length }} right.
                    </p>
                    @if (missed().length > 0) {
                      <h3>To review</h3>
                      <ul class="missed">
                        @for (v of missed(); track v.id) {
                          <li>
                            <strong>{{ v.verb }}</strong
                            >: {{ v.meaning }}
                          </li>
                        }
                      </ul>
                    } @else {
                      <p>No mistakes. Well done.</p>
                    }
                  }
                  <div class="actions">
                    @if (missed().length > 0) {
                      <button appButton type="button" variant="primary" (click)="practiseMissed()">
                        Practise these again
                      </button>
                    }
                    <button appButton type="button" (click)="start()">New session</button>
                    <button appButton type="button" variant="ghost" (click)="phase.set('setup')">
                      Change settings
                    </button>
                  </div>
                </app-card>
              }
            }
          </div>
        }

        <p class="more">
          <a appButton variant="secondary" routerLink="/grammar/phrasal-verbs">
            Read the grammar of phrasal verbs
          </a>
        </p>
      }
    </div>
  `,
  styles: `
    .eyebrow a {
      color: inherit;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: var(--space-4) 0 0;
      padding: 0;
      list-style: none;
    }
    .view {
      margin-block: var(--space-5);
    }
    /* Split screen held like a book: no section switch, so the stats keep its space below them. */
    :host-context(html[data-fold='book']) .stats {
      margin-bottom: var(--space-5);
    }
    h2 {
      margin-bottom: var(--space-4);
    }
    .setup {
      display: grid;
      gap: var(--space-4);
    }
    .setup .field {
      margin-bottom: 0;
      max-width: 24rem;
    }
    .progress {
      display: grid;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
    }
    .count {
      margin: 0;
      font-family: var(--font-mono);
      font-size: var(--step--1);
      color: var(--text-muted);
    }
    .question {
      max-width: 44rem;
      padding: var(--space-5);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      box-shadow: 6px 6px 0 var(--shadow-solid);
    }
    .ask {
      margin: 0 0 var(--space-2);
      font-weight: 700;
      color: var(--text-muted);
    }
    .prompt {
      margin: 0 0 var(--space-5);
      font-size: var(--step-4);
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 1;
    }
    .sentence {
      margin: 0 0 var(--space-3);
      font-size: var(--step-2);
      line-height: 1.5;
    }
    .gap {
      display: inline-block;
      min-width: 4ch;
      padding-inline: var(--space-1);
      border-bottom: var(--bw-card) solid var(--text);
      font-weight: 800;
    }
    .gap.filled {
      border-color: var(--success);
      color: var(--success);
    }
    .hint {
      margin: 0 0 var(--space-4);
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      gap: var(--space-3);
    }
    .option {
      min-height: var(--target);
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font: inherit;
      font-size: var(--step-0);
      text-align: left;
      cursor: pointer;
    }
    .option:hover:not(:disabled) {
      background: var(--surface-2);
    }
    .option:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .option:disabled {
      cursor: default;
    }
    .option.right {
      border-width: var(--bw-card);
      border-color: var(--success);
      background: var(--paper-green);
      color: var(--paper-ink);
    }
    .option.wrong {
      border-width: var(--bw-card);
      border-color: var(--danger);
      background: var(--paper-coral);
      color: var(--paper-ink);
    }
    .feedback {
      display: grid;
      gap: var(--space-2);
      margin-top: var(--space-5);
    }
    .feedback p {
      margin: 0;
    }
    .result {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-weight: 800;
    }
    .result.right {
      color: var(--success);
    }
    .result.wrong {
      color: var(--danger);
    }
    .ex {
      margin: 0;
      font-style: italic;
    }
    .ex strong {
      font-style: normal;
    }
    .next {
      justify-self: start;
      margin-top: var(--space-2);
    }
    .end {
      margin: var(--space-4) 0 0;
    }
    .score {
      font-size: var(--step-2);
      font-weight: 800;
    }
    .missed {
      display: grid;
      gap: var(--space-1);
      margin: 0 0 var(--space-5);
      padding-inline-start: var(--space-5);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
      gap: var(--space-4);
      max-width: 40rem;
    }
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
      gap: var(--space-4);
      margin: var(--space-4) 0 0;
      padding: 0;
      list-style: none;
    }
    .list li {
      display: grid;
      align-content: start;
      gap: var(--space-1);
      padding: var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .list p {
      margin: 0;
    }
    .verb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--step-1);
      font-weight: 800;
    }
    .learnt {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-family: var(--font-mono);
      font-size: var(--step--1);
      font-weight: 500;
      color: var(--success);
    }
    .meaning {
      color: var(--text-muted);
    }
    .more {
      margin-top: var(--space-7);
    }
  `,
})
export class PhrasalVerbsPage {
  protected readonly resource = inject(PracticeCatalogueService).phrasalVerbs();
  private readonly store = inject(LocalStorageService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly views = VIEWS;
  protected readonly modes = MODES;
  protected readonly pools = POOLS;
  protected readonly view = signal('practice');
  private readonly fold = inject(FoldPosture);
  /** Split screen held like a book: the list and the practice show at once, with no switch. */
  protected readonly book = computed(() => this.fold.layout() === 'book');
  protected readonly mode = signal('mixed');
  protected readonly pool = signal('all');
  protected readonly group = signal('all');
  protected readonly listGroup = signal('all');
  protected readonly query = signal('');
  protected readonly phase = signal<Phase>('setup');
  protected readonly questions = signal<Question[]>([]);
  protected readonly index = signal(0);
  protected readonly picked = signal<number | null>(null);
  protected readonly outcomes = signal<Outcome[]>([]);

  protected readonly verbs = computed<readonly PhrasalVerb[]>(() =>
    this.resource.hasValue() ? this.resource.value().verbs : [],
  );
  protected readonly groups = computed(() =>
    this.resource.hasValue() ? this.resource.value().groups : [],
  );
  private readonly progress = computed(() => this.store.practice().phrasal);

  protected readonly learntCount = computed(
    () => this.verbs().filter((v) => isLearnt(this.progress()[v.id])).length,
  );
  protected readonly practisedCount = computed(
    () => this.verbs().filter((v) => this.progress()[v.id] !== undefined).length,
  );
  protected readonly reviewCount = computed(
    () => phrasalToReview(this.verbs(), this.progress()).length,
  );
  protected readonly modeHelp = computed(() => MODE_HELP[this.mode() as ModeChoice] ?? '');

  protected readonly poolIds = computed(() => {
    const group = this.group();
    const inGroup = this.verbs().filter((v) => group === 'all' || v.group === group);
    switch (this.pool()) {
      case 'review':
        return phrasalToReview(inGroup, this.progress()).map((v) => v.id);
      case 'new':
        return inGroup.filter((v) => !isLearnt(this.progress()[v.id])).map((v) => v.id);
      default:
        return inGroup.map((v) => v.id);
    }
  });
  protected readonly sessionSize = computed(() =>
    Math.min(PHRASAL_SESSION_SIZE, this.poolIds().length),
  );
  protected readonly emptyText = computed(() =>
    this.pool() === 'review'
      ? 'Nothing to review here yet. The phrasal verbs you get wrong appear in this list.'
      : 'You have learnt every phrasal verb in this topic. Choose "All" to keep them fresh.',
  );

  protected readonly listed = computed(() => {
    const text = this.query().trim().toLowerCase();
    const group = this.listGroup();
    return this.verbs()
      .filter((v) => group === 'all' || v.group === group)
      .filter((v) => !text || v.verb.includes(text) || v.meaning.toLowerCase().includes(text))
      .slice()
      .sort((a, b) => a.verb.localeCompare(b.verb));
  });

  protected readonly question = computed(() => this.questions()[this.index()] ?? null);
  protected readonly rightCount = computed(() => this.outcomes().filter((o) => o.correct).length);
  protected readonly missed = computed(() =>
    this.outcomes()
      .filter((o) => !o.correct)
      .map((o) => o.verb),
  );

  protected countIn(groupId: string): number {
    return this.verbs().filter((v) => v.group === groupId).length;
  }

  protected learnt(verb: PhrasalVerb): boolean {
    return isLearnt(this.progress()[verb.id]);
  }

  protected parts(verb: PhrasalVerb) {
    return parseExample(verb.example);
  }

  protected start(onlyIds?: readonly string[]): void {
    const picked = selectPhrasal(this.verbs(), this.progress(), {
      onlyIds: onlyIds ?? this.poolIds(),
    });
    const chosen = this.mode() as ModeChoice;
    const order: PhrasalMode[] = shuffle(['meaning', 'gap', 'particle']);
    this.questions.set(
      picked.map((verb, i) => {
        const mode = chosen === 'mixed' ? order[i % order.length] : chosen;
        return {
          key: `${i}-${verb.id}-${mode}`,
          verb,
          mode,
          choices: choicesFor(verb, mode, this.verbs()),
          gaps: mode === 'particle' ? gapForParticle(verb) : gapForVerb(verb),
        };
      }),
    );
    this.index.set(0);
    this.picked.set(null);
    this.outcomes.set([]);
    this.phase.set(picked.length > 0 ? 'running' : 'setup');
    this.focus('.option');
  }

  protected practiseMissed(): void {
    this.start(this.missed().map((v) => v.id));
  }

  protected pick(question: Question, choiceIndex: number): void {
    if (this.picked() !== null) return;
    const correct = question.choices[choiceIndex].correct;
    this.picked.set(choiceIndex);
    this.store.recordPhrasalResult(question.verb.id, correct);
    this.outcomes.update((list) => [...list, { verb: question.verb, correct }]);
    this.focus('.next');
  }

  protected advance(): void {
    if (this.index() + 1 >= this.questions().length) {
      this.finish();
      return;
    }
    this.index.update((i) => i + 1);
    this.picked.set(null);
    this.focus('.option');
  }

  protected finish(): void {
    this.phase.set('done');
    this.focus('h2');
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
