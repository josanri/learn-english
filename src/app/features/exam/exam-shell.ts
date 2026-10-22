import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Chip, EmptyState, Icon } from '../../shared/ui';
import { ExamSessionStore } from './session/exam-session.store';

/**
 * Frame for `/:level/:board/:examId/*`: loads the exam JSON into the session store (one store per
 * open exam), shows the title and the section navigation, and hosts the section pages.
 */
@Component({
  selector: 'app-exam-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Chip, EmptyState, Icon],
  providers: [ExamSessionStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.resource.isLoading()) {
      <div class="container page"><p role="status" class="muted">Loading exam&hellip;</p></div>
    } @else if (store.resource.error()) {
      <div class="container page">
        <app-empty-state
          heading="This exam could not be loaded"
          description="It may not exist yet, or you may be offline."
          icon="alert"
        >
          <a [routerLink]="['/', level()]">Back to all {{ level().toUpperCase() }} exams</a>
        </app-empty-state>
      </div>
    } @else if (store.exam(); as exam) {
      <div class="container head">
        <a class="back" [routerLink]="['/', level()]">
          <app-icon name="back" [size]="16" />
          All {{ level().toUpperCase() }} exams
        </a>
        <h1>{{ exam.title }}</h1>
        <p class="meta muted">
          {{ exam.subtitle }} &middot;
          <app-chip [command]="true" [prompt]="false">{{ exam.estimatedMinutes }} min</app-chip>
        </p>
        <nav aria-label="Exam sections">
          <ul class="tabs-row">
            @for (section of exam.sections; track section.skill) {
              <li>
                <a
                  [routerLink]="[section.skill]"
                  routerLinkActive="active"
                  ariaCurrentWhenActive="page"
                >
                  {{ section.skill }}
                  @if (store.progress()?.sectionStatus?.[section.skill] === 'completed') {
                    <app-icon name="check" [size]="16" />
                    <span class="visually-hidden">(submitted)</span>
                  }
                </a>
              </li>
            }
            <li>
              <a routerLink="results" routerLinkActive="active" ariaCurrentWhenActive="page"
                >Results</a
              >
            </li>
          </ul>
        </nav>
      </div>
      <router-outlet />
    }
  `,
  styles: `
    .head {
      padding-top: var(--space-4);
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target);
      font-weight: 700;
    }
    h1 {
      margin-bottom: var(--space-2);
      font-size: var(--step-3);
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }
    .tabs-row {
      display: flex;
      gap: var(--space-2);
      margin: 0;
      padding: 0 0 var(--space-2);
      list-style: none;
      flex-wrap: wrap;
    }
    .tabs-row li {
      flex: none;
    }
    .tabs-row a {
      display: inline-flex;
      white-space: nowrap;
      align-items: center;
      gap: var(--space-1);
      min-height: var(--target);
      padding: 0 var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      color: var(--text);
      font-weight: 700;
      text-decoration: none;
      text-transform: capitalize;
    }
    .tabs-row a:hover {
      background: var(--surface-2);
    }
    .tabs-row a.active {
      border-color: var(--border);
      background: var(--text);
      color: var(--bg);
    }
    /* Phones: the tabs wrap onto a second row and share the width, so none is cut off or hidden by a scroll. */
    @media (max-width: 30rem) {
      .tabs-row li {
        flex: 1 1 auto;
      }
      .tabs-row a {
        display: flex;
        justify-content: center;
        padding: 0 var(--space-3);
      }
    }
  `,
})
export class ExamShell {
  readonly level = input.required<string>();
  readonly board = input.required<string>();
  readonly examId = input.required<string>();

  protected readonly store = inject(ExamSessionStore);

  constructor() {
    effect(() => {
      this.store.location.set({
        level: this.level(),
        board: this.board(),
        examId: this.examId(),
      });
    });
  }
}
