import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { IrregularVerb } from '../../../models/grammar';
import { Button, Icon } from '../../../shared/ui';
import {
  acceptedForms,
  completeSentence,
  formsLabel,
  gapSentenceFor,
  isCorrectForm,
  type FormKind,
} from './verb-engine';

/** Shared look of the three practice cards. */
const CARD_STYLES = `
  :host {
    display: block;
    padding: var(--space-5);
    border: var(--bw-card) solid var(--card-border);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: 6px 6px 0 var(--shadow-solid);
  }
  .prompt {
    margin: 0 0 var(--space-4);
    font-size: var(--step-3);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .sentence {
    margin: 0 0 var(--space-4);
    font-size: var(--step-1);
    line-height: 1.6;
  }
  .sentence input {
    display: inline-block;
    width: 9rem;
    margin-inline: var(--space-1);
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }
  .fields .field {
    margin-bottom: 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .feedback {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    margin: var(--space-4) 0 0;
    font-weight: 700;
  }
  .feedback.right {
    color: var(--success);
  }
  .feedback.wrong {
    color: var(--danger);
  }
  .feedback + .detail {
    margin-top: var(--space-2);
  }
  .detail {
    margin: var(--space-3) 0 0;
    color: var(--text-muted);
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
  }
`;

let nextId = 0;

/** Shows the base form; the learner types the past simple and the past participle. */
@Component({
  selector: 'app-type-card',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="prompt">{{ verb().base }}</p>
    <form (submit)="submit($event)">
      <div class="fields">
        <div class="field">
          <label [for]="id + '-past'">Past simple</label>
          <input
            type="text"
            [id]="id + '-past'"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            [disabled]="checked()"
            [attr.aria-invalid]="checked() && !pastRight() ? 'true' : null"
            [value]="past()"
            (input)="past.set($any($event.target).value)"
          />
        </div>
        <div class="field">
          <label [for]="id + '-participle'">Past participle</label>
          <input
            type="text"
            [id]="id + '-participle'"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            [disabled]="checked()"
            [attr.aria-invalid]="checked() && !participleRight() ? 'true' : null"
            [value]="participle()"
            (input)="participle.set($any($event.target).value)"
          />
        </div>
      </div>
      @if (!checked()) {
        <div class="actions">
          <button appButton type="submit" variant="primary" [disabled]="!canCheck()">Check</button>
        </div>
      }
    </form>
    <div aria-live="polite">
      @if (checked()) {
        <p class="feedback" [class.right]="correct()" [class.wrong]="!correct()">
          <app-icon [name]="correct() ? 'check' : 'cross'" [size]="22" />
          <span>{{ correct() ? 'Correct.' : 'Not quite.' }} {{ forms() }}</span>
        </p>
        <div class="actions next">
          <button #nextButton appButton type="button" variant="primary" (click)="next.emit()">
            Next
          </button>
        </div>
      }
    </div>
  `,
  styles: CARD_STYLES,
})
export class TypeCard {
  readonly verb = input.required<IrregularVerb>();
  /** Fires once, when the learner checks the answer. */
  readonly answered = output<boolean>();
  readonly next = output<void>();

  protected readonly id = `type-${nextId++}`;
  protected readonly past = signal('');
  protected readonly participle = signal('');
  protected readonly checked = signal(false);
  private readonly injector = inject(Injector);
  private readonly nextButton = viewChild('nextButton', { read: ElementRef<HTMLElement> });
  protected readonly pastRight = computed(() => isCorrectForm(this.verb(), 'past', this.past()));
  protected readonly participleRight = computed(() =>
    isCorrectForm(this.verb(), 'participle', this.participle()),
  );
  protected readonly correct = computed(() => this.pastRight() && this.participleRight());
  protected readonly canCheck = computed(
    () => this.past().trim().length > 0 && this.participle().trim().length > 0,
  );
  protected readonly forms = computed(() => formsLabel(this.verb()));

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.checked() || !this.canCheck()) return;
    this.checked.set(true);
    this.answered.emit(this.correct());
    afterNextRender(() => this.nextButton()?.nativeElement.focus(), { injector: this.injector });
  }
}

/** A sentence with a gap; the learner types the missing past simple or past participle. */
@Component({
  selector: 'app-gap-card',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="eyebrow">
      Write the {{ kind() === 'past' ? 'past simple' : 'past participle' }} of {{ verb().base }}
    </p>
    @if (gap(); as g) {
      <form (submit)="submit($event)">
        <p class="sentence">
          {{ g.before }}<label class="visually-hidden" [for]="id">Missing word</label
          ><input
            type="text"
            [id]="id"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            [disabled]="checked()"
            [attr.aria-invalid]="checked() && !correct() ? 'true' : null"
            [value]="typed()"
            (input)="typed.set($any($event.target).value)"
          />{{ g.after }}
        </p>
        @if (!checked()) {
          <div class="actions">
            <button appButton type="submit" variant="primary" [disabled]="!canCheck()">
              Check
            </button>
          </div>
        }
      </form>
    }
    <div aria-live="polite">
      @if (checked()) {
        <p class="feedback" [class.right]="correct()" [class.wrong]="!correct()">
          <app-icon [name]="correct() ? 'check' : 'cross'" [size]="22" />
          <span>{{ correct() ? 'Correct.' : 'Not quite.' }} {{ answers() }}</span>
        </p>
        <p class="detail">{{ full() }}</p>
        <div class="actions next">
          <button #nextButton appButton type="button" variant="primary" (click)="next.emit()">
            Next
          </button>
        </div>
      }
    </div>
  `,
  styles: CARD_STYLES,
})
export class GapCard {
  readonly verb = input.required<IrregularVerb>();
  readonly kind = input.required<FormKind>();
  readonly answered = output<boolean>();
  readonly next = output<void>();

