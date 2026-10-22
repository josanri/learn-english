import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LocalStorageService } from '../../core/storage.service';
import { GrammarCatalogueService } from '../../data/grammar-catalogue.service';
import { verbsToReview } from './irregular-verbs/verb-engine';
import { Card, Chip, IllustratedCard, SkillArt } from '../../shared/ui';

/** `/grammar`: entry page with the irregular verbs and the guide to verb forms. */
@Component({
  selector: 'app-grammar-page',
  imports: [Card, Chip, IllustratedCard, SkillArt],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">Grammar &middot; B1</p>
      <h1>Grammar</h1>
      <p class="lede">
        Learn the verb forms that B1 exams ask for. Look things up, then practise until they feel
        natural.
      </p>

      @if (practised() > 0) {
        <app-card class="summary">
          <h2>Your irregular verbs</h2>
          <ul class="chips">
            <li>
              <app-chip [prompt]="false">{{ known() }} known</app-chip>
            </li>
            <li>
              <app-chip [prompt]="false">{{ toReview() }} to review</app-chip>
            </li>
            <li>
              <app-chip [prompt]="false">{{ practised() }} practised</app-chip>
            </li>
          </ul>
        </app-card>
      }

      <div class="grid">
        <app-illustrated-card
          heading="Irregular verbs"
          tone="blue"
          [rotate]="-1.5"
          link="/grammar/irregular-verbs"
        >
          <app-skill-art art kind="writing" />
          <p>A glossary of about 100 verbs, with exercises, gap sentences and flashcards.</p>
        </app-illustrated-card>
        <app-illustrated-card
          heading="Guide to verb forms"
          tone="cream"
          [rotate]="1.5"
          link="/grammar/verb-forms"
        >
          <app-skill-art art kind="reading" />
          <p>Tenses, passive, modals and conditionals, with tables, mistakes and quick checks.</p>
        </app-illustrated-card>
      </div>
    </div>
  `,
  styles: `
    .summary {
      margin-top: var(--space-5);
    }
    .summary h2 {
      margin-bottom: var(--space-3);
      font-size: var(--step-1);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
      gap: var(--space-6);
      margin-top: var(--space-7);
      padding-right: 6px;
    }
  `,
})
export class GrammarPage {
  private readonly store = inject(LocalStorageService);
  private readonly verbs = inject(GrammarCatalogueService).irregularVerbs();

  private readonly progress = computed(() => this.store.grammar().verbs);
  protected readonly known = computed(
    () => Object.values(this.progress()).filter((v) => v.known).length,
  );
  protected readonly practised = computed(
    () => Object.values(this.progress()).filter((v) => v.right + v.wrong > 0).length,
  );
  protected readonly toReview = computed(() =>
    this.verbs.hasValue() ? verbsToReview(this.verbs.value().verbs, this.progress()).length : 0,
  );
}
