import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { CollaborativeTaskPart } from '../../../models/exam';
import { LETTERS } from '../engine/scoring';
import { decisionId } from '../parts/speaking-prompts';
import { SpeakingImage } from './speaking-image';
import { SpeakingResponse } from './speaking-response';

/**
 * Part 3: a grid of options. The exam is a conversation with a partner; here you practise alone, so
 * you talk about each option and then say which one you choose and why.
 */
@Component({
  selector: 'app-collaborative-part',
  imports: [SpeakingImage, SpeakingResponse],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (part().prompt) {
      <p class="task"><strong>Your task:</strong> {{ part().prompt }}</p>
    }
    <p class="muted">
      In the real exam you talk with another candidate. Practising alone, talk about each option
      first, then make your choice.
    </p>
    <ul class="grid" aria-label="Options">
      @for (image of part().images; track image.id; let i = $index) {
        <li>
          <span class="letter mono" aria-hidden="true">{{ letter(i) }}</span>
          <app-speaking-image [visual]="image" />
        </li>
      }
    </ul>
    <h3 class="step">1. Talk about each option</h3>
    @for (image of part().images; track image.id; let i = $index) {
      <app-speaking-response
        [itemId]="image.id"
        [heading]="'Option ' + letter(i) + ': ' + image.title"
        hint="Say what it is, who it suits and one good and one bad point. About 20 seconds."
        [partType]="part().type"
        [targetSeconds]="30"
      />
    }
    <h3 class="step">2. Make your choice</h3>
    <app-speaking-response
      [itemId]="decision()"
      heading="Your decision"
      hint="Say which option you would choose and give at least two reasons."
      [partType]="part().type"
      [targetSeconds]="60"
    />
  `,
  styles: `
    .task {
      padding: var(--space-3) var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-left-width: 6px;
      border-radius: var(--radius-sm);
      background: var(--surface);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
      gap: var(--space-4);
      margin: var(--space-4) 0;
      padding: 0;
      list-style: none;
    }
    .grid li {
      position: relative;
    }
    .letter {
      position: absolute;
      top: var(--space-2);
      left: var(--space-2);
      z-index: 1;
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: var(--bw) solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg);
      font-weight: 800;
    }
    .step {
      margin-top: var(--space-5);
      font-size: var(--step-1);
    }
  `,
})
export class CollaborativePart {
  readonly part = input.required<CollaborativeTaskPart>();
  protected readonly decision = computed(() => decisionId(this.part().id));
  protected letter(i: number): string {
    return LETTERS[i] ?? String(i + 1);
  }
}
