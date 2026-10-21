import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

/**
 * First focusable element of the page. It moves focus to the element with id `target` itself because
 * a plain `#fragment` link would navigate away when the app uses `<base href>`.
 */
@Component({
  selector: 'app-skip-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a [href]="'#' + target()" (click)="skip($event)">Skip to main content</a>`,
  styles: `
    a {
      position: fixed;
      top: var(--space-2);
      left: var(--space-2);
      z-index: 100;
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font-weight: 700;
      transform: translateY(-200%);
    }
    a:focus {
      transform: none;
    }
  `,
})
export class SkipLink {
  readonly target = input('main');
  private readonly doc = inject(DOCUMENT);

  protected skip(event: Event): void {
    event.preventDefault();
    const el = this.doc.getElementById(this.target());
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus();
  }
}
