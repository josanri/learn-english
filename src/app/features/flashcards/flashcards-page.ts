import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpeechService } from '../../core/speech.service';
import { LocalStorageService } from '../../core/storage.service';
import { PracticeCatalogueService } from '../../data/practice-catalogue.service';
import type { Flashcard } from '../../models/practice';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  SegmentedControl,
  type SegmentOption,
} from '../../shared/ui';
import { dictionaryUrl } from '../vocabulary/vocabulary-engine';
import {
  GRADES,
  NEW_PER_DAY_OPTIONS,
  buildQueue,
  deckStats,
  formatDelay,
  highlightWord,
  nextCard,
  previewDelays,
  schedule,
  type Grade,
} from './srs';

const GRADE_LABELS: Record<Grade, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

const GRADE_HELP: Record<Grade, string> = {
  again: 'I did not know it',
  hard: 'I knew it, but it was difficult',
  good: 'I knew it',
  easy: 'Too easy',
};

const PER_DAY: SegmentOption[] = NEW_PER_DAY_OPTIONS.map((n) => ({
  value: String(n),
  label: String(n),
}));

/** How often the page checks for learning cards that have become due. */
const TICK_MS = 15_000;

/** `/vocabulary/flashcards`: daily vocabulary review with spaced repetition. */
@Component({
  selector: 'app-flashcards-page',
  imports: [RouterLink, Button, Card, Chip, EmptyState, Icon, SegmentedControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="container page">
      <p class="eyebrow"><a routerLink="/vocabulary/b1">Words</a> &middot; Flashcards</p>
      <h1>Flashcards</h1>
      <p class="lede">
        A few minutes a day. Each card comes back just before you are likely to forget it: soon when
        a word is new or difficult, and after days, weeks and months once you know it.
      </p>

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the cards&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The cards could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else {
        <ul class="stats" aria-label="Today">
          <li>
            <app-chip [prompt]="false">{{ dueCount() }} to review</app-chip>
          </li>
          <li>
            <app-chip [prompt]="false">{{ queue().fresh.length }} new left today</app-chip>
          </li>
          <li>
            <app-chip [prompt]="false">{{ stats().young + stats().mature }} learnt</app-chip>
          </li>
          <li>
            <app-chip [prompt]="false"
              >{{ stats().unseen }} of {{ cards().length }} unseen</app-chip
            >
          </li>
        </ul>

        <section class="study" aria-label="Study">
          @if (current(); as card) {
            <article class="flash" [class.open]="revealed()" aria-live="polite">
              <p class="meta">
                <span>{{ card.p }}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{{ topicName(card.t) }}</span>
                @if (isNew(card)) {
                  <span class="tag">New</span>
                }
              </p>
              <h2 class="word" tabindex="-1">{{ card.w }}</h2>
              @if (revealed()) {
                <p class="definition">{{ card.d }}</p>
                <p class="example">
                  @if (highlight(card); as h) {
                    {{ h.before }}<strong>{{ h.match }}</strong
                    >{{ h.after }}
                  } @else {
                    {{ card.e }}
                  }
                </p>
                <div class="tools">
                  @if (speech.supported) {
                    <button appButton type="button" variant="ghost" size="sm" (click)="speak(card)">
                      <app-icon name="volume" />
                      Listen
                    </button>
                  }
                  <a
                    appButton
                    variant="ghost"
                    size="sm"
                    [href]="dictionary(card)"
                    target="_blank"
                    rel="noopener"
                  >
                    Cambridge Dictionary
                    <span class="visually-hidden">(opens in a new tab)</span>
                  </a>
                </div>
              } @else {
                <p class="hint">Say what it means, or use it in a sentence. Then check.</p>
              }
            </article>

            @if (revealed()) {
              <div class="grades" role="group" aria-label="How well did you know it?">
                @for (grade of grades; track grade; let i = $index) {
                  <button
                    appButton
                    type="button"
                    [variant]="grade === 'good' ? 'primary' : 'secondary'"
                    [attr.aria-label]="
                      gradeLabel(grade) + ': ' + gradeHelp(grade) + '. Next in ' + delays()[grade]
                    "
                    (click)="answer(card, grade)"
                  >
                    <span class="grade">{{ gradeLabel(grade) }}</span>
                    <span class="delay">{{ delays()[grade] }}</span>
                    <kbd aria-hidden="true">{{ i + 1 }}</kbd>
                  </button>
                }
              </div>
            } @else {
              <div class="reveal">
                <button appButton type="button" variant="primary" size="lg" (click)="reveal()">
                  Show the answer
                  <kbd aria-hidden="true">Space</kbd>
                </button>
              </div>
            }
            <p class="keys muted">
              Keys: Space shows the answer, 1 to 4 choose how well you knew it.
            </p>
          } @else {
            <app-card [raised]="true" class="done">
              <h2 tabindex="-1">Done for now</h2>
              @if (answered() > 0) {
                <p>
                  You answered {{ answered() }} {{ answered() === 1 ? 'card' : 'cards' }} in this
                  session.
                </p>
              }
              <p>{{ nextText() }}</p>
              <div class="actions">
                @if (stats().unseen > 0) {
                  <button appButton type="button" variant="primary" (click)="studyMore()">
                    Learn {{ extraStep() }} more new words
                  </button>
                }
                <a appButton routerLink="/vocabulary/phrasal-verbs">Practise phrasal verbs</a>
                <a appButton routerLink="/reader">Read a story</a>
              </div>
            </app-card>
          }
        </section>

        <details class="settings">
          <summary>Card settings</summary>
          <div class="settings-body">
            <app-segmented-control
              label="New words a day"
              [options]="perDay"
              [value]="perDayValue()"
              (valueChange)="setPerDay($event)"
            />
            <div class="field">
              <label for="card-topic">New words from</label>
              <select
                id="card-topic"
                [value]="topic() ?? 'all'"
                (change)="setTopic($any($event.target).value)"
              >
                <option value="all">All topics</option>
                @for (t of topics(); track t.id) {
                  <option [value]="t.id">{{ t.name }} ({{ countIn(t.id) }})</option>
                }
              </select>
              <p class="hint">Cards you have already started keep coming back from every topic.</p>
            </div>
            <div class="reset">
              @if (confirmReset()) {
                <p role="alert">This forgets the schedule of every card. Continue?</p>
                <button appButton type="button" variant="danger" (click)="reset()">
                  Yes, start again
                </button>
                <button appButton type="button" variant="ghost" (click)="confirmReset.set(false)">
                  Cancel
                </button>
              } @else {
                <button appButton type="button" variant="ghost" (click)="confirmReset.set(true)">
                  <app-icon name="refresh" />
                  Reset all cards
                </button>
              }
            </div>
          </div>
        </details>
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
    .study {
      display: grid;
      gap: var(--space-5);
      max-width: 40rem;
      margin-top: var(--space-6);
    }
    .flash {
      display: grid;
      align-content: center;
      gap: var(--space-3);
      min-height: 16rem;
      padding: var(--space-6) var(--space-5);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--paper-cream);
      color: var(--paper-ink);
      box-shadow: 6px 6px 0 var(--shadow-solid);
      text-align: center;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
      margin: 0;
      font-family: var(--font-mono);
      font-size: var(--step--1);
      color: var(--paper-ink-muted);
    }
    .tag {
      padding: 0 var(--space-2);
      border: var(--bw) solid var(--paper-ink);
      border-radius: var(--radius-pill);
      background: var(--paper-green);
      color: var(--paper-ink);
    }
    .word {
      margin: 0;
      font-size: var(--step-4);
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 1;
      overflow-wrap: anywhere;
    }
    .word:focus {
      outline: none;
    }
    .definition {
      margin: var(--space-2) 0 0;
      font-size: var(--step-1);
      font-weight: 700;
    }
    .example {
      margin: 0;
      font-size: var(--step-0);
      font-style: italic;
    }
    .example strong {
      font-style: normal;
      background: var(--paper-blue);
      padding-inline: 0.15em;
      border-radius: var(--radius-sm);
    }
    .hint {
      margin: 0;
      color: var(--paper-ink-muted);
    }
    .tools {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
    }
    .tools [appButton] {
      color: var(--paper-ink);
    }
    .reveal {
      display: flex;
      justify-content: center;
    }
    .grades {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--space-3);
    }
    @media (max-width: 30rem) {
      .grades {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .grades [appButton] {
      position: relative;
      flex-direction: column;
      gap: 0;
      min-height: 4rem;
    }
    .grade {
      font-weight: 800;
    }
    .delay {
      font-family: var(--font-mono);
      font-size: var(--step--1);
      font-weight: 500;
    }
    kbd {
      margin-inline-start: var(--space-2);
      padding: 0 var(--space-1);
      border: var(--bw) solid currentColor;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--step--1);
      opacity: 0.7;
    }
    .grades kbd {
      position: absolute;
      top: var(--space-1);
      right: var(--space-1);
      margin: 0;
    }
    @media (pointer: coarse) {
      kbd,
      .keys {
        display: none;
      }
    }
    .keys {
      margin: 0;
      font-size: var(--step--1);
    }
    .done h2 {
      margin-bottom: var(--space-3);
    }
    .done h2:focus {
      outline: none;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-top: var(--space-4);
    }
    .settings {
      max-width: 40rem;
      margin-top: var(--space-7);
      padding: var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .settings summary {
      min-height: var(--target);
      display: flex;
      align-items: center;
      font-weight: 700;
      cursor: pointer;
    }
    .settings-body {
      display: grid;
      gap: var(--space-5);
      margin-top: var(--space-4);
    }
    .settings .field {
      margin-bottom: 0;
    }
    .reset {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }
    .reset p {
      flex-basis: 100%;
      margin: 0;
    }
  `,
})
export class FlashcardsPage {
  protected readonly resource = inject(PracticeCatalogueService).flashcards();
  private readonly store = inject(LocalStorageService);
  protected readonly speech = inject(SpeechService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly grades = GRADES;
  protected readonly perDay = PER_DAY;
  protected readonly now = signal(new Date());
  protected readonly revealed = signal(false);
  /** Cards answered in this visit (mixes one new card after three reviews). */
  protected readonly answered = signal(0);
  /** New cards added on top of the daily number with "Learn more". */
  private readonly extraNew = signal(0);
  protected readonly extraStep = signal(5);
  protected readonly topic = signal<string | null>(null);
  protected readonly confirmReset = signal(false);

  protected readonly cards = computed<readonly Flashcard[]>(() =>
    this.resource.hasValue() ? this.resource.value().cards : [],
  );
  protected readonly topics = computed(() =>
    this.resource.hasValue() ? this.resource.value().topics : [],
  );
  private readonly states = computed(() => this.store.practice().cards);
  protected readonly perDayValue = computed(() => String(this.store.practice().newPerDay));

  protected readonly queue = computed(() =>
    buildQueue(this.cards(), this.states(), this.now(), {
      newPerDay: this.store.practice().newPerDay + this.extraNew(),
      topic: this.topic(),
    }),
  );
  protected readonly current = computed(() => nextCard(this.queue(), this.now(), this.answered()));
  protected readonly stats = computed(() => deckStats(this.cards(), this.states(), this.now()));
  protected readonly dueCount = computed(
    () => this.queue().learning.length + this.queue().reviews.length,
  );
  protected readonly delays = computed(() => {
    const card = this.current();
    const raw = previewDelays(card ? this.states()[card.id] : undefined, this.now());
    return Object.fromEntries(GRADES.map((g) => [g, formatDelay(raw[g])])) as Record<Grade, string>;
  });

  protected readonly nextText = computed(() => {
    const waiting = this.queue().waiting[0];
    if (waiting) {
      const minutes = Math.max(
        1,
        Math.round((waiting.due.getTime() - this.now().getTime()) / 60_000),
      );
      return `A card you are learning comes back in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. Stay on this page or come back later.`;
    }
    const tomorrow = this.stats().dueTomorrow;
    if (tomorrow > 0) {
      return `Come back tomorrow: ${tomorrow} ${tomorrow === 1 ? 'card is' : 'cards are'} waiting for you.`;
    }
    if (this.stats().unseen === 0)
      return 'You have studied every card. Reviews will come back on their own.';
    return 'Come back tomorrow for new words.';
  });

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), TICK_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.speech.cancelSpeech();
    });
  }

  protected topicName(id: string): string {
    return this.topics().find((t) => t.id === id)?.name ?? id;
  }

  protected countIn(topicId: string): number {
    return this.cards().filter((c) => c.t === topicId).length;
  }

  protected isNew(card: Flashcard): boolean {
    return this.states()[card.id] === undefined;
  }

  protected highlight(card: Flashcard) {
    return highlightWord(card.e, card.w);
  }

  protected dictionary(card: Flashcard): string {
    return dictionaryUrl(card.w);
  }

  protected gradeLabel(grade: Grade): string {
    return GRADE_LABELS[grade];
  }

  protected gradeHelp(grade: Grade): string {
    return GRADE_HELP[grade];
  }

  protected speak(card: Flashcard): void {
    void this.speech.speakText(`${card.w}. ${card.e}`);
  }

  protected reveal(): void {
    this.revealed.set(true);
    this.focus('.grades button:nth-child(3)');
  }

  protected answer(card: Flashcard, grade: Grade): void {
    const now = new Date();
    this.store.saveCard(card.id, schedule(this.states()[card.id], grade, now));
    this.answered.update((n) => n + 1);
    this.revealed.set(false);
    this.now.set(now);
    this.speech.cancelSpeech();
    this.focus(this.current() ? '.reveal button' : '.done h2');
  }

  protected studyMore(): void {
    this.extraNew.update((n) => n + this.extraStep());
    this.now.set(new Date());
    this.focus('.reveal button');
  }

  protected setPerDay(value: string): void {
    this.store.setNewCardsPerDay(Number(value));
  }

  protected setTopic(value: string): void {
    this.topic.set(value === 'all' ? null : value);
  }

  protected reset(): void {
    this.store.resetCards();
    this.confirmReset.set(false);
    this.extraNew.set(0);
    this.revealed.set(false);
    this.now.set(new Date());
  }

  /** Space or Enter shows the answer; 1 to 4 grade it. Ignored while typing or in the settings. */
  protected onKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, select, textarea, .settings')) return;
    const card = this.current();
    if (!card) return;
    if (!this.revealed() && (event.key === ' ' || event.key === 'Enter')) {
      if (target?.closest('button, a')) return; // a focused control handles its own activation
      event.preventDefault();
      this.reveal();
      return;
    }
    const index = ['1', '2', '3', '4'].indexOf(event.key);
    if (this.revealed() && index >= 0) {
      event.preventDefault();
      this.answer(card, GRADES[index]);
    }
  }

  private focus(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
