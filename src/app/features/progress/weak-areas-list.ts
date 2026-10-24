import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { WeakArea, WeakAreas } from '../../core/stats';
import type { GrammarTag } from '../../models/exam';
import { GRAMMAR_TAGS, isGrammarTag } from '../../models/grammar-tags';
import { partTypeInfo } from '../../models/part-labels';
import { ProgressBar } from '../../shared/ui';

interface Row {
  id: string;
  label: string;
  detail: string;
  percent: number;
  /** Router link to the grammar guide, for tags that have one. */
  guide?: string;
}

const SKILL_NAME = { reading: 'Reading', listening: 'Listening' } as Record<string, string>;

/**
 * Lowest-scoring part types and grammar points. Each row shows the score; grammar points with a
 * guide link to it. Used by the progress summary (all exams) and the results page (one exam).
 */
@Component({
  selector: 'app-weak-areas-list',
  imports: [RouterLink, ProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="columns">
      @if (partRows().length) {
        <section [attr.aria-labelledby]="headingId() + '-parts'">
          <h3 [id]="headingId() + '-parts'">Exam parts</h3>
          <ul>
            @for (row of partRows(); track row.id) {
              <li>
                <div class="line">
                  <span
                    >{{ row.label }} <span class="muted">· {{ row.detail }}</span></span
                  >
                  <span class="mono">{{ row.percent }}%</span>
                </div>
                <app-progress-bar [value]="row.percent / 100" [label]="row.label + ' score'" />
              </li>
            }
          </ul>
        </section>
      }
      @if (tagRows().length) {
        <section [attr.aria-labelledby]="headingId() + '-tags'">
          <h3 [id]="headingId() + '-tags'">Grammar and words (gap-fill texts)</h3>
          <ul>
            @for (row of tagRows(); track row.id) {
              <li>
                <div class="line">
                  @if (row.guide) {
                    <a [routerLink]="['/grammar', row.guide]">{{ row.label }}</a>
                  } @else {
                    <span>{{ row.label }}</span>
                  }
                  <span class="mono">{{ row.percent }}%</span>
                </div>
                <app-progress-bar [value]="row.percent / 100" [label]="row.label + ' score'" />
                <span class="muted small">{{ row.detail }}</span>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: `
    .columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
      gap: var(--space-4) var(--space-6);
    }
    h3 {
      margin: 0 0 var(--space-2);
      font-size: var(--step-0);
    }
    ul {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-1);
    }
    .line a {
      display: inline-flex;
      align-items: center;
      min-height: var(--target);
      color: var(--accent-text);
      font-weight: 700;
    }
    .mono {
      font-weight: 700;
    }
    .small {
      font-size: var(--step--1);
    }
  `,
})
export class WeakAreasList {
  readonly areas = input.required<WeakAreas>();
  /** Rows per list. */
  readonly limit = input(3);
  /** Prefix for the heading ids (two lists on one page need different ids). */
  readonly headingId = input('weak');

  protected readonly partRows = computed(() =>
    this.areas()
      .parts.slice(0, this.limit())
      .map((area): Row => {
        const info = partTypeInfo(area.id);
        return {
          id: area.id,
          label: info?.label ?? area.id,
          detail: `${info ? SKILL_NAME[info.skill] : 'Exam'}, ${this.count(area)}`,
          percent: area.percent,
        };
      }),
  );

  protected readonly tagRows = computed(() =>
    this.areas()
      .tags.filter((area) => isGrammarTag(area.id))
      .slice(0, this.limit())
      .map((area): Row => {
        const info = GRAMMAR_TAGS[area.id as GrammarTag];
        return {
          id: area.id,
          label: info.label,
          detail: info.guide
            ? `${this.count(area)}. Open the guide to revise it.`
            : `${this.count(area)}.`,
          percent: area.percent,
          guide: info.guide,
        };
      }),
  );

  private count(area: WeakArea): string {
    return `${area.correct} of ${area.total} right`;
  }
}
