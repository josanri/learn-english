import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { GappedTextPart as GappedText } from '../../../models/exam';
import { LETTERS } from '../engine/scoring';
import { ExamSessionStore } from '../session/exam-session.store';
import { AnswerSelect, FlagStrip } from '../ui/item-controls';
import { Passage, SplitLayout } from '../ui/layout';

/**
 * Reading: lettered sentences go into numbered gaps. Each gap is a drop-down that only offers the
 * sentences not used elsewhere; the sentence list shows which ones are taken.
 */
@Component({
  selector: 'app-gapped-text-part',
  imports: [SplitLayout, Passage, AnswerSelect, FlagStrip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-split leftLabel="Text" rightLabel="Sentences">
      <div left>
        @if (orderingLead(); as lead) {
          <div class="order-list">
            <div class="text-card order-fixed">
              <span class="tag">1</span>
              <span>{{ lead }}</span>
            </div>
            @for (slot of orderSlots(); track slot.id) {
              <div class="order-slot">
                <span class="order-num">{{ slot.position }}</span>
                <app-answer-select
                  [itemId]="slot.id"
                  [label]="'Sentence ' + slot.position"
                  [options]="optionsFor(slot.n)"
                  placeholder="Choose"
                />
                @if (selectedText(slot.id); as chosen) {
                  <span class="order-preview">{{ chosen }}</span>
                } @else {
                  <span class="order-placeholder muted">Choose sentence {{ slot.position }}</span>
                }
              </div>
            }
          </div>
        } @else {
          <app-passage [text]="part().passage">
            <ng-template let-n>
              <app-answer-select
                [itemId]="gapId(n)"
                [label]="'Gap ' + n"
                [options]="optionsFor(n)"
                placeholder="Gap"
              />
            </ng-template>
          </app-passage>
        }
        <app-flag-strip [entries]="flagEntries()" />
      </div>
      <div right>
        <p class="hint">
          Each sentence is used once.
          @if (extraHint()) {
            {{ ' ' + extraHint() }}
          }
        </p>
        <ol class="sentences" aria-label="Sentences">
          @for (s of sentences(); track s.letter) {
            <li class="text-card">
              <span class="tag">{{ s.letter }}</span
              >{{ s.text }}
              @if (usedIn().get(s.letter); as gap) {
                <em class="muted">
                  ({{ orderingLead() ? 'position ' + (gap + 1) : 'used in gap ' + gap }})</em
                >
              }
            </li>
          }
        </ol>
      </div>
    </app-split>
  `,
  styles: `
    .sentences {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .order-list {
      display: grid;
      gap: var(--space-3);
    }
    .order-fixed {
      display: flex;
      align-items: baseline;
      gap: var(--space-2);
      margin: 0;
    }
    .order-slot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .order-num {
      display: inline-grid;
      place-items: center;
      min-width: 1.75rem;
      height: 1.75rem;
      border-radius: var(--radius-sm);
      background: var(--surface-alt);
      font-weight: 700;
      font-size: var(--step--1);
    }
    .order-preview {
      flex: 1 1 12rem;
    }
    .order-placeholder {
      flex: 1 1 12rem;
      font-size: var(--step--1);
    }
  `,
})
export class GappedTextPart {
  readonly part = input.required<GappedText>();
  private readonly store = inject(ExamSessionStore);

  protected readonly extraHint = computed(() => {
    const extra = this.part().sentences.length - this.part().gaps.length;
    if (extra <= 0) return '';
    return extra === 1 ? 'One sentence is extra.' : `${extra} sentences are extra.`;
  });
  /** Non-empty lead sentence when the passage is a sentence-ordering task (`Lead. [1] [2] ...`). */
  protected readonly orderingLead = computed(() => {
    const match = this.part().passage.match(/^([\s\S]+?)\s+(?:\[\d+\]\s*){2,}$/);
    if (!match) return null;
    const lead = match[1].trim();
    return /\[\d+\]/.test(lead) ? null : lead;
  });
  protected readonly orderSlots = computed(() =>
    this.part().gaps.map((g, i) => ({ id: g.id, n: i + 1, position: i + 2 })),
  );
  protected readonly sentences = computed(() =>
    this.part().sentences.map((text, i) => ({ letter: LETTERS[i], text })),
  );
  protected readonly flagEntries = computed(() =>
    this.part().gaps.map((g, i) => ({
      id: g.id,
      label: this.orderingLead() ? `Sentence ${i + 2}` : `Gap ${i + 1}`,
    })),
  );
  /** Letter -> number of the gap that uses it. */
  protected readonly usedIn = computed(() => {
    const map = new Map<string, number>();
    this.part().gaps.forEach((gap, i) => {
      const value = String(this.store.answer(gap.id) ?? '').toUpperCase();
      if (value) map.set(value, i + 1);
    });
    return map;
  });

  protected gapId(n: number): string {
    return this.part().gaps[n - 1]?.id ?? `${this.part().id}-gap-${n}`;
  }

  protected selectedText(gapId: string): string {
    const letter = String(this.store.answer(gapId) ?? '').toUpperCase();
    return this.sentences().find((s) => s.letter === letter)?.text ?? '';
  }

  protected optionsFor(n: number): { value: string; label: string }[] {
    const used = this.usedIn();
    return this.sentences()
      .filter((s) => !used.has(s.letter) || used.get(s.letter) === n)
      .map((s) => ({ value: s.letter, label: s.letter }));
  }
}