  protected readonly id = `gap-${nextId++}`;
  protected readonly typed = signal('');
  protected readonly checked = signal(false);
  private readonly injector = inject(Injector);
  private readonly nextButton = viewChild('nextButton', { read: ElementRef<HTMLElement> });
  protected readonly gap = computed(() => gapSentenceFor(this.verb(), this.kind()));
  protected readonly correct = computed(() =>
    isCorrectForm(this.verb(), this.kind(), this.typed()),
  );
  protected readonly canCheck = computed(() => this.typed().trim().length > 0);
  protected readonly answers = computed(() => acceptedForms(this.verb(), this.kind()).join(' / '));
  protected readonly full = computed(() => completeSentence(this.verb(), this.kind()));

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.checked() || !this.canCheck()) return;
    this.checked.set(true);
    this.answered.emit(this.correct());
    afterNextRender(() => this.nextButton()?.nativeElement.focus(), { injector: this.injector });
  }
}

/** Flip card: the learner thinks of the forms, flips the card and says whether they knew them. */
@Component({
  selector: 'app-flash-card',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="prompt">{{ verb().base }}</p>
    @if (!flipped()) {
      <div class="actions">
        <button appButton type="button" variant="primary" (click)="flipped.set(true)">
          Show the forms
        </button>
      </div>
    } @else {
      <div aria-live="polite">
        <p class="forms">
          <span class="label">Past simple</span>
          <strong>{{ pastText() }}</strong>
          <span class="label">Past participle</span>
          <strong>{{ participleText() }}</strong>
        </p>
        <p class="detail">{{ example() }}</p>
      </div>
      <div class="actions">
        <button appButton type="button" variant="primary" (click)="rate(true)">I knew it</button>
        <button appButton type="button" (click)="rate(false)">I need to review it</button>
      </div>
    }
  `,
  styles: [
    CARD_STYLES,
    `
      .forms {
        display: grid;
        gap: var(--space-1);
        margin: 0 0 var(--space-3);
        font-size: var(--step-2);
      }
      .label {
        margin-top: var(--space-2);
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-size: var(--step--1);
        text-transform: uppercase;
      }
    `,
  ],
})
export class FlashCard {
  readonly verb = input.required<IrregularVerb>();
  /** True when the learner knew the forms. */
  readonly answered = output<boolean>();
  readonly next = output<void>();

  protected readonly flipped = signal(false);
  protected readonly pastText = computed(() => acceptedForms(this.verb(), 'past').join(' / '));
  protected readonly participleText = computed(() =>
    acceptedForms(this.verb(), 'participle').join(' / '),
  );
  protected readonly example = computed(() => completeSentence(this.verb(), 'past'));

  protected rate(knew: boolean): void {
    this.answered.emit(knew);
    this.next.emit();
  }
}
