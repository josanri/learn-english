import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Button styled as a chunky key. Use it on a native element so keyboard and screen-reader behaviour is free:
 * `<button appButton variant="primary">Start</button>` or `<a appButton routerLink="/exams/b1">B1</a>`.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- attribute component on native elements
  selector: 'button[appButton], a[appButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[class.block]': 'block()',
  },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: var(--target);
      padding: 0 var(--space-5);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
      font-size: var(--step-0);
      font-weight: 700;
      line-height: 1.1;
      text-decoration: none;
      cursor: pointer;
      box-shadow: 0 3px 0 var(--border);
      transition:
        transform var(--dur),
        box-shadow var(--dur);
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    :host(:hover) {
      transform: translateY(-1px);
      box-shadow: 0 4px 0 var(--border);
    }
    :host(:active) {
      transform: translateY(3px);
      box-shadow: 0 0 0 var(--border);
    }
    :host([data-variant='primary']) {
      background: var(--accent-strong);
      color: var(--on-accent);
    }
    :host([data-variant='danger']) {
      border-color: var(--danger);
      color: var(--danger);
      box-shadow: 0 3px 0 var(--danger);
    }
    :host([data-variant='danger']:hover) {
      box-shadow: 0 4px 0 var(--danger);
    }
    :host([data-variant='danger']:active) {
      box-shadow: 0 0 0 var(--danger);
    }
    :host([data-variant='ghost']) {
      border-color: transparent;
      background: transparent;
      box-shadow: none;
    }
    :host([data-variant='ghost']:hover) {
      background: var(--surface-2);
      transform: none;
    }
    :host([data-variant='ghost']:active) {
      transform: none;
    }
    :host([data-size='sm']) {
      padding: 0 var(--space-4);
      font-size: var(--step--1);
    }
    :host([data-size='lg']) {
      min-height: 3.5rem;
      padding: 0 var(--space-6);
      font-size: var(--step-1);
    }
    :host(.block) {
      display: flex;
      width: 100%;
    }
    :host([disabled]),
    :host([aria-disabled='true']) {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
      pointer-events: none;
    }
  `,
})
export class Button {
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('secondary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly block = input(false);
}
