import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChild,
  input,
  signal,
} from '@angular/core';
import { SegmentedControl } from '../../../shared/ui';
import { splitParagraphs } from '../engine/passage';

/**
 * Two columns with independent scrolling on desktop; on phones one column at a time with a
 * "Text / Questions" switch. Project `<div left>` and `<div right>`.
 */
@Component({
  selector: 'app-split',
  imports: [SegmentedControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="switch">
      <app-segmented-control
        label="Show"
        [hideLabel]="true"
        [options]="options()"
        [(value)]="tab"
      />
    </div>
    <div class="cols">
      <div
        class="col"
        role="group"
        tabindex="0"
        [attr.aria-label]="leftLabel()"
        [class.off]="tab() !== 'left'"
      >
        <ng-content select="[left]" />
      </div>
      <div
        class="col"
        role="group"
        tabindex="0"
        [attr.aria-label]="rightLabel()"
        [class.off]="tab() !== 'right'"
      >
        <ng-content select="[right]" />
      </div>
    </div>
  `,
  styles: `
    .switch {
      margin-bottom: var(--space-4);
    }
    .col {
      min-width: 0;
    }
    .col:focus-visible {
      outline-offset: 4px;
    }
    @media (max-width: 59.99rem) {
      .col.off {
        display: none;
      }
    }
    @media (min-width: 60rem) {
      .switch {
        display: none;
      }
      .cols {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: var(--space-6);
        align-items: start;
      }
      .col {
        max-height: calc(100dvh - var(--exam-chrome, 15rem));
        padding: 0 var(--space-3) var(--space-3) 0;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
    }
  `,
})
export class SplitLayout {
  readonly leftLabel = input('Text');
  readonly rightLabel = input('Questions');
  protected readonly tab = signal('left');
  protected readonly options = computed(() => [
    { value: 'left', label: this.leftLabel() },
    { value: 'right', label: this.rightLabel() },
  ]);
}

/**
 * A passage in paragraphs. Numbered markers `[n]` become the projected template (given the gap number)
 * or a plain number badge when no template is projected.
 */
@Component({
  selector: 'app-passage',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="passage">
      @for (paragraph of paragraphs(); track $index) {
        <p>
          @for (segment of paragraph; track $index) {
            @if (segment.type === 'gap') {
              @if (gapTemplate(); as template) {
                <ng-container
                  [ngTemplateOutlet]="template"
                  [ngTemplateOutletContext]="{ $implicit: segment.gap }"
                />
              } @else {
                <span class="marker"
                  ><span class="visually-hidden">Gap </span>{{ segment.gap }}</span
                >
              }
            } @else {
              <ng-container>{{ segment.text }}</ng-container>
            }
          }
        </p>
      }
    </div>
  `,
})
export class Passage {
  readonly text = input.required<string>();
  protected readonly gapTemplate = contentChild(TemplateRef);
  protected readonly paragraphs = computed(() => splitParagraphs(this.text()));
}
