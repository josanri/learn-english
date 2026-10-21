import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { GapFillWordBankPart } from '../../../models/exam';
import { normalizeAnswer } from '../engine/scoring';
import { ExamSessionStore } from '../session/exam-session.store';
import { AnswerSelect, FlagStrip } from '../ui/item-controls';
import { Passage } from '../ui/layout';

/** Reading: fill the gaps with words from a shared bank; words already used are removed from the lists. */
@Component({
  selector: 'app-word-bank-part',
  imports: [Passage, AnswerSelect, FlagStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="bank" aria-label="Word bank">
      @for (word of bank(); track word.text) {
        <li class="text-card" [class.used]="word.used">
          {{ word.text }}
          @if (word.used) {
            <span class="visually-hidden"> (used)</span>
          }
        </li>
      }
    </ul>
    <app-passage [text]="part().passage">
      <ng-template let-n>
        <app-answer-select
          [itemId]="gapId(n)"
          [label]="'Gap ' + n"
          [options]="optionsFor(n)"
          placeholder="Word"
        />
      </ng-template>
    </app-passage>
    <app-flag-strip [entries]="flagEntries()" />
  `,
  styles: `
    .bank {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0 0 var(--space-5);
      padding: 0;
      list-style: none;
    }
    .bank li {
      margin: 0;
      padding: var(--space-1) var(--space-3);
      font-family: var(--font-mono);
      font-weight: 600;
    }
    .bank li.used {
      text-decoration: line-through;
    }
  `,
})
export class WordBankPart {
  readonly part = input.required<GapFillWordBankPart>();
  private readonly store = inject(ExamSessionStore);

  protected readonly flagEntries = computed(() =>
    this.part().gaps.map((g, i) => ({ id: g.id, label: `Gap ${i + 1}` })),
  );
  /** Normalised word -> gap number that uses it. */
  private readonly usedIn = computed(() => {
    const map = new Map<string, number>();
    this.part().gaps.forEach((gap, i) => {
      const value = normalizeAnswer(String(this.store.answer(gap.id) ?? ''));
      if (value) map.set(value, i + 1);
    });
    return map;
  });
  protected readonly bank = computed(() =>
    this.part().wordBank.map((text) => ({
      text,
      used: this.usedIn().has(normalizeAnswer(text)),
    })),
  );

  protected gapId(n: number): string {
    return this.part().gaps[n - 1]?.id ?? `${this.part().id}-gap-${n}`;
  }

  protected optionsFor(n: number): { value: string; label: string }[] {
    const used = this.usedIn();
    return this.part()
      .wordBank.filter((w) => {
        const gap = used.get(normalizeAnswer(w));
        return gap === undefined || gap === n;
      })
      .map((w) => ({ value: w, label: w }));
  }
}
