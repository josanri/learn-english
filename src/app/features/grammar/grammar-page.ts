import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalStorageService } from '../../core/storage.service';
import { GrammarCatalogueService } from '../../data/grammar-catalogue.service';
import { verbsToReview } from './irregular-verbs/verb-engine';
import { Button, Card, Chip, EmptyState, IllustratedCard, SkillArt } from '../../shared/ui';

/** `/grammar`: entry page with the irregular verbs, the vocabulary list and the grammar guides in teaching order. */
@Component({
  selector: 'app-grammar-page',
  imports: [RouterLink, Button, Card, Chip, EmptyState, IllustratedCard, SkillArt],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <p class="eyebrow">Grammar &middot; B1</p>
      <h1>Grammar</h1>
      <p class="lede">
        Grammar for B1 and B2, in a good order to study it. Read a guide, check yourself, then
        practise the verbs.
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
          <app-skill-art art kind="verbs" />
          <p>A glossary of about 100 verbs, with exercises, gap sentences and flashcards.</p>
        </app-illustrated-card>
        <app-illustrated-card
          heading="Vocabulary"
          tone="cream"
          [rotate]="1.5"
          link="/vocabulary/b1"
        >
          <app-skill-art art kind="vocabulary" />
          <p>
            The Cambridge B1 word list, with topics, filters and a dictionary link for each word.
          </p>
        </app-illustrated-card>
        <app-illustrated-card
          heading="Phrasal verbs"
          tone="green"
          [rotate]="-1"
          link="/vocabulary/phrasal-verbs"
        >
          <app-skill-art art kind="verbs" />
          <p>About 180 common phrasal verbs, with meanings, examples and three exercises.</p>
        </app-illustrated-card>
      </div>

      @if (index.isLoading()) {
        <p role="status" class="muted">Loading the guides&hellip;</p>
      } @else if (index.error()) {
        <app-empty-state
          heading="The guides could not be loaded"
          description="Check your connection and try again."
          icon="alert"
        >
          <button appButton type="button" (click)="index.reload()">Try again</button>
        </app-empty-state>
      } @else {
        @for (group of groups(); track group.level) {
          <section class="guides" [attr.aria-labelledby]="'guides-' + group.level">
            <h2 class="section-title" [id]="'guides-' + group.level">{{ group.title }}</h2>
            <ul class="guide-list">
              @for (guide of group.guides; track guide.id) {
                <li>
                  <a [routerLink]="['/grammar', guide.id]">
                    <span class="name">{{ guide.title }}</span>
                    <span class="muted">{{ guide.summary }}</span>
                  </a>
                </li>
              }
            </ul>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .guides {
      margin-top: var(--space-8);
    }
    .guides .section-title {
      font-size: var(--step-3);
    }
    .guide-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
      gap: var(--space-4);
      margin: var(--space-4) 0 0;
      padding: 0;
      list-style: none;
    }
    .guide-list a {
      display: grid;
      gap: var(--space-1);
      height: 100%;
      padding: var(--space-4);
      border: var(--bw) solid var(--border-muted);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      text-decoration: none;
    }
    .guide-list a:hover {
      background: var(--surface-2);
    }
    .name {
      font-size: var(--step-1);
      font-weight: 700;
    }
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
  private readonly catalogue = inject(GrammarCatalogueService);
  private readonly verbs = this.catalogue.irregularVerbs();
  protected readonly index = this.catalogue.guideIndex();

  /** B1 guides first, then the guides that reach B2; the order inside a group is the teaching order. */
  protected readonly groups = computed(() => {
    const guides = this.index.hasValue() ? this.index.value().guides : [];
    return [
      { level: 'b1', title: 'B1 guides', guides: guides.filter((g) => g.level === 'B1') },
      { level: 'b2', title: 'B1 to B2 guides', guides: guides.filter((g) => g.level === 'B2') },
    ].filter((group) => group.guides.length > 0);
  });

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
