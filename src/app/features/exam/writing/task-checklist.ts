import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ChecklistItem } from '../../../core/writing/types';
import { Icon } from '../../../shared/ui';

/**
 * "Task" group of the feedback: the points the task asks for and form checks (greeting, closing,
 * paragraphs, linking words, verb forms). Each item says whether it looks done in words, not only
 * with an icon. These are hints: the keyword search can miss a point you covered in other words.
 */
@Component({
  selector: 'app-task-checklist',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (section of sections(); track section.title) {
      <h4>{{ section.title }}</h4>
      <ul>
        @for (item of section.items; track item.id) {
          <li [attr.data-status]="item.status">
            <span class="mark" aria-hidden="true">
              <app-icon [name]="item.status === 'done' ? 'check' : 'cross'" [size]="16" />
            </span>
            <span>
              {{ item.label }}
              <span class="visually-hidden"
                >: {{ item.status === 'done' ? 'done' : 'not done yet' }}</span
              >
              @if (item.detail) {
                <small class="muted">{{ item.detail }}</small>
              }
            </span>
          </li>
        }
      </ul>
    }
    <p class="muted note">
      This list only looks for key words. If you covered a point in other words, it is fine.
    </p>
  `,
  styles: `
    h4 {
      margin: var(--space-3) 0 var(--space-2);
      font-size: var(--step-0);
      letter-spacing: 0;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
      font-size: var(--step--1);
    }
    li small {
      display: block;
    }
    .mark {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      border: var(--bw) solid currentColor;
      border-radius: 50%;
      color: var(--text-muted);
    }
    li[data-status='done'] .mark {
      background: var(--success);
      border-color: var(--success);
      color: var(--bg);
    }
    .note {
      margin: var(--space-3) 0 0;
      font-size: var(--step--1);
    }
  `,
})
export class TaskChecklist {
  readonly items = input.required<readonly ChecklistItem[]>();

  protected readonly sections = computed(() => {
    const points = this.items().filter((i) => i.kind === 'points');
    const form = this.items().filter((i) => i.kind === 'form');
    return [
      ...(points.length ? [{ title: 'Points to cover', items: points }] : []),
      ...(form.length ? [{ title: 'Form and length', items: form }] : []),
    ];
  });
}
