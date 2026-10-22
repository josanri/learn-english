import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { LocalStorageService } from '../../../core/storage.service';
import type { IrregularVerb } from '../../../models/grammar';
import {
  Button,
  Card,
  Icon,
  ProgressBar,
  SegmentedControl,
  type SegmentOption,
} from '../../../shared/ui';
import { FlashCard, GapCard, TypeCard } from './practice-cards';
import { SESSION_SIZE, formsLabel, selectVerbs, verbsToReview, type FormKind } from './verb-engine';

type Mode = 'type' | 'gap' | 'flash';
type Pool = 'all' | 'review' | 'starred';
type Phase = 'setup' | 'running' | 'done';

const MODES: SegmentOption[] = [
  { value: 'type', label: 'Type the forms' },
  { value: 'gap', label: 'Fill the gap' },
  { value: 'flash', label: 'Flashcards' },
];

const MODE_HELP: Record<Mode, string> = {
  type: 'You see the base form. Type the past simple and the past participle.',
  gap: 'You see a sentence with a gap. Type the missing form.',
  flash: 'You see the base form. Think of the other forms, flip the card and check.',
};

const POOLS: SegmentOption[] = [
  { value: 'all', label: 'All verbs' },
  { value: 'review', label: 'Verbs to review' },
  { value: 'starred', label: 'Starred verbs' },
];

interface Question {
  key: string;
  verb: IrregularVerb;
  kind: FormKind;
}

interface Outcome {
  verb: IrregularVerb;
  correct: boolean;
}

/** Practice session: choose a mode and a pool, answer ten verbs, see which ones to review. */
@Component({
  selector: 'app-verb-practice',
  imports: [Button, Card, Icon, ProgressBar, SegmentedControl, TypeCard, GapCard, FlashCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (phase()) {
      @case ('setup') {
        <app-card>
          <h2>Practice</h2>
          <div class="setup">
            <app-segmented-control label="Exercise" [options]="modes" [(value)]="mode" />
            <p class="hint">{{ modeHelp() }}</p>
            <app-segmented-control label="Verbs" [options]="pools" [(value)]="pool" />
            <p class="hint" role="status">
              @if (poolSize() === 0) {
                {{ emptyPoolText() }}
              } @else {
                {{ poolSize() }} {{ poolSize() === 1 ? 'verb' : 'verbs' }} available.
                {{ sessionSize() }} per session.
              }
            </p>
            <div>
              <button
                appButton
                type="button"
                variant="primary"
                size="lg"
                [disabled]="poolSize() === 0"
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
        <div>
          <div class="progress">
            <p class="count" role="status">Verb {{ index() + 1 }} of {{ questions().length }}</p>
            <app-progress-bar [value]="index() / questions().length" label="Session progress" />
          </div>
          @for (item of current(); track item.key) {
            @switch (mode()) {
              @case ('type') {
                <app-type-card
                  [verb]="item.verb"
                  (answered)="record(item.verb, $event)"
                  (next)="advance()"
                />
              }
              @case ('gap') {
                <app-gap-card
                  [verb]="item.verb"
                  [kind]="item.kind"
                  (answered)="record(item.verb, $event)"
                  (next)="advance()"
                />
              }
              @case ('flash') {
                <app-flash-card
                  [verb]="item.verb"
                  (answered)="recordFlash(item.verb, $event)"
                  (next)="advance()"
                />
              }
            }
          }
          <p class="end">
            <button appButton type="button" variant="ghost" size="sm" (click)="finish()">
              End session
            </button>
          </p>
        </div>
      }
      @case ('done') {
        <app-card [raised]="true">
          <h2 tabindex="-1">Session finished</h2>
          @if (outcomes().length === 0) {
            <p>You did not answer any verb.</p>
          } @else {
            <p class="score" role="status">{{ rightCount() }} of {{ outcomes().length }} right.</p>
            @if (missed().length > 0) {
              <h3>Verbs to review</h3>
              <ul class="missed">
                @for (verb of missed(); track verb.id) {
                  <li>{{ label(verb) }}</li>
                }
              </ul>
            } @else {
              <p>No mistakes. Well done.</p>
            }
          }
          <div class="actions">
            @if (missed().length > 0) {
              <button appButton type="button" variant="primary" (click)="practiseMissed()">
                Practise these verbs again
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
  `,
  styles: `
    h2 {
      margin-bottom: var(--space-4);
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
export class VerbPractice {
  readonly verbs = input.required<readonly IrregularVerb[]>();

  private readonly store = inject(LocalStorageService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly modes = MODES;
  protected readonly pools = POOLS;
  protected readonly mode = signal<string>('type');
  protected readonly pool = signal<string>('all');
  protected readonly phase = signal<Phase>('setup');
  protected readonly questions = signal<Question[]>([]);
  protected readonly index = signal(0);
  protected readonly outcomes = signal<Outcome[]>([]);

  protected readonly modeHelp = computed(() => MODE_HELP[this.mode() as Mode] ?? '');
  protected readonly current = computed(() => {
    const question = this.questions()[this.index()];
    return question ? [question] : [];
  });
  protected readonly rightCount = computed(() => this.outcomes().filter((o) => o.correct).length);
  protected readonly missed = computed(() =>
    this.outcomes()
      .filter((o) => !o.correct)
      .map((o) => o.verb),
  );

  private readonly poolIds = computed(() => {
    const progress = this.store.grammar().verbs;
    switch (this.pool() as Pool) {
      case 'review':
        return verbsToReview(this.verbs(), progress).map((v) => v.id);
      case 'starred':
        return this.verbs()
          .filter((v) => progress[v.id]?.starred)
          .map((v) => v.id);
      default:
        return this.verbs().map((v) => v.id);
    }
  });
  protected readonly poolSize = computed(() => this.poolIds().length);
  protected readonly sessionSize = computed(() => Math.min(SESSION_SIZE, this.poolSize()));
  protected readonly emptyPoolText = computed(() =>
    this.pool() === 'review'
      ? 'No verbs to review yet. Practise first and the verbs you get wrong appear here.'
      : 'No starred verbs yet. Star verbs in the glossary.',
  );

  protected label(verb: IrregularVerb): string {
    return formsLabel(verb);
  }

  protected start(onlyIds?: readonly string[]): void {
    const picked = selectVerbs(this.verbs(), this.store.grammar().verbs, {
      onlyIds: onlyIds ?? this.poolIds(),
    });
    this.questions.set(
      picked.map((verb, i) => ({
        key: `${i}-${verb.id}`,
        verb,
        kind: i % 2 === 0 ? 'past' : 'participle',
      })),
    );
    this.index.set(0);
    this.outcomes.set([]);
    this.phase.set(picked.length > 0 ? 'running' : 'setup');
    this.focusCard();
  }

  protected practiseMissed(): void {
    this.start(this.missed().map((v) => v.id));
  }

  protected record(verb: IrregularVerb, correct: boolean): void {
    this.store.recordVerbResult(verb.id, correct);
    this.outcomes.update((list) => [...list, { verb, correct }]);
  }

  protected recordFlash(verb: IrregularVerb, knew: boolean): void {
    this.record(verb, knew);
    this.store.setVerbKnown(verb.id, knew);
  }

  protected advance(): void {
    if (this.index() + 1 >= this.questions().length) {
      this.finish();
      return;
    }
    this.index.update((i) => i + 1);
    this.focusCard();
  }

  protected finish(): void {
    this.phase.set('done');
    this.focusCard('h2');
  }

  /** Moves focus to the first control of the new card (or the heading of the summary). */
  private focusCard(selector = 'input, button'): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
