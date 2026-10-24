import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpeechService } from '../../core/speech.service';
import { LocalStorageService } from '../../core/storage.service';
import { PracticeCatalogueService } from '../../data/practice-catalogue.service';
import type { Story } from '../../models/practice';
import { Button, Chip, EmptyState, Icon } from '../../shared/ui';
import { parseParagraph, plainParagraph, readingMinutes, type StoryPart } from './reader-engine';

/** `/reader/:story`: one story with tap-to-see glossary, read-aloud and comprehension questions. */
@Component({
  selector: 'app-story-page',
  imports: [RouterLink, Button, Chip, EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow"><a routerLink="/reader">Graded reader</a> &middot; Story</p>

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading the story&hellip;</p>
      } @else if (resource.error() || !data()) {
        <app-empty-state
          heading="This story could not be loaded"
          description="It may not exist, or you may be offline."
          icon="alert"
        >
          <a appButton routerLink="/reader">See all stories</a>
        </app-empty-state>
      } @else if (data(); as s) {
        <div class="panes">
          <article class="story" [attr.aria-labelledby]="'story-title'">
            <h1 id="story-title">{{ s.title }}</h1>
            <ul class="facts" aria-label="About this story">
              <li>
                <app-chip [prompt]="false">{{ s.level }}</app-chip>
              </li>
              <li>
                <app-chip [prompt]="false">{{ minutes() }} min</app-chip>
              </li>
              <li>
                <app-chip [prompt]="false">{{ s.words }} words</app-chip>
              </li>
              <li>
                <app-chip [prompt]="false">{{ s.topic }}</app-chip>
              </li>
            </ul>

            <div class="tools">
              @if (speech.supported) {
                @if (speaking()) {
                  <button appButton type="button" (click)="stop()">
                    <app-icon name="stop" />
                    Stop
                  </button>
                } @else {
                  <button appButton type="button" (click)="listen(s)">
                    <app-icon name="volume" />
                    Listen to the story
                  </button>
                }
              }
              <p class="hint">Underlined words open their meaning.</p>
            </div>

            <div class="text">
              @for (paragraph of paragraphs(); track $index; let p = $index) {
                <p [class.reading]="speakingParagraph() === p">
                  @for (part of paragraph; track $index; let i = $index) {
                    @if (part.kind === 'gloss') {
                      <button
                        type="button"
                        class="gloss"
                        [attr.aria-expanded]="open() === p + '-' + i"
                        [attr.aria-controls]="'gloss-' + p + '-' + i"
                        (click)="toggle(p + '-' + i)"
                      >
                        {{ part.text }}
                      </button>
                    } @else {
                      {{ part.text }}
                    }
                  }
                </p>
                @if (openGloss(s, p, paragraph); as gloss) {
                  <p class="note" role="note" [id]="'gloss-' + gloss.id">
                    <strong>{{ gloss.word }}</strong>
                    {{ gloss.meaning }}
                    <button
                      type="button"
                      class="note-close"
                      aria-label="Close the meaning"
                      (click)="open.set(null)"
                    >
                      <app-icon name="close" [size]="16" />
                    </button>
                  </p>
                }
              }
            </div>

            <details class="words">
              <summary>Words in this story ({{ glossary().length }})</summary>
              <dl>
                @for (entry of glossary(); track entry.word) {
                  <div>
                    <dt>{{ entry.word }}</dt>
                    <dd>{{ entry.meaning }}</dd>
                  </div>
                }
              </dl>
            </details>
          </article>

          <section class="questions" aria-labelledby="questions-title">
            <h2 id="questions-title">Check your understanding</h2>
            <ol>
              @for (q of s.questions; track $index; let qi = $index) {
                <li class="question">
                  <p class="ask">{{ q.question }}</p>
                  <div
                    class="options"
                    role="group"
                    [attr.aria-label]="'Options for question ' + (qi + 1)"
                  >
                    @for (option of q.options; track $index; let oi = $index) {
                      <button
                        type="button"
                        class="option"
                        [class.right]="answers()[qi] !== undefined && oi === q.answer"
                        [class.wrong]="answers()[qi] === oi && oi !== q.answer"
                        [disabled]="answers()[qi] !== undefined"
                        [attr.aria-pressed]="answers()[qi] === oi"
                        (click)="answer(s, qi, oi)"
                      >
                        {{ option }}
                      </button>
                    }
                  </div>
                  @if (answers()[qi] !== undefined) {
                    <p class="explain" role="status">
                      @if (answers()[qi] === q.answer) {
                        <strong class="ok">Right.</strong>
                      } @else {
                        <strong class="no">Not quite.</strong>
                      }
                      {{ q.explanation }}
                    </p>
                  }
                </li>
              }
            </ol>

            @if (complete()) {
              <div class="summary" role="status">
                <p class="score">{{ correct() }} of {{ s.questions.length }} right.</p>
                <div class="actions">
                  @if (nextStory(); as next) {
                    <a appButton variant="primary" [routerLink]="['/reader', next.id]">
                      Next story: {{ next.title }}
                      <app-icon name="arrow" />
                    </a>
                  }
                  <button appButton type="button" (click)="retry()">Answer again</button>
                  <a appButton variant="ghost" routerLink="/reader">All stories</a>
                </div>
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    .eyebrow a {
      color: inherit;
    }
    .story,
    .questions {
      max-width: 42rem;
    }
    h1 {
      text-wrap: balance;
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: var(--space-4) 0 0;
      padding: 0;
      list-style: none;
    }
    .tools {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3) var(--space-4);
      margin-block: var(--space-5);
    }
    .hint {
      margin: 0;
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .text {
      padding: var(--space-5);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--paper-cream);
      color: var(--paper-ink);
      box-shadow: 6px 6px 0 var(--shadow-solid);
    }
    .text p {
      margin: 0 0 var(--space-4);
      font-size: var(--step-1);
      line-height: 1.75;
      border-radius: var(--radius-sm);
      transition: background-color var(--dur);
    }
    .text p:last-child {
      margin-bottom: 0;
    }
    .text p.reading {
      background: var(--paper-white);
      box-shadow: 0 0 0 var(--space-1) var(--paper-white);
    }
    .gloss {
      display: inline;
      min-height: 0;
      padding: 0;
      border: 0;
      border-bottom: var(--bw) dotted var(--paper-ink);
      background: none;
      color: inherit;
      font: inherit;
      line-height: inherit;
      cursor: pointer;
    }
    .gloss[aria-expanded='true'] {
      border-bottom-style: solid;
      background: var(--paper-blue);
    }
    .gloss:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    /* The meaning opens as its own block under the paragraph, so it never splits across lines. */
    .text p.note {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      margin: calc(-1 * var(--space-2)) 0 var(--space-4);
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
      border: var(--bw) solid var(--paper-ink);
      border-left-width: 6px;
      border-radius: var(--radius-sm);
      background: var(--paper-white);
      color: var(--paper-ink);
      font-size: var(--step-0);
      line-height: 1.5;
    }
    .note strong {
      font-style: normal;
    }
    .note-close {
      display: grid;
      flex: none;
      place-items: center;
      width: var(--target);
      height: var(--target);
      margin: calc(-1 * var(--space-1)) 0 calc(-1 * var(--space-1)) auto;
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      color: inherit;
      cursor: pointer;
    }
    .note-close:hover {
      background: var(--paper-blue);
    }
    .note-close:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    .words {
      margin-top: var(--space-6);
      padding: var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .words summary {
      display: flex;
      align-items: center;
      min-height: var(--target);
      font-weight: 700;
      cursor: pointer;
    }
    dl {
      display: grid;
      gap: var(--space-3);
      margin: var(--space-3) 0 0;
    }
    dt {
      font-weight: 800;
    }
    dd {
      margin: 0;
      color: var(--text-muted);
    }
    .questions {
      margin-top: var(--space-8);
    }
    .questions ol {
      display: grid;
      gap: var(--space-6);
      margin: var(--space-4) 0 0;
      padding-inline-start: var(--space-5);
    }
    .ask {
      margin: 0 0 var(--space-3);
      font-size: var(--step-1);
      font-weight: 700;
    }
    .options {
      display: grid;
      gap: var(--space-2);
    }
    .option {
      min-height: var(--target);
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font: inherit;
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
    .explain {
      margin: var(--space-3) 0 0;
    }
    .ok {
      color: var(--success);
    }
    .no {
      color: var(--danger);
    }
    .summary {
      margin-top: var(--space-6);
      padding: var(--space-5);
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      box-shadow: 6px 6px 0 var(--shadow-solid);
    }
    .score {
      margin: 0 0 var(--space-4);
      font-size: var(--step-2);
      font-weight: 800;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    /*
     * Half-folded phone (FoldPosture sets data-fold on <html>): the story on one side of the fold and
     * the questions on the other, each scrolling on its own. "book" is side by side, "laptop" stacked.
     */
    :host-context(html[data-fold]) .panes {
      display: grid;
      gap: var(--space-6);
      height: calc(100dvh - var(--header-height) - 7rem);
    }
    :host-context(html[data-fold='book']) .panes {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    :host-context(html[data-fold='laptop']) .panes {
      grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    }
    :host-context(html[data-fold]) .story,
    :host-context(html[data-fold]) .questions {
      min-height: 0;
      max-width: none;
      margin-top: 0;
      padding: var(--space-1) var(--space-3) var(--space-3) var(--space-1);
      overflow-y: auto;
      overscroll-behavior: contain;
    }
  `,
})
export class StoryPage {
  /** Story id from the route. */
  readonly story = input.required<string>();

  private readonly catalogue = inject(PracticeCatalogueService);
  private readonly store = inject(LocalStorageService);
  protected readonly speech = inject(SpeechService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly resource = this.catalogue.story(() => this.story());
  private readonly index = this.catalogue.storyIndex();

  protected readonly data = computed<Story | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );
  protected readonly paragraphs = computed<StoryPart[][]>(() =>
    (this.data()?.paragraphs ?? []).map(parseParagraph),
  );
  protected readonly minutes = computed(() => readingMinutes(this.data()?.words ?? 0));
  /** Glossed words in the order they appear, with their meaning. */
  protected readonly glossary = computed(() => {
    const story = this.data();
    if (!story) return [];
    const seen = new Set<string>();
    const list: { word: string; meaning: string }[] = [];
    for (const paragraph of this.paragraphs()) {
      for (const part of paragraph) {
        if (part.kind !== 'gloss' || seen.has(part.key)) continue;
        seen.add(part.key);
        list.push({ word: part.key, meaning: story.glossary[part.key]?.meaning ?? '' });
      }
    }
    return list;
  });

  /** `paragraph-part` of the open gloss. */
  protected readonly open = signal<string | null>(null);
  protected readonly answers = signal<Record<number, number>>({});
  protected readonly speaking = signal(false);
  protected readonly speakingParagraph = signal<number | null>(null);
  private listenRun = 0;

  protected readonly complete = computed(() => {
    const total = this.data()?.questions.length ?? 0;
    return total > 0 && Object.keys(this.answers()).length === total;
  });
  protected readonly correct = computed(() => {
    const story = this.data();
    if (!story) return 0;
    return story.questions.filter((q, i) => this.answers()[i] === q.answer).length;
  });
  /** The next story in the list that has not been read yet (or simply the next one). */
  protected readonly nextStory = computed(() => {
    const stories = this.index.hasValue() ? this.index.value().stories : [];
    const at = stories.findIndex((s) => s.id === this.story());
    if (at < 0 || stories.length < 2) return null;
    const read = this.store.practice().stories;
    for (let i = 1; i < stories.length; i++) {
      const candidate = stories[(at + i) % stories.length];
      if (!read[candidate.id]) return candidate;
    }
    return stories[(at + 1) % stories.length];
  });

  constructor() {
    // A new story (route change without leaving the page) starts clean.
    effect(() => {
      this.story();
      untracked(() => {
        this.stop();
        this.open.set(null);
        this.answers.set({});
      });
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** The open word of paragraph `p` with its meaning, or null when none of its words is open. */
  protected openGloss(
    story: Story,
    p: number,
    paragraph: StoryPart[],
  ): { id: string; word: string; meaning: string } | null {
    const id = this.open();
    if (!id?.startsWith(`${p}-`)) return null;
    const part = paragraph[Number(id.slice(`${p}-`.length))];
    if (part?.kind !== 'gloss') return null;
    return { id, word: part.text, meaning: story.glossary[part.key]?.meaning ?? '' };
  }

  protected toggle(id: string): void {
    this.open.update((current) => (current === id ? null : id));
  }

  protected answer(story: Story, question: number, option: number): void {
    if (this.answers()[question] !== undefined) return;
    this.answers.update((a) => ({ ...a, [question]: option }));
    if (this.complete()) {
      this.store.finishStory(story.id, this.correct(), story.questions.length);
      afterNextRender(
        () =>
          this.host.nativeElement
            .querySelector<HTMLElement>('.summary a, .summary button')
            ?.focus(),
        {
          injector: this.injector,
        },
      );
    }
  }

  protected retry(): void {
    this.answers.set({});
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>('.option')?.focus(), {
      injector: this.injector,
    });
  }

  /** Reads the story aloud paragraph by paragraph and highlights the one being read. */
  protected async listen(story: Story): Promise<void> {
    const run = ++this.listenRun;
    this.speaking.set(true);
    const texts = [story.title, ...story.paragraphs.map(plainParagraph)];
    for (let i = 0; i < texts.length; i++) {
      if (run !== this.listenRun) return;
      this.speakingParagraph.set(i === 0 ? null : i - 1);
      await this.speech.speakText(texts[i]);
    }
    if (run === this.listenRun) this.stop();
  }

  protected stop(): void {
    this.listenRun++;
    this.speech.cancelSpeech();
    this.speaking.set(false);
    this.speakingParagraph.set(null);
  }
}
