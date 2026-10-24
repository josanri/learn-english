import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { parseMistakeId } from '../../core/mistakes';
import { LocalStorageService } from '../../core/storage.service';
import { ExamCatalogueService } from '../../data/exam-catalogue.service';
import { PracticeCatalogueService } from '../../data/practice-catalogue.service';
import type { PhrasalVerb } from '../../models/practice';
import { Button, Card, Chip, EmptyState, Icon, ProgressBar } from '../../shared/ui';
import { isCorrect } from '../exam/engine/scoring';
import { choicesFor, parseExample, type Choice } from '../phrasal-verbs/phrasal-engine';
import { InsightsService } from '../progress/insights.service';
import { buildExamCard, type ExamMistakeCard } from './mistake-card';
import { dueMistakes, gradeMistake, mistakeCounts } from './mistake-queue';

/** Mistakes per session; the rest wait for the next one. */
export const MISTAKES_SESSION_SIZE = 15;

type Phase = 'start' | 'running' | 'done';

type LoadedCard =
  | { id: string; kind: 'exam'; card: ExamMistakeCard }
  | { id: string; kind: 'phrasal'; verb: PhrasalVerb; choices: Choice[] };

/**
 * `/practice/mistakes`: items the learner got wrong in an exam or in the phrasal verb trainer,
 * on the flashcard schedule. Cloze and notice questions are answered here; other items link to
 * their part, and the learner says if they knew the answer.
 */
