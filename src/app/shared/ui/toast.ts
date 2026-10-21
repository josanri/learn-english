import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { Icon } from './icon';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'danger';
}

/** Shows short messages in the live region rendered by `<app-toast-host>`. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(text: string, tone: ToastMessage['tone'] = 'info', durationMs = 6000): void {
    const id = this.nextId++;
    this._toasts.update((list) => [...list, { id, text, tone }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}

/** Place once in the app shell. The region is always present so screen readers announce new toasts. */
@Component({
  selector: 'app-toast-host',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="region" role="status" aria-live="polite">
      @for (toast of service.toasts(); track toast.id) {
        <div class="toast" [attr.data-tone]="toast.tone">
          <span>{{ toast.text }}</span>
          <button type="button" aria-label="Dismiss message" (click)="service.dismiss(toast.id)">
            <app-icon name="close" [size]="18" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .region {
      position: fixed;
      inset-inline: var(--space-4);
      bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
      z-index: 60;
      display: grid;
      gap: var(--space-3);
      justify-items: center;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      max-width: 32rem;
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-2);
      color: var(--text);
      font-weight: 600;
      box-shadow: 4px 4px 0 var(--shadow-solid);
      pointer-events: auto;
    }
    .toast[data-tone='danger'] {
      border-color: var(--danger);
    }
    .toast[data-tone='success'] {
      border-color: var(--success);
    }
    button {
      display: grid;
      place-items: center;
      flex: none;
      width: var(--target);
      height: var(--target);
      border: 0;
      border-radius: var(--radius);
      background: transparent;
      cursor: pointer;
    }
    button:hover {
      background: var(--surface);
    }
    @media (max-width: 47.99rem) {
      .region {
        bottom: calc(var(--bottom-nav-height) + var(--space-4) + env(safe-area-inset-bottom));
      }
    }
  `,
})
export class ToastHost {
  protected readonly service = inject(ToastService);
}
