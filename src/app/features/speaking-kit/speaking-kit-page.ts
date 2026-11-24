import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpeechService } from '../../core/speech.service';
import { LocalStorageService } from '../../core/storage.service';
import { PracticeCatalogueService } from '../../data/practice-catalogue.service';
import type { SpeakingQuestion } from '../../models/practice';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  ProgressBar,
  SegmentedControl,
  type SegmentOption,
} from '../../shared/ui';

const VIEWS: SegmentOption[] = [
  { value: 'questions', label: 'Questions' },
  { value: 'phrases', label: 'Phrases' },
  { value: 'checklist', label: 'Checklist' },
];

interface PoolQuestion extends SpeakingQuestion {
  topicName: string;
}

/**
 * `/practice/speaking`: the four-step answer, useful phrases, speaking questions with model
 * answers, and a checklist of what to be able to talk about before the exam.
 */
@Component({
  selector: 'app-speaking-kit-page',
  imports: [RouterLink, Button, Card, EmptyState, Icon, ProgressBar, SegmentedControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">Practice &middot; Speaking</p>
      <h1>Speaking kit</h1>
      <p class="lede">
        Answer common speaking questions out loud, with a simple four-step plan and phrases that
        give you time to think. The model answers are examples, not the only right answer.
      </p>

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the speaking kit&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The speaking kit could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else if (kit(); as data) {
        <section class="formula" aria-labelledby="formula-title">
          <h2 id="formula-title">Answer in four steps</h2>
          <ol class="steps">
            @for (step of data.steps; track step.title; let i = $index) {
              <li>
                <span class="num" aria-hidden="true">{{ i + 1 }}</span>
                <div>
                  <p class="step-title">{{ step.title }}</p>
                  <p class="muted">{{ step.hint }}</p>
                  <p class="starters">
                    @for (s of step.starters; track s) {
                      <span>{{ s }}</span>
                    }
                  </p>
                </div>
              </li>
            }
          </ol>
          <details class="example">
            <summary>See an example: {{ data.example.question }}</summary>
            <p>{{ data.example.answer }}</p>
          </details>
        </section>

        <div class="view">
          <app-segmented-control label="Section" [options]="views" [(value)]="view" />
        </div>

        @switch (view()) {
          @case ('questions') {
            <div class="field topic-field">
              <label for="sk-topic">Topic</label>
              <select
                id="sk-topic"
                [value]="topicId()"
                (change)="chooseTopic($any($event.target).value)"
              >
                <option value="all">All topics</option>
                @for (t of data.topics; track t.id) {
                  <option [value]="t.id">{{ t.name }} ({{ t.questions.length }})</option>
                }
              </select>
            </div>
            @if (question(); as q) {
              <app-card [raised]="true">
                <p class="count">{{ q.topicName }}</p>
                <p class="question" aria-live="polite">{{ q.q }}</p>
                <p class="muted">
                  Answer out loud before you look at the model. Try to speak for about 30 seconds.
                </p>
                <div class="actions">
                  @if (canSpeak) {
                    <button appButton type="button" (click)="say(q.q)">
                      <app-icon name="volume" />
                      Listen to the question
                    </button>
                  }
                  <button appButton type="button" (click)="showModel.set(!showModel())">
                    {{ showModel() ? 'Hide the model answer' : 'Show a model answer' }}
                  </button>
                  <button appButton type="button" variant="primary" (click)="next()">
                    Next question
                    <app-icon name="arrow" />
                  </button>
                </div>
                @if (showModel()) {
                  <div class="model">
                    <p>{{ q.model }}</p>
                    @if (canSpeak) {
                      <button
                        appButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        (click)="say(q.model)"
                      >
                        <app-icon name="volume" />
                        Listen to the model
                      </button>
                    }
                  </div>
                }
              </app-card>
            }
            <details class="all">
              <summary>See all {{ pool().length }} questions</summary>
              <ul>
                @for (item of pool(); track item.id) {
                  <li>{{ item.q }}</li>
                }
              </ul>
            </details>
          }
          @case ('phrases') {
            <div class="groups">
              @for (group of data.phraseGroups; track group.id) {
                <section class="group" [attr.aria-labelledby]="'pg-' + group.id">
                  <h2 [id]="'pg-' + group.id">{{ group.name }}</h2>
                  <p class="muted">{{ group.intro }}</p>
                  <ul>
                    @for (p of group.phrases; track p.text) {
                      <li>
                        <div>
                          <p class="phrase">{{ p.text }}</p>
                          <p class="use">{{ p.use }}</p>
                        </div>
                        @if (canSpeak) {
                          <button
                            type="button"
                            class="say"
                            [attr.aria-label]="'Listen to: ' + p.text"
                            (click)="say(p.text)"
                          >
                            <app-icon name="volume" />
                          </button>
                        }
                      </li>
                    }
                  </ul>
                </section>
              }
            </div>
          }
          @case ('checklist') {
            <section aria-labelledby="cl-title">
              <h2 id="cl-title">Before the exam, can you&hellip;</h2>
              <p class="count" role="status">
                {{ doneCount() }} of {{ data.checklist.length }} ready
              </p>
              <app-progress-bar
                [value]="data.checklist.length ? doneCount() / data.checklist.length : 0"
                label="Checklist progress"
              />
              <ul class="checklist">
                @for (item of data.checklist; track item.id) {
                  <li>
                    <label>
                      <input
                        type="checkbox"
                        [checked]="isDone(item.id)"
                        (change)="toggle(item.id, $any($event.target).checked)"
                      />
                      <span>{{ item.text }}</span>
                    </label>
                    @if (item.link) {
                      <a class="practise" [routerLink]="item.link">
                        Practise <span class="visually-hidden">: {{ item.text }}</span>
                      </a>
                    }
                  </li>
                }
              </ul>
              @if (doneCount() > 0) {
                <p>
                  <button appButton type="button" variant="ghost" size="sm" (click)="reset()">
                    Clear the checklist
                  </button>
                </p>
              }
            </section>
          }
        }
        <p class="more">
          <a appButton variant="secondary" routerLink="/vocabulary/basic">
            Learn the basic vocabulary
            <app-icon name="arrow" />
          </a>
        </p>
      }
    </div>
  `,
  styles: `
    .formula {
      margin-top: var(--space-5);
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .steps li {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .steps p {
      margin: 0;
    }
    .num {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: var(--accent);
      color: var(--on-accent);
      font-weight: 800;
    }
    .step-title {
      font-weight: 800;
    }
    .starters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin-top: var(--space-2) !important;
    }
    .starters span {
      padding: 0 var(--space-2);
      border-radius: var(--radius);
      background: var(--surface-2);
      font-size: var(--step--1);
    }
    details {
      margin-top: var(--space-4);
    }
    summary {
      padding-block: var(--space-2);
      cursor: pointer;
      font-weight: 700;
    }
    summary:focus-visible,
    .say:focus-visible,
    .checklist input:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .example p {
      max-width: 44rem;
      font-style: italic;
    }
    .view {
      margin-block: var(--space-6) var(--space-5);
    }
    .topic-field {
      max-width: 24rem;
    }
    .count {
      margin: 0 0 var(--space-2);
      font-family: var(--font-mono);
      font-size: var(--step--1);
      color: var(--text-muted);
    }
    .question {
      margin: 0 0 var(--space-3);
      font-size: var(--step-3);
      font-weight: 850;
      line-height: 1.2;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .model {
      display: grid;
      justify-items: start;
      gap: var(--space-2);
      margin-top: var(--space-4);
      padding: var(--space-3) var(--space-4);
      border-left: var(--bw-card) solid var(--accent);
      background: var(--surface-2);
    }
    .model p {
      margin: 0;
      max-width: 44rem;
    }
    .all ul {
      display: grid;
      gap: var(--space-1);
      padding-inline-start: var(--space-5);
    }
    .groups {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
      gap: var(--space-5);
    }
    .group h2 {
      margin-bottom: var(--space-1);
    }
    .group ul {
      display: grid;
      gap: var(--space-2);
      margin: var(--space-3) 0 0;
      padding: 0;
      list-style: none;
    }
    .group li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .group li p {
      margin: 0;
    }
    .phrase {
      font-weight: 700;
    }
    .use {
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .say {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: var(--target);
      height: var(--target);
      padding: 0;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
    }
    .say:hover {
      background: var(--surface-2);
    }
    .checklist {
      display: grid;
      gap: var(--space-2);
      max-width: 44rem;
      margin: var(--space-4) 0;
      padding: 0;
      list-style: none;
    }
    .checklist li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .checklist label {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: var(--target);
      cursor: pointer;
    }
    .checklist input {
      width: 1.5rem;
      height: 1.5rem;
      accent-color: var(--accent);
    }
    .practise {
      display: inline-flex;
      align-items: center;
      min-height: var(--target);
      padding-inline: var(--space-2);
    }
    .more {
      margin-top: var(--space-7);
    }
  `,
})
export class SpeakingKitPage {
  protected readonly resource = inject(PracticeCatalogueService).speakingKit();
  private readonly store = inject(LocalStorageService);
  private readonly speech = inject(SpeechService);

  protected readonly canSpeak = this.speech.supported;
  protected readonly views = VIEWS;
  protected readonly view = signal('questions');
  protected readonly topicId = signal('all');
  protected readonly showModel = signal(false);
  /** Position in the shuffled order of the current pool. */
  private readonly position = signal(0);
  private readonly order = signal<number[]>([]);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.speech.cancelSpeech());
    // A new random order each time the pool changes (first load, another topic).
    effect(() => {
      this.pool();
      untracked(() => this.reshuffle());
    });
  }

  protected readonly kit = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  protected readonly pool = computed<PoolQuestion[]>(() => {
    const data = this.kit();
    if (!data) return [];
    const id = this.topicId();
    return data.topics
      .filter((t) => id === 'all' || t.id === id)
      .flatMap((t) => t.questions.map((q) => ({ ...q, topicName: t.name })));
  });

  protected readonly question = computed<PoolQuestion | null>(() => {
    const pool = this.pool();
    if (pool.length === 0) return null;
    const order = this.order();
    const index = order.length === pool.length ? order[this.position() % pool.length] : 0;
    return pool[index] ?? pool[0];
  });

  protected readonly doneCount = computed(() => {
    const ids = new Set(this.kit()?.checklist.map((c) => c.id) ?? []);
    return this.store.practice().checklist.filter((id) => ids.has(id)).length;
  });

  protected chooseTopic(id: string): void {
    this.topicId.set(id);
    this.speech.cancelSpeech();
  }

  protected next(): void {
    if (this.position() + 1 >= this.pool().length) this.reshuffle(this.question()?.id);
    else this.position.update((p) => p + 1);
    this.showModel.set(false);
    this.speech.cancelSpeech();
  }

  protected say(text: string): void {
    void this.speech.speakText(text);
  }

  protected isDone(id: string): boolean {
    return this.store.practice().checklist.includes(id);
  }

  protected toggle(id: string, done: boolean): void {
    this.store.setChecklistItem(id, done);
  }

  protected reset(): void {
    this.store.resetChecklist();
  }

  /** New random order of the pool; the question just seen does not come first again. */
  private reshuffle(avoidId?: string): void {
    const pool = this.pool();
    const order = pool.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (avoidId && order.length > 1 && pool[order[0]].id === avoidId) order.push(order.shift()!);
    this.order.set(order);
    this.position.set(0);
    this.showModel.set(false);
  }
}
