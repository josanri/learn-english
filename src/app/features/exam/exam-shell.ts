import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ExamContext } from './exam-context';

/** Frame for `/:level/:board/:examId/*`: loads the exam JSON and shows the section navigation. */
@Component({
  selector: 'app-exam-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  providers: [ExamContext],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p>
        <a [routerLink]="['/', level()]">&larr; All {{ level().toUpperCase() }} exams</a>
      </p>
      @if (context.resource.isLoading()) {
        <p>Loading exam&hellip;</p>
      } @else if (context.resource.error()) {
        <p role="alert">This exam could not be loaded. It may not exist yet.</p>
      } @else if (context.exam(); as exam) {
        <h1>{{ exam.title }}</h1>
        <p>
          {{ exam.subtitle }} &middot; {{ exam.estimatedMinutes }} minutes &middot; {{ exam.board }}
        </p>
        <nav aria-label="Exam sections">
          <ul class="tabs">
            @for (section of exam.sections; track section.skill) {
              <li>
                <a [routerLink]="[section.skill]" routerLinkActive="active">{{ section.skill }}</a>
              </li>
            }
            <li>
              <a routerLink="results" routerLinkActive="active">results</a>
            </li>
          </ul>
        </nav>
        <router-outlet />
      }
    </div>
  `,
})
export class ExamShell {
  readonly level = input.required<string>();
  readonly board = input.required<string>();
  readonly examId = input.required<string>();

  protected readonly context = inject(ExamContext);

  constructor() {
    effect(() => {
      this.context.location.set({
        level: this.level(),
        board: this.board(),
        examId: this.examId(),
      });
    });
  }
}
