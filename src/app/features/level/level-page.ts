import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExamCatalogueService } from '../../data/exam-catalogue.service';
import type { ExamSummary } from '../../models/exam';

/** `/b1`: exams grouped by board/format. */
@Component({
  selector: 'app-level-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ level().toUpperCase() }} practice exams</h1>
    @if (index.isLoading()) {
      <p>Loading exams&hellip;</p>
    } @else if (index.error()) {
      <p role="alert">The exam list could not be loaded.</p>
    } @else {
      @for (group of groups(); track group.id) {
        <section>
          <h2>{{ group.name }}</h2>
          <p>{{ group.description }}</p>
          <ul class="exam-list">
            @for (exam of group.exams; track exam.id) {
              <li>
                <a [routerLink]="['/', level(), exam.board, exam.id, 'reading']">{{
                  exam.title
                }}</a>
                &mdash; {{ exam.subtitle }} ({{ exam.estimatedMinutes }} min)
              </li>
            }
          </ul>
        </section>
      }
    }
  `,
})
export class LevelPage {
  /** Bound from the route data (`level`), for example `b1`. */
  readonly level = input.required<string>();

  protected readonly index = inject(ExamCatalogueService).levelIndex(this.level);

  protected readonly groups = computed(() => {
    const data = this.index.hasValue() ? this.index.value() : undefined;
    if (!data) return [];
    return data.boards.map((board) => ({
      ...board,
      exams: data.exams.filter((e): e is ExamSummary => e.board === board.id),
    }));
  });
}
