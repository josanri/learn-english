import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpeechService } from '../../core/speech.service';
import { LocalStorageService } from '../../core/storage.service';
import { PracticeCatalogueService } from '../../data/practice-catalogue.service';
import type { BasicWord } from '../../models/practice';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  type IconName,
  ProgressBar,
  SegmentedControl,
  type SegmentOption,
} from '../../shared/ui';
import {
  BASIC_SESSION_SIZE,
  basicChoices,
  basicToReview,
  gapForWord,
  isLearnt,
  mixedModes,
  plainExample,
  selectBasic,
  spellingHint,
  spellingIsRight,
  topicProgress,
  type BasicMode,
  type Choice,
  type GapPart,
} from './basic-engine';
import { BasicWordList, type WordGroup } from './basic-word-list';

type ModeChoice = BasicMode | 'mixed';
type Phase = 'setup' | 'running' | 'done';

const VIEWS: SegmentOption[] = [
  { value: 'learn', label: 'Learn' },
  { value: 'practice', label: 'Practice' },
];

const ALL_MODES: SegmentOption[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'word', label: 'Choose the word' },
  { value: 'meaning', label: 'Meaning' },
  { value: 'gap', label: 'Complete the sentence' },
  { value: 'listen', label: 'Listen' },
  { value: 'spell', label: 'Spell it' },
];

const MODE_HELP: Record<ModeChoice, string> = {
  mixed: 'A mix of the exercises.',
  word: 'You read a definition. Choose the word.',
  meaning: 'You see a word. Choose what it means.',
  gap: 'You see a sentence with a gap and a definition. Choose the word.',
  listen: 'You hear a word. Choose how it is written.',
  spell: 'You read a definition. Type the word.',
};

const POOLS: SegmentOption[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'Not learnt yet' },
  { value: 'review', label: 'To review' },
];

interface Question {
  key: string;
  word: BasicWord;
  mode: BasicMode;
  choices: Choice[];
  gaps: GapPart[];
}

interface Outcome {
  word: BasicWord;
  correct: boolean;
}