@Component({
  selector: 'app-mistakes-page',
  imports: [RouterLink, Button, Card, Chip, EmptyState, Icon, ProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow"><a routerLink="/">Home</a> &middot; Practice</p>
      <h1>My mistakes</h1>
      <p class="lede">
        Questions you got wrong in the exams and phrasal verbs you missed come back here. Get one
        right a few times over some weeks and it leaves the list.
      </p>

      <ul class="stats" aria-label="Your mistakes">
        <li>
          <app-chip [prompt]="false">{{ counts().due }} ready now</app-chip>
        </li>
        <li>
          <app-chip [prompt]="false">{{ counts().waiting }} coming back later</app-chip>
        </li>
        <li>
          <app-chip [prompt]="false">{{ counts().fixed }} fixed</app-chip>
        </li>
      </ul>

      @switch (phase()) {
        @case ('start') {
          @if (counts().due === 0) {
            <app-empty-state
              heading="Nothing to practise now"
              [description]="emptyText()"
              icon="check"
            >
              <a appButton routerLink="/exams/b1">B1 exams</a>
              <a appButton routerLink="/vocabulary/phrasal-verbs">Phrasal verbs</a>
            </app-empty-state>
          } @else {
            <app-card>
              <p>
                {{ counts().due }} {{ counts().due === 1 ? 'mistake is' : 'mistakes are' }} ready. A
                session has up to {{ sessionSize }}.
              </p>
              <button appButton type="button" variant="primary" size="lg" (click)="start()">
                Start
                <app-icon name="arrow" [size]="22" />
              </button>
            </app-card>
          }
        }
        @case ('running') {
          <div class="progress">
            <p class="count" role="status">Question {{ index() + 1 }} of {{ queue().length }}</p>
            <app-progress-bar [value]="index() / queue().length" label="Session progress" />
          </div>
          @if (loadError()) {
            <app-empty-state
              heading="This question could not be loaded"
              description="Check your connection. You can skip it and try again later."
              icon="alert"
            >
              <button appButton type="button" (click)="advance()">Skip</button>
            </app-empty-state>
          } @else if (card(); as c) {
            <article class="question" [attr.aria-labelledby]="'q-' + index()">
              @if (c.kind === 'phrasal') {
                <p class="ask" [id]="'q-' + index()">Phrasal verbs · What does it mean?</p>
                <p class="prompt">{{ c.verb.verb }}</p>
                <div class="options" role="group" aria-label="Options">
                  @for (choice of c.choices; track choice.label; let i = $index) {
                    <button
                      type="button"
                      class="option"
                      [class.right]="answered() && choice.correct"
                      [class.wrong]="picked() === i && !choice.correct"
                      [disabled]="answered()"
                      [attr.aria-pressed]="picked() === i"
                      (click)="pick(i, choice.correct)"
                    >
                      {{ choice.label }}
                    </button>
                  }
                </div>
              } @else {
                <p class="ask" [id]="'q-' + index()">{{ c.card.heading }}</p>
                @switch (c.card.kind) {
                  @case ('choice') {
                    @if (c.card.notice) {
                      <blockquote class="notice">{{ c.card.notice }}</blockquote>
                    }
                    @if (c.card.context; as ctx) {
                      <p class="sentence">
                        {{ ctx.before
                        }}<span class="gap" [class.filled]="answered()">{{
                          answered() ? c.card.options[c.card.correct] : '_____'
                        }}</span
                        >{{ ctx.after }}
                      </p>
                    }
                    <p class="hint">{{ c.card.prompt }}</p>
                    <div class="options" role="group" aria-label="Options">
                      @for (option of c.card.options; track $index; let i = $index) {
                        <button
                          type="button"
                          class="option"
                          [class.right]="answered() && i === c.card.correct"
                          [class.wrong]="picked() === i && i !== c.card.correct"
                          [disabled]="answered()"
                          [attr.aria-pressed]="picked() === i"
                          (click)="pick(i, i === c.card.correct)"
                        >
                          {{ letters[i] }}. {{ option }}
                        </button>
                      }
                    </div>
                  }
                  @case ('text') {
                    @if (c.card.context; as ctx) {
                      <p class="sentence">
                        {{ ctx.before
                        }}<span class="gap" [class.filled]="answered()">{{
                          answered() ? c.card.expected : '_____'
                        }}</span
                        >{{ ctx.after }}
                      </p>
                    }
                    <form class="typed" (submit)="$event.preventDefault(); checkTyped(c.card)">
                      <label for="typed-answer">Write one word for the gap</label>
                      <div class="typed-row">
                        <input
                          id="typed-answer"
                          type="text"
                          autocomplete="off"
                          autocapitalize="none"
                          spellcheck="false"
                          [value]="typed()"
                          [disabled]="answered()"
                          (input)="typed.set($any($event.target).value)"
                        />
                        <button
                          appButton
                          type="submit"
                          variant="primary"
                          [disabled]="answered() || !typed().trim()"
                        >
                          Check
                        </button>
                      </div>
                    </form>
                  }
                  @case ('self') {
                    @if (c.card.prompt) {
                      <p class="sentence">{{ c.card.prompt }}</p>
                    }
                    <p class="hint">
                      This question needs its
                      {{ c.card.skill === 'listening' ? 'recording' : 'text' }}. Open the part,
                      answer again, then come back and say how it went.
                    </p>
                    <p>
                      <a
                        appButton
                        [routerLink]="c.card.link.commands"
                        [queryParams]="c.card.link.queryParams"
                      >
                        Open this part
                        <app-icon name="arrow" [size]="18" />
                      </a>
                    </p>
                    @if (!answered()) {
                      <div class="options" role="group" aria-label="How did it go?">
                        <button type="button" class="option" (click)="pick(0, true)">
                          I got it right this time
                        </button>
                        <button type="button" class="option" (click)="pick(1, false)">
                          It is still difficult
                        </button>
                      </div>
                    }
                  }
                }
              }

              @if (answered()) {
                <div class="feedback" role="status">
                  @if (lastCorrect()) {
                    <p class="result right"><app-icon name="check" /> Right.</p>
                  } @else {
                    <p class="result wrong"><app-icon name="cross" /> Not quite.</p>
                  }
                  @if (c.kind === 'phrasal') {
                    <p>
                      <strong>{{ c.verb.verb }}</strong
                      >: {{ c.verb.meaning }}.
                    </p>
                    <p class="ex">
                      @for (part of example(c.verb); track $index) {
                        @if (part.marked) {
                          <strong>{{ part.text }}</strong>
                        } @else {
                          {{ part.text }}
                        }
                      }
                    </p>
                  } @else {
                    <p>Answer: {{ c.card.expected }}</p>
                    @if (c.card.explanation) {
                      <p class="muted">{{ c.card.explanation }}</p>
                    }
                    @if (c.card.kind !== 'self') {
                      <p>
                        <a
                          [routerLink]="c.card.link.commands"
                          [queryParams]="c.card.link.queryParams"
                          >See the whole text</a
                        >
                      </p>
                    }
                  }
                  <button
                    appButton
                    type="button"
                    variant="primary"
                    class="next"
                    (click)="advance()"
                  >
                    {{ index() + 1 >= queue().length ? 'See results' : 'Next' }}
                    <app-icon name="arrow" />
                  </button>
                </div>
              }
            </article>
          } @else {
            <p role="status" class="muted">Loading the question&hellip;</p>
          }
          <p class="end">
            <button appButton type="button" variant="ghost" size="sm" (click)="finish()">
              End session
            </button>
          </p>
        }
        @case ('done') {
          <app-card>
            <h2>Session finished</h2>
            <p class="score">{{ rightCount() }} of {{ results().length }} right</p>
            <p class="muted">
              Right answers come back after a longer time. Wrong ones come back in a few minutes.
            </p>
            <div class="actions">
              @if (counts().due > 0) {
                <button appButton type="button" variant="primary" (click)="start()">
                  Practise {{ nextSessionSize() }} more
                </button>
              }
              <a appButton routerLink="/">Home</a>
            </div>
          </app-card>
        }
      }
    </div>
  `,
  styles: `
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0 0 var(--space-5);
      padding: 0;
      list-style: none;
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
      margin: 0 0 var(--space-3);
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
    .notice {
      margin: 0 0 var(--space-4);
      padding: var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      white-space: pre-line;
    }
    .sentence {
      margin: 0 0 var(--space-3);
      font-size: var(--step-1);
      line-height: 1.6;
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
    .typed label {
      display: block;
      margin-bottom: var(--space-2);
      font-weight: 700;
    }
    .typed-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .typed-row input {
      flex: 1 1 12rem;
      min-height: var(--target);
    }
    .feedback {
      display: grid;
      gap: var(--space-2);
      margin-top: var(--space-5);
    }
    .feedback p {
      margin: 0;
    }
    .feedback a {
      display: inline-flex;
      align-items: center;
      min-height: var(--target);
      color: var(--accent-text);
      font-weight: 700;
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
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  `,
})
export class MistakesPage {
  private readonly storage = inject(LocalStorageService);
  private readonly insights = inject(InsightsService);
  private readonly levelIndex = inject(ExamCatalogueService).levelIndex(signal('b1'));
  private readonly phrasalFile = inject(PracticeCatalogueService).phrasalVerbs();

  protected readonly sessionSize = MISTAKES_SESSION_SIZE;
  protected readonly letters = 'ABCDEFGH';

  /** Changes after each answer so the counts follow the schedule. */
  private readonly now = signal(new Date());
  protected readonly counts = computed(() =>
    mistakeCounts(this.storage.practice().mistakes, this.now()),
  );
  protected readonly emptyText = computed(() =>
    this.counts().waiting > 0
      ? 'Your other mistakes come back later. Do an exam or some phrasal verbs in the meantime.'
      : 'Finish an exam section or practise phrasal verbs. The questions you get wrong come here.',
  );

  protected readonly phase = signal<Phase>('start');
  protected readonly queue = signal<string[]>([]);
  protected readonly index = signal(0);
  protected readonly card = signal<LoadedCard | null>(null);
  protected readonly loadError = signal(false);
  protected readonly picked = signal<number | null>(null);
  protected readonly typed = signal('');
  protected readonly answered = signal(false);
  protected readonly lastCorrect = signal(false);
  protected readonly results = signal<boolean[]>([]);
  protected readonly rightCount = computed(() => this.results().filter(Boolean).length);
  protected readonly nextSessionSize = computed(() =>
    Math.min(this.counts().due, MISTAKES_SESSION_SIZE),
  );

  private readonly currentId = computed(() =>
    this.phase() === 'running' ? this.queue()[this.index()] : undefined,
  );

  constructor() {
    // Results saved before the breakdown existed add their wrong items to the list.
    effect(() => {
      const exams = this.levelIndex.hasValue() ? this.levelIndex.value().exams : [];
      if (exams.length) void untracked(() => this.insights.backfill(exams));
    });
    effect(() => {
      const id = this.currentId();
      // Wait for the content files the card needs.
      const ready = this.levelIndex.hasValue() && this.phrasalFile.hasValue();
      if (!id || !ready) return;
      untracked(() => void this.load(id));
    });
  }

  protected start(): void {
    const ids = dueMistakes(this.storage.practice().mistakes, new Date());
    this.queue.set(ids.slice(0, MISTAKES_SESSION_SIZE));
    this.results.set([]);
    this.index.set(0);
    this.resetAnswer();
    this.phase.set(this.queue().length ? 'running' : 'start');
  }

  protected pick(choice: number, correct: boolean): void {
    if (this.answered()) return;
    this.picked.set(choice);
    this.grade(correct);
  }

  protected checkTyped(card: ExamMistakeCard): void {
    if (this.answered() || card.kind !== 'text' || !this.typed().trim()) return;
    this.grade(isCorrect(card.item, this.typed()));
  }

  protected advance(): void {
    if (this.index() + 1 >= this.queue().length) {
      this.finish();
      return;
    }
    this.resetAnswer();
    this.index.update((i) => i + 1);
  }

  protected finish(): void {
    this.now.set(new Date());
    this.phase.set('done');
  }

  protected example(verb: PhrasalVerb) {
    return parseExample(verb.example);
  }

  private grade(correct: boolean): void {
    const id = this.currentId();
    const mistake = id ? this.storage.practice().mistakes[id] : undefined;
    this.answered.set(true);
    this.lastCorrect.set(correct);
    this.results.update((r) => [...r, correct]);
    if (id && mistake) {
      const now = new Date();
      this.storage.saveMistakeReview(id, gradeMistake(mistake, correct, now));
      this.now.set(now);
    }
  }

  private resetAnswer(): void {
    this.card.set(null);
    this.loadError.set(false);
    this.picked.set(null);
    this.typed.set('');
    this.answered.set(false);
  }

  private async load(id: string): Promise<void> {
    const loaded = await this.resolve(id);
    if (this.currentId() !== id) return; // The learner moved on meanwhile.
    if (loaded === 'gone') {
      // The exam item or verb no longer exists: drop it and go on.
      this.storage.removeMistakes([id]);
      this.queue.update((q) => q.filter((x) => x !== id));
      if (this.index() >= this.queue().length) this.finish();
      return;
    }
    if (loaded === 'error') this.loadError.set(true);
    else this.card.set(loaded);
  }

  private async resolve(id: string): Promise<LoadedCard | 'gone' | 'error'> {
    const ref = parseMistakeId(id);
    if (!ref) return 'gone';
    if (ref.kind === 'phrasal') {
      const verbs = this.phrasalFile.value()?.verbs ?? [];
      const verb = verbs.find((v) => v.id === ref.verbId);
      return verb
        ? { id, kind: 'phrasal', verb, choices: choicesFor(verb, 'meaning', verbs) }
        : 'gone';
    }
    const summary = this.levelIndex.value()?.exams.find((e) => e.id === ref.examId);
    if (!summary) return 'gone';
    try {
      const exam = await this.insights.loadExam(summary);
      const card = buildExamCard(exam, ref.itemId);
      return card ? { id, kind: 'exam', card } : 'gone';
    } catch {
      return 'error';
    }
  }
}
