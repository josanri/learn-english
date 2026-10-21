import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LocalStorageService } from '../../core/storage.service';
import { ExamContext } from './exam-context';

/** Placeholder results view: shows the saved score for this exam, if any. */
@Component({
  selector: 'app-results-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Results</h2>
    @if (objective(); as result) {
      <p>
        {{ result.correct }} / {{ result.total }} correct in the reading and listening questions
        (saved {{ result.completedAt }}).
      </p>
    } @else {
      <p>No saved results for this exam yet.</p>
    }
  `,
})
export class ResultsPage {
  private readonly context = inject(ExamContext);
  private readonly store = inject(LocalStorageService);

  protected readonly objective = computed(() => {
    const id = this.context.exam()?.id;
    return id ? this.store.progress()[id]?.results['objective'] : undefined;
  });
}