/** `/vocabulary/basic/:topic`: the words of one topic with model phrases, and five exercises. */
@Component({
  selector: 'app-basic-topic-page',
  imports: [
    RouterLink,
    BasicWordList,
    Button,
    Card,
    Chip,
    EmptyState,
    Icon,
    ProgressBar,
    SegmentedControl,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">
        <a routerLink="/vocabulary/b1">Words</a> &middot;
        <a routerLink="/vocabulary/basic">Basic vocabulary</a>
      </p>

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the words&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The words could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else if (current(); as topic) {
        <h1>{{ topic.name }}</h1>
        <p class="lede">{{ topic.intro }}</p>

        <ul class="stats" aria-label="Your progress">
          <li>
            <app-chip [prompt]="false">{{ progress().learnt }} learnt</app-chip>
          </li>
          <li>
            <app-chip [prompt]="false">{{ reviewCount() }} to review</app-chip>
          </li>
          <li>
            <app-chip [prompt]="false">{{ progress().total }} words</app-chip>
          </li>
        </ul>

        <div class="view">
          <app-segmented-control label="Section" [options]="views" [(value)]="view" />
        </div>

        @if (view() === 'learn') {
          <app-basic-word-list
            [groups]="groups()"
            [phrases]="topic.phrases"
            [icon]="icon()"
            [progress]="saved()"
          />
          <p class="more">
            <button appButton type="button" variant="primary" (click)="view.set('practice')">
              Practise these words
              <app-icon name="arrow" />
            </button>
          </p>
        } @else {
          @switch (phase()) {
            @case ('setup') {
              <app-card>
                <h2>Practice</h2>
                <div class="setup">
                  <app-segmented-control label="Exercise" [options]="modes" [(value)]="mode" />
                  <p class="hint">{{ modeHelp() }}</p>
                  <app-segmented-control label="Words" [options]="pools" [(value)]="pool" />
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
                    @case ('word') {
                      <p class="ask">Which word is it?</p>
                      <p class="definition">{{ q.word.d }}</p>
                    }
                    @case ('meaning') {
                      <p class="ask">What does it mean?</p>
                      <p class="prompt">{{ q.word.w }}</p>
                    }
                    @case ('gap') {
                      <p class="ask">Which word completes the sentence?</p>
                      <p class="sentence">
                        @for (part of q.gaps; track $index) {
                          @if (part.gap) {
                            <span class="gap" [class.filled]="answered()">{{
                              answered() ? part.text : '_____'
                            }}</span>
                          } @else {
                            {{ part.text }}
                          }
                        }
                      </p>
                      <p class="hint">Clue: {{ q.word.d }}.</p>
                    }
                    @case ('listen') {
                      <p class="ask">Which word do you hear?</p>
                      <p>
                        <button appButton type="button" class="play" (click)="say(q.word.w)">
                          <app-icon name="volume" />
                          Play the word again
                        </button>
                      </p>
                    }
                    @case ('spell') {
                      <p class="ask">Write the word.</p>
                      <p class="definition">{{ q.word.d }}</p>
                      <form class="spell" (submit)="checkSpelling(q, $event)">
                        <div class="field">
                          <label for="spell-input">Your answer</label>
                          <input
                            id="spell-input"
                            type="text"
                            autocomplete="off"
                            autocapitalize="none"
                            spellcheck="false"
                            [value]="typed()"
                            [disabled]="answered()"
                            (input)="typed.set($any($event.target).value)"
                          />
                        </div>
                        <p class="hint">
                          <span class="visually-hidden"
                            >Hint: the first letter and one line for each other letter.
                          </span>
                          <span class="letters" aria-hidden="true">{{ hint(q.word) }}</span>
                          <span class="visually-hidden"
                            >{{ q.word.w.length }} characters, starting with
                            {{ q.word.w[0] }}.</span
                          >
                        </p>
                        @if (!answered()) {
                          <button
                            appButton
                            type="submit"
                            variant="primary"
                            [disabled]="typed().trim().length === 0"
                          >
                            Check
                          </button>
                        }
                      </form>
                    }
                  }
                  @if (q.mode !== 'spell') {
                    <div class="options" role="group" aria-label="Options">
                      @for (choice of q.choices; track choice.label; let i = $index) {
                        <button
                          type="button"
                          class="option"
                          [class.right]="answered() && choice.correct"
                          [class.wrong]="picked() === i && !choice.correct"
                          [disabled]="answered()"
                          [attr.aria-pressed]="picked() === i"
                          (click)="pick(q, i)"
                        >
                          {{ choice.label }}
                        </button>
                      }
                    </div>
                  }
                  @if (answered()) {
                    <div class="feedback" role="status">
                      @if (lastCorrect()) {
                        <p class="result right"><app-icon name="check" /> Right.</p>
                      } @else {
                        <p class="result wrong"><app-icon name="cross" /> Not quite.</p>
                      }
                      <p>
                        <strong>{{ q.word.w }}</strong
                        >: {{ q.word.d }}.
                      </p>
                      <p class="ex">{{ plain(q.word) }}</p>
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
                      @for (w of missed(); track w.id) {
                        <li>
                          <strong>{{ w.w }}</strong
                          >: {{ w.d }}
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
        }
      } @else {
        <app-empty-state
          heading="Topic not found"
          description="This topic does not exist. Choose one from the list."
          icon="info"
        >
          <a appButton routerLink="/vocabulary/basic">See all topics</a>
        </app-empty-state>
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
    h2 {
      margin-bottom: var(--space-4);
    }
    .ex {
      margin: 0;
      font-style: italic;
    }
    .option:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .more {
      margin-top: var(--space-6);
    }
    .setup {
      display: grid;
      gap: var(--space-4);
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
    .definition {
      margin: 0 0 var(--space-5);
      font-size: var(--step-2);
      font-weight: 700;
      line-height: 1.3;
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
    .letters {
      font-family: var(--font-mono);
      font-size: var(--step-1);
      white-space: pre-wrap;
      color: var(--text);
    }
    .spell {
      display: grid;
      gap: var(--space-2);
      justify-items: start;
    }
    .spell .field {
      width: min(100%, 24rem);
      margin-bottom: 0;
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
  `,
})
export class BasicTopicPage {
  /** Topic id from the route. */
  readonly topic = input.required<string>();

  protected readonly resource = inject(PracticeCatalogueService).basicVocabulary();
  private readonly store = inject(LocalStorageService);
  private readonly speech = inject(SpeechService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly canSpeak = this.speech.supported;
  protected readonly views = VIEWS;
  protected readonly modes = this.canSpeak
    ? ALL_MODES
    : ALL_MODES.filter((m) => m.value !== 'listen');
  protected readonly pools = POOLS;
  protected readonly view = signal('learn');
  protected readonly mode = signal('mixed');
  protected readonly pool = signal('all');
  protected readonly phase = signal<Phase>('setup');
  protected readonly questions = signal<Question[]>([]);
  protected readonly index = signal(0);
  protected readonly picked = signal<number | null>(null);
  protected readonly typed = signal('');
  protected readonly answered = signal(false);
  protected readonly lastCorrect = signal(false);
  protected readonly outcomes = signal<Outcome[]>([]);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.speech.cancelSpeech());
  }

  protected readonly current = computed(() =>
    this.resource.hasValue()
      ? (this.resource.value().topics.find((t) => t.id === this.topic()) ?? null)
      : null,
  );
  protected readonly icon = computed(() => (this.current()?.icon ?? 'book') as IconName);
  private readonly allWords = computed<readonly BasicWord[]>(() =>
    this.resource.hasValue() ? this.resource.value().words : [],
  );
  protected readonly words = computed(() => this.allWords().filter((w) => w.t === this.topic()));
  protected readonly groups = computed<WordGroup[]>(() => {
    const result: WordGroup[] = [];
    for (const w of this.words()) {
      const group = result.find((g) => g.name === w.g);
      if (group) group.words.push(w);
      else result.push({ name: w.g, words: [w] });
    }
    return result;
  });
  protected readonly saved = computed(() => this.store.practice().basic);
  protected readonly progress = computed(() => topicProgress(this.words(), this.saved()));
  protected readonly reviewCount = computed(() => basicToReview(this.words(), this.saved()).length);
  protected readonly modeHelp = computed(() => MODE_HELP[this.mode() as ModeChoice] ?? '');

  protected readonly poolIds = computed(() => {
    const words = this.words();
    switch (this.pool()) {
      case 'review':
        return basicToReview(words, this.saved()).map((w) => w.id);
      case 'new':
        return words.filter((w) => !isLearnt(this.saved()[w.id])).map((w) => w.id);
      default:
        return words.map((w) => w.id);
    }
  });
  protected readonly sessionSize = computed(() =>
    Math.min(BASIC_SESSION_SIZE, this.poolIds().length),
  );
  protected readonly emptyText = computed(() =>
    this.pool() === 'review'
      ? 'Nothing to review here yet. The words you get wrong appear in this list.'
      : 'You have learnt every word in this topic. Choose "All" to keep them fresh.',
  );

  protected readonly question = computed(() => this.questions()[this.index()] ?? null);
  protected readonly rightCount = computed(() => this.outcomes().filter((o) => o.correct).length);
  protected readonly missed = computed(() =>
    this.outcomes()
      .filter((o) => !o.correct)
      .map((o) => o.word),
  );

  protected plain(word: BasicWord): string {
    return plainExample(word.e);
  }

  protected hint(word: BasicWord): string {
    return spellingHint(word);
  }

  protected say(text: string): void {
    void this.speech.speakText(text);
  }

  protected start(onlyIds?: readonly string[]): void {
    const picked = selectBasic(this.words(), this.saved(), {
      onlyIds: onlyIds ?? this.poolIds(),
    });
    const chosen = this.mode() as ModeChoice;
    const order = mixedModes(this.canSpeak);
    const offset = Math.floor(Math.random() * order.length);
    this.questions.set(
      picked.map((word, i) => {
        const mode = chosen === 'mixed' ? order[(i + offset) % order.length] : chosen;
        return {
          key: `${i}-${word.id}-${mode}`,
          word,
          mode,
          choices: mode === 'spell' ? [] : basicChoices(word, mode, this.allWords()),
          gaps: mode === 'gap' ? gapForWord(word) : [],
        };
      }),
    );
    this.index.set(0);
    this.outcomes.set([]);
    this.phase.set(picked.length > 0 ? 'running' : 'setup');
    this.prepare();
  }

  protected practiseMissed(): void {
    this.start(this.missed().map((w) => w.id));
  }

  protected pick(question: Question, choiceIndex: number): void {
    if (this.answered()) return;
    this.picked.set(choiceIndex);
    this.record(question, question.choices[choiceIndex].correct);
  }

  protected checkSpelling(question: Question, event: Event): void {
    event.preventDefault();
    if (this.answered() || this.typed().trim().length === 0) return;
    this.record(question, spellingIsRight(this.typed(), question.word));
  }

  protected advance(): void {
    if (this.index() + 1 >= this.questions().length) {
      this.finish();
      return;
    }
    this.index.update((i) => i + 1);
    this.prepare();
  }

  protected finish(): void {
    this.speech.cancelSpeech();
    this.phase.set('done');
    this.focus('h2');
  }

  private record(question: Question, correct: boolean): void {
    this.answered.set(true);
    this.lastCorrect.set(correct);
    this.store.recordBasicResult(question.word.id, correct);
    this.outcomes.update((list) => [...list, { word: question.word, correct }]);
    this.focus('.next');
  }

  /** Clears the answer of the new question, plays it when it is a listening one, and moves focus. */
  private prepare(): void {
    this.picked.set(null);
    this.typed.set('');
    this.answered.set(false);
    const q = this.question();
    if (!q) return;
    if (q.mode === 'listen') this.say(q.word.w);
    this.focus(q.mode === 'spell' ? '#spell-input' : '.option');
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
