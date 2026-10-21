import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, Dialog, Icon } from '../../../shared/ui';
import { isAnswered } from '../engine/scoring';
import { ExamSessionStore } from '../session/exam-session.store';
import { focusItem } from './focus-item';

/**
 * Numbered palette of every question in the section, grouped by part: answered, flagged for review or
 * pending. Inline on larger screens; on phones a button opens it as a bottom sheet.
 */
@Component({
  selector: 'app-question-navigator',
  imports: [NgTemplateOutlet, Button, Dialog, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="desktop">
      <ng-container [ngTemplateOutlet]="palette" />
    </div>
    <div class="mobile">
      <button appButton size="sm" type="button" (click)="open.set(true)">
        <app-icon name="grid" [size]="18" />
        Questions {{ store.answeredCount() }}/{{ store.totalCount() }}
      </button>
      <app-dialog heading="Questions" placement="sheet" [(open)]="open">
        <ng-container [ngTemplateOutlet]="palette" />
        <button actions appButton type="button" (click)="open.set(false)">Close</button>
      </app-dialog>
    </div>

    <ng-template #palette>
      <p class="legend">
        <span><span class="cell" data-state="answered" aria-hidden="true"></span> Answered</span>
        <span><span class="cell" data-state="pending" aria-hidden="true"></span> Not answered</span>
        <span
          ><span class="cell" data-state="pending" data-flagged="true" aria-hidden="true"></span>
          Flagged</span
        >
      </p>
      @for (group of groups(); track group.partId) {
        <div class="group" role="group" [attr.aria-label]="'Part ' + group.number">
          <span class="part" [class.current]="group.current">Part {{ group.number }}</span>
          @for (cell of group.cells; track cell.id) {
            <button
              type="button"
              class="cell"
              [attr.data-state]="cell.answered ? 'answered' : 'pending'"
              [attr.data-flagged]="cell.flagged"
              [attr.aria-label]="cell.label"
              (click)="go(group.index, cell.id)"
            >
              {{ cell.n }}
            </button>
          }
        </div>
      }
    </ng-template>
  `,
  styles: `
    .desktop {
      padding-block: var(--space-3);
    }
    .mobile {
      padding-block: var(--space-3);
    }
    @media (max-width: 47.99rem) {
      .desktop {
        display: none;
      }
    }
    @media (min-width: 48rem) {
      .mobile {
        display: none;
      }
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
      margin: 0 0 var(--space-3);
      color: var(--text-muted);
      font-size: var(--step--1);
    }
    .legend > span {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
    .group {
      display: inline-flex;
      margin-right: var(--space-4);
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }
    .part {
      min-width: 4.5rem;
      font-family: var(--font-mono);
      font-size: var(--step--1);
      font-weight: 600;
      color: var(--text-muted);
    }
    .part.current {
      color: var(--text);
      text-decoration: underline;
      text-underline-offset: 0.25em;
    }
    .cell {
      position: relative;
      display: inline-grid;
      place-items: center;
      width: var(--target);
      height: var(--target);
      padding: 0;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius);
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-mono);
      font-weight: 700;
    }
    button.cell {
      cursor: pointer;
    }
    .legend .cell {
      width: 1.25rem;
      height: 1.25rem;
    }
    .cell[data-state='answered'] {
      background: var(--text);
      color: var(--bg);
    }
    .cell[data-flagged='true']::after {
      content: '';
      position: absolute;
      top: -5px;
      right: -5px;
      width: 0.8rem;
      height: 0.8rem;
      border: var(--bw) solid var(--border);
      border-radius: 50%;
      background: var(--warning);
    }
    @media (max-width: 47.99rem) {
      .group {
        gap: var(--space-1);
      }
      .part {
        flex-basis: 100%;
      }
    }
    @media (min-width: 48rem) {
      .part {
        min-width: 0;
      }
      .group .cell {
        width: 2.25rem;
        height: 2.25rem;
      }
    }
  `,
})
export class QuestionNavigator {
  protected readonly store = inject(ExamSessionStore);
  protected readonly open = signal(false);

  protected readonly groups = computed(() => {
    const byPart = this.store.itemsByPart();
    const flagged = new Set(this.store.session().flagged);
    const answers = this.store.answers();
    return this.store
      .parts()
      .map((part, index) => ({
        partId: part.id,
        number: part.number,
        index,
        current: index === this.store.partIndex(),
        cells: (byPart.get(part.id) ?? []).map((p) => {
          const answered = isAnswered(answers[p.item.id]);
          const isFlagged = flagged.has(p.item.id);
          return {
            id: p.item.id,
            n: p.n,
            answered,
            flagged: isFlagged,
            label: `Part ${part.number}, question ${p.n}: ${answered ? 'answered' : 'not answered'}${isFlagged ? ', flagged for review' : ''}`,
          };
        }),
      }))
      .filter((g) => g.cells.length > 0);
  });

  protected go(partIndex: number, itemId: string): void {
    this.open.set(false);
    this.store.goToPart(partIndex);
    focusItem(itemId);
  }
}
