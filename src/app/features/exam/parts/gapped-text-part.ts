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
        <app-flag-strip [entries]="flagEntries()" />
      </div>
      <div right>
        <p class="hint">Each sentence is used once. One sentence is extra.</p>
        <ol class="sentences" aria-label="Sentences">
          @for (s of sentences(); track s.letter) {
            <li class="text-card">
              <span class="tag">{{ s.letter }}</span
              >{{ s.text }}
              @if (usedIn().get(s.letter); as gap) {
                <em class="muted"> (used in gap {{ gap }})</em>
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
  `,
})
export class GappedTextPart {
  readonly part = input.required<GappedText>();
  private readonly store = inject(ExamSessionStore);

  protected readonly sentences = computed(() =>
    this.part().sentences.map((text, i) => ({ letter: LETTERS[i], text })),
  );
  protected readonly flagEntries = computed(() =>
    this.part().gaps.map((g, i) => ({ id: g.id, label: `Gap ${i + 1}` })),
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

  protected optionsFor(n: number): { value: string; label: string }[] {
    const used = this.usedIn();
    return this.sentences()
      .filter((s) => !used.has(s.letter) || used.get(s.letter) === n)
      .map((s) => ({ value: s.letter, label: s.letter }));
  }
}
