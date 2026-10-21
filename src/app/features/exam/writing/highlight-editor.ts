import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { Issue } from '../../../core/writing/types';

interface Segment {
  key: number;
  text: string;
  issue: Issue | null;
}

/**
 * A plain `<textarea>` with a "highlight overlay" behind it. The overlay (`.backdrop`) holds the
 * same text with the same font, padding and wrapping, its text is transparent, and the issues are
 * `<mark>` elements with a coloured underline. Both layers sit in one grid cell, so the overlay
 * decides the height of the box (the box grows with the text and never scrolls inside itself, which
 * keeps the layers aligned on phones, with large text and when the page scrolls).
 *
 * The overlay is `aria-hidden`: screen readers only see the textarea; issues are listed in the
 * suggestions panel. Everything that changes metrics (font, size, padding, wrapping) is set once in
 * `.layer`, which both layers share.
 */
@Component({
  selector: 'app-highlight-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.readonly]': 'readonly()' },
  template: `
    <div class="box">
      <div class="layer backdrop" aria-hidden="true" #backdrop>
        @for (seg of segments(); track seg.key) {
          @if (seg.issue; as issue) {
            <mark
              [attr.data-issue]="issue.id"
              [attr.data-group]="issue.group"
              [attr.data-severity]="issue.severity"
              [class.active]="issue.id === activeId()"
              >{{ seg.text }}</mark
            >
          } @else {
            <span>{{ seg.text }}</span>
          }
        }
        <span>&#8203;</span>
      </div>
      <textarea
        #field
        class="layer field"
        wrap="soft"
        autocapitalize="sentences"
        autocomplete="off"
        [id]="inputId()"
        [attr.lang]="lang()"
        [attr.spellcheck]="spellcheck() ? 'true' : 'false'"
        [attr.aria-labelledby]="labelledby() || null"
        [attr.aria-label]="labelledby() ? null : label()"
        [attr.aria-describedby]="describedby() || null"
        [placeholder]="placeholder()"
        [readOnly]="readonly()"
        [value]="value()"
        (input)="onInput()"
        (scroll)="syncScroll()"
        (click)="reportCaret()"
        (keyup)="reportCaret()"
        (select)="reportCaret()"
        (focus)="reportCaret()"
        (blur)="blurred.emit()"
      ></textarea>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .box {
      display: grid;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .box:focus-within {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
    }
    :host(.readonly) .box {
      background: var(--surface-2);
    }
    /* Everything that affects where a letter lands is declared once, for both layers. */
    .layer {
      grid-area: 1 / 1;
      box-sizing: border-box;
      width: 100%;
      min-height: 15rem;
      margin: 0;
      padding: var(--space-4);
      border: 0;
      font: inherit;
      font-size: var(--step-0);
      line-height: 1.7;
      letter-spacing: normal;
      word-spacing: normal;
      text-indent: 0;
      text-transform: none;
      tab-size: 4;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      word-break: normal;
      hyphens: manual;
      font-kerning: normal;
      font-variant-ligatures: normal;
    }
    .backdrop {
      overflow: hidden;
      color: transparent;
      pointer-events: none;
      user-select: none;
    }
    .field {
      align-self: stretch;
      height: auto;
      resize: none;
      overflow: hidden;
      border-radius: inherit;
      background: transparent;
      color: var(--text);
      caret-color: var(--text);
      outline: none;
    }
    .field::placeholder {
      color: var(--text-muted);
      opacity: 1;
    }
    mark {
      color: transparent;
      background: transparent;
      text-decoration-line: underline;
      text-decoration-style: wavy;
      text-decoration-thickness: 2px;
      text-decoration-skip-ink: none;
      text-underline-offset: 0.18em;
    }
    mark[data-severity='note'] {
      text-decoration-style: dotted;
    }
    mark[data-group='spelling'] {
      text-decoration-color: var(--danger);
      background: color-mix(in srgb, var(--danger) 12%, transparent);
    }
    mark[data-group='grammar'] {
      text-decoration-color: var(--warning);
      background: color-mix(in srgb, var(--warning) 14%, transparent);
    }
    mark[data-group='vocabulary'] {
      text-decoration-color: var(--accent-text);
      background: color-mix(in srgb, var(--accent) 14%, transparent);
    }
    mark.active {
      background: color-mix(in srgb, var(--focus-ring) 30%, transparent);
    }
  `,
})
export class HighlightEditor {
  /** The text. Two-way: `[(value)]`. */
  readonly value = model.required<string>();
  readonly issues = input<readonly Issue[]>([]);
  /** Issue under the caret (drawn stronger). */
  readonly activeId = input<string | null>(null);
  readonly readonly = input(false);
  readonly spellcheck = input(false);
  readonly lang = input('en');
  readonly inputId = input('writing-input');
  /** Id of the element that names the textarea; otherwise `label` is used. */
  readonly labelledby = input('');
  readonly label = input('Your answer');
  readonly describedby = input('');
  readonly placeholder = input('Write your answer in English...');

  /** Caret position (start of the selection) after clicks, keys and selection changes. */
  readonly caret = output<number>();
  readonly blurred = output<void>();

  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');
  private readonly backdrop = viewChild.required<ElementRef<HTMLElement>>('backdrop');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly segments = computed<Segment[]>(() => {
    const text = this.value();
    const out: Segment[] = [];
    let cursor = 0;
    for (const issue of this.issues()) {
      if (issue.start < cursor || issue.end > text.length || issue.end <= issue.start) continue;
      if (issue.start > cursor)
        out.push({ key: out.length, text: text.slice(cursor, issue.start), issue: null });
      out.push({ key: out.length, text: text.slice(issue.start, issue.end), issue });
      cursor = issue.end;
    }
    if (cursor < text.length) out.push({ key: out.length, text: text.slice(cursor), issue: null });
    return out;
  });

  constructor() {
    afterNextRender(() => this.resetScroll());
  }

  protected onInput(): void {
    this.value.set(this.field().nativeElement.value);
    this.reportCaret();
    // The browser may have scrolled the (non-growing yet) textarea to show the caret; the box
    // grows right after the next render, so put the content back at the top.
    queueMicrotask(() => requestAnimationFrame(() => this.resetScroll()));
  }

  protected syncScroll(): void {
    this.backdrop().nativeElement.scrollTop = this.field().nativeElement.scrollTop;
  }

  private resetScroll(): void {
    const field = this.field().nativeElement;
    if (field.scrollTop !== 0) field.scrollTop = 0;
    this.backdrop().nativeElement.scrollTop = 0;
  }

  protected reportCaret(): void {
    const field = this.field().nativeElement;
    this.caret.emit(field.selectionStart === field.selectionEnd ? field.selectionStart : -1);
  }

  /** Puts the caret in the box. */
  focus(): void {
    this.field().nativeElement.focus({ preventScroll: true });
  }

  /** Selects a range of the text and focuses the box, e.g. after "Apply". */
  select(start: number, end: number): void {
    const field = this.field().nativeElement;
    field.focus({ preventScroll: true });
    field.setSelectionRange(start, end);
  }

  /** Scrolls the page so the issue is visible and selects it. */
  reveal(issue: Pick<Issue, 'id' | 'start' | 'end'>): void {
    const mark = Array.from(this.host.nativeElement.querySelectorAll('mark')).find(
      (m) => m.getAttribute('data-issue') === issue.id,
    );
    (mark ?? this.field().nativeElement).scrollIntoView({ block: 'center' });
    this.select(issue.start, issue.end);
  }
}
