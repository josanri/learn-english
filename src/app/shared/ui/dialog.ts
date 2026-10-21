import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  ElementRef,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * Modal dialog on the native `<dialog>`: the browser traps focus, makes the page inert, closes on Escape
 * and returns focus to the opener. Bind `[(open)]`. Project the body as content and buttons into `<div actions>`.
 */
@Component({
  selector: 'app-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog [attr.aria-labelledby]="titleId" (close)="open.set(false)">
      <div class="panel">
        <h2 [id]="titleId">{{ heading() }}</h2>
        <div class="body"><ng-content /></div>
        <div class="actions"><ng-content select="[actions]" /></div>
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(32rem, calc(100vw - 2rem));
      max-height: calc(100dvh - 2rem);
      padding: 0;
      border: var(--bw-card) solid var(--card-border);
      border-radius: var(--radius-lg);
      background: var(--bg);
      color: var(--text);
      box-shadow: 8px 8px 0 var(--shadow-solid);
    }
    dialog::backdrop {
      background: var(--overlay);
    }
    .panel {
      padding: var(--space-5);
    }
    h2 {
      font-size: var(--step-2);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-5);
    }
  `,
})
export class Dialog {
  readonly heading = input.required<string>();
  readonly open = model(false);
  protected readonly titleId = `dialog-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });
    // Clicks on the backdrop (the dialog element itself) close the dialog; Escape is handled natively.
    afterNextRender(() => {
      const el = this.dialog().nativeElement;
      el.addEventListener('click', (event) => {
        if (event.target === el) this.open.set(false);
      });
    });
    inject(DestroyRef).onDestroy(() => this.dialog().nativeElement.close());
  }
}
