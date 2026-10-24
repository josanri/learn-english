import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FoldPosture } from '../../../core/fold-posture.service';
import { LocalStorageService } from '../../../core/storage.service';
import { GrammarCatalogueService } from '../../../data/grammar-catalogue.service';
import { Button, Chip, EmptyState, SegmentedControl, type SegmentOption } from '../../../shared/ui';
import { VerbGlossary } from './verb-glossary';
import { VerbPractice } from './verb-practice';

const VIEWS: SegmentOption[] = [
  { value: 'glossary', label: 'Glossary' },
  { value: 'practice', label: 'Practice' },
];

/**
 * `/grammar/irregular-verbs`: the glossary and the practice exercises. On a split screen held like
 * a book both show at once, the practice on the right screen (.fold-side), with no switch.
 */
@Component({
  selector: 'app-irregular-verbs-page',
  imports: [RouterLink, Button, Chip, EmptyState, SegmentedControl, VerbGlossary, VerbPractice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow"><a routerLink="/grammar">Grammar</a> &middot; Irregular verbs</p>
      <h1>Irregular verbs</h1>
      <p class="lede">
        Look up the forms of the most common irregular verbs, then practise them. Your results are
        saved on this device.
      </p>
      <ul class="stats" aria-label="Your progress">
        <li>
          <app-chip [prompt]="false">{{ knownCount() }} known</app-chip>
        </li>
        <li>
          <app-chip [prompt]="false">{{ practisedCount() }} practised</app-chip>
        </li>
        <li>
          <app-chip [prompt]="false">{{ total() }} verbs</app-chip>
        </li>
      </ul>

      @if (!book()) {
        <div class="view">
          <app-segmented-control label="Section" [options]="views" [(value)]="view" />
        </div>
      }

      @if (resource.isLoading()) {
        <p role="status" class="muted">Loading verbs&hellip;</p>
      } @else if (resource.error()) {
        <app-empty-state
          heading="The verbs could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="resource.reload()">Try again</button>
        </app-empty-state>
      } @else if (book()) {
        <app-verb-glossary [verbs]="verbs()" />
        <div class="fold-side">
          <app-verb-practice [verbs]="verbs()" />
        </div>
      } @else {
        @if (view() === 'glossary') {
          <app-verb-glossary [verbs]="verbs()" />
        } @else {
          <app-verb-practice [verbs]="verbs()" />
        }
      }

      <p class="more">
        <a appButton variant="secondary" routerLink="/grammar/verb-forms">
          Read the guide to verb forms
        </a>
      </p>
    </div>
  `,
  styles: `
    .eyebrow a {
      color: inherit;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: var(--space-4) 0 0;
      padding: 0;
      list-style: none;
    }
    .view {
      margin-block: var(--space-5);
    }
    /* Split screen held like a book: no section switch, so the stats keep its space below them. */
    :host-context(html[data-fold='book']) .stats {
      margin-bottom: var(--space-5);
    }
    .more {
      margin-top: var(--space-7);
    }
  `,
})
export class IrregularVerbsPage {
  protected readonly resource = inject(GrammarCatalogueService).irregularVerbs();
  private readonly store = inject(LocalStorageService);

  protected readonly views = VIEWS;
  protected readonly view = signal('glossary');
  private readonly fold = inject(FoldPosture);
  protected readonly book = computed(() => this.fold.layout() === 'book');
  protected readonly verbs = computed(() =>
    this.resource.hasValue() ? this.resource.value().verbs : [],
  );
  protected readonly total = computed(() => this.verbs().length);
  protected readonly knownCount = computed(
    () => Object.values(this.store.grammar().verbs).filter((v) => v.known).length,
  );
  protected readonly practisedCount = computed(
    () => Object.values(this.store.grammar().verbs).filter((v) => v.right + v.wrong > 0).length,
  );
}
