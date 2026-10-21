import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, EmptyState } from '../../shared/ui';
import { ExamSessionStore } from './session/exam-session.store';

/**
 * Writing, Speaking and Mediation have their own phases. Until then the section is reachable from
 * the exam navigation and shows what it contains, without any task UI.
 */
@Component({
  selector: 'app-placeholder-section-page',
  imports: [RouterLink, Button, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      @if (section(); as section) {
        <p class="eyebrow">{{ skill() }} &middot; {{ section.timeLimitMinutes }} minutes</p>
        <app-empty-state
          [heading]="title()"
          description="This part of the exam is not available to practise yet. Reading and Listening are ready to use."
          icon="info"
        >
          <a appButton variant="primary" routerLink="../reading">Go to Reading</a>
        </app-empty-state>
        <h2 class="parts-title">What this section contains</h2>
        <ol>
          @for (part of section.parts; track part.id) {
            <li>
              <strong>{{ part.title }}</strong
              >. {{ part.instructions }}
            </li>
          }
        </ol>
      } @else {
        <p role="alert">This exam has no {{ skill() }} section.</p>
      }
    </div>
  `,
  styles: `
    .parts-title {
      margin-top: var(--space-6);
      font-size: var(--step-2);
    }
    li {
      margin-bottom: var(--space-2);
    }
  `,
})
export class PlaceholderSectionPage {
  readonly skill = input.required<string>();
  private readonly store = inject(ExamSessionStore);
  protected readonly section = computed(() =>
    this.store.exam()?.sections.find((s) => s.skill === this.skill()),
  );
  protected readonly title = computed(
    () => `${this.skill().charAt(0).toUpperCase()}${this.skill().slice(1)} is coming soon`,
  );
}
