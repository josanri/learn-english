import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ExamContext } from './exam-context';

/** Placeholder section view: lists the parts of one skill and shows their JSON. Real UI arrives in a later phase. */
@Component({
  selector: 'app-section-page',
  imports: [JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (section(); as section) {
      <h2>{{ section.skill }} &middot; {{ section.timeLimitMinutes }} minutes</h2>
      @for (part of section.parts; track part.id) {
        <details>
          <summary>
            Part {{ part.number }}: {{ part.title }} <small>({{ part.type }})</small>
          </summary>
          <p>{{ part.instructions }}</p>
          <pre>{{ part | json }}</pre>
        </details>
      }
    } @else {
      <p role="alert">This exam has no {{ skill() }} section.</p>
    }
  `,
})
export class SectionPage {
  /** Bound from the route data (`skill`). */
  readonly skill = input.required<string>();

  private readonly context = inject(ExamContext);
  protected readonly section = computed(() =>
    this.context.exam()?.sections.find((s) => s.skill === this.skill()),
  );
}
